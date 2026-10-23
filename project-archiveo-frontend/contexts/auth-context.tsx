'use client';

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient, tokenService, isApiError } from '@/services/api-client';
import { sessionSync } from '@/services/session-sync';

// Types
export interface UserAccount {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    matricule?: string;
    function?: string;
    phone?: string;
    directionId?: string;
    active?: boolean;
    twoFactorEnabled?: boolean;
    serviceId?: string;
    profileId?: string;
    roleId?: string;
    permissions?: string[];
    mustChangePassword: boolean;
    roles?: string[];
}

interface LoginResponse {
    token: string;
    user: UserAccount;
}

export interface LoginResult {
    success: boolean;
    status?: number;
    message?: string;
    retryAfter?: number | null;
}

interface AuthContextType {
    user: UserAccount | null;
    isAuthenticated: boolean;
    authReady: boolean;
    mustChangePassword: boolean;
    allUsers: UserAccount[];
    login: (email: string, password: string) => Promise<LoginResult>;
    logout: () => void;
    changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
    createUser: (user: Partial<UserAccount>) => Promise<boolean>;
    updateUser: (user: UserAccount) => Promise<boolean>;
    deleteUser: (id: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserAccount | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
    const router = useRouter();
    const pathname = usePathname();

    // Charger l'utilisateur au démarrage si token présent
    useEffect(() => {
        const loadUser = async () => {
            const token = tokenService.get();
            if (!token) {
                setAuthReady(true);
                return;
            }

            try {
                const [userData, permissions] = await Promise.all([
                    apiClient.get<UserAccount>('/api/auth/me'),
                    apiClient.get<string[]>('/api/auth/permissions'),
                ]);
                setUser({ ...userData, permissions });
            } catch (error) {
                console.error('Erreur chargement utilisateur:', error);
                tokenService.remove();
            } finally {
                setAuthReady(true);
            }
        };

        loadUser();
    }, []);

    // Redirection automatique si mustChangePassword
    useEffect(() => {
        if (!authReady || !user) return;

        // Pages accessibles même si mustChangePassword = true
        const allowedPaths = ['/change-password', '/login', '/logout'];

        if (user.mustChangePassword && !allowedPaths.includes(pathname)) {
            router.push('/change-password');
        }
    }, [authReady, user, pathname, router]);

    // Synchronisation de session inter-onglets (ANO-06)
    useEffect(() => {
        const unsubscribe = sessionSync.onSessionEvent((action) => {
            if (action.type === 'LOGOUT') {
                // 1. Purger le token et le cache sans ré-émettre de broadcast (évite les boucles d'événements)
                tokenService.remove(false);
                setUser(null);
                if (typeof window !== 'undefined') {
                    try {
                        sessionStorage.removeItem('archiveo_param_groups_cache');
                    } catch {}
                }

                // 2. Rediriger immédiatement vers /login si l'onglet est sur une page protégée
                const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '';
                if (!isPublicPage) {
                    router.replace('/login');
                }
            } else if (action.type === 'LOGIN') {
                // Si un autre onglet s'est connecté avec un compte différent, réinitialiser pour éviter la contamination
                if (user && user.id !== action.userId) {
                    tokenService.remove(false);
                    setUser(null);
                    router.replace('/login');
                }
            }
        });

        return unsubscribe;
    }, [pathname, router, user]);

    // Connexion
    const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
        try {
            const response = await apiClient.post<LoginResponse>('/api/auth/login', {
                email,
                password,
            });

            tokenService.set(response.token);
            const permissions = await apiClient.get<string[]>('/api/auth/permissions');
            setUser({ ...response.user, permissions });
            sessionSync.broadcastLogin(response.user.id);
            return { success: true };
        } catch (error: any) {
            console.error('Erreur de connexion:', error?.message || 'Erreur');
            if (isApiError(error)) {
                return {
                    success: false,
                    status: error.status,
                    message: error.message,
                    retryAfter: error.retryAfter ?? null,
                };
            }
            return {
                success: false,
                status: undefined,
                message: error?.message || 'Une erreur est survenue lors de la connexion',
            };
        }
    }, []);

    // Déconnexion
    const logout = useCallback(() => {
        tokenService.remove(true); // Purge et diffuse l'invalidation à tous les autres onglets
        setUser(null);
        if (typeof window !== 'undefined') {
            try {
                sessionStorage.removeItem('archiveo_param_groups_cache');
            } catch {}
        }
        router.push('/login');
    }, [router]);

    // Changement de mot de passe
    const changePassword = useCallback(
        async (currentPassword: string, newPassword: string) => {
            try {
                await apiClient.post('/api/auth/change-password', {
                    currentPassword,
                    newPassword,
                });

                // Mettre à jour le flag mustChangePassword
                if (user) {
                    setUser({ ...user, mustChangePassword: false });
                }
                return true;
            } catch (error) {
                console.error('Erreur changement mot de passe:', error);
                return false;
            }
        },
        [user]
    );

    // CRUD Utilisateurs connectés au backend
    const createUser = useCallback(async (userData: Partial<UserAccount>) => {
        try {
            await apiClient.post('/api/users', {
                userName: userData.matricule || userData.email?.split('@')[0] || 'user',
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                function: userData.function,
                matricule: userData.matricule,
                serviceId: userData.serviceId,
                roles: userData.roles || ['USER'],
            });
            return true;
        } catch (error) {
            console.error('Erreur création utilisateur:', error);
            return false;
        }
    }, []);

    const updateUser = useCallback(async (userData: UserAccount) => {
        try {
            await apiClient.put(`/api/users/${userData.id}`, {
                userName: userData.matricule || userData.email.split('@')[0],
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                function: userData.function,
                matricule: userData.matricule,
                serviceId: userData.serviceId,
            });
            setUser((prev) => (prev && prev.id === userData.id ? { ...prev, ...userData } : prev));
            return true;
        } catch (error) {
            console.error('Erreur mise à jour utilisateur:', error);
            return false;
        }
    }, []);

    const deleteUser = useCallback(async (id: string) => {
        try {
            await apiClient.delete(`/api/users/${id}`);
            return true;
        } catch (error) {
            console.error('Erreur suppression utilisateur:', error);
            return false;
        }
    }, []);

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        authReady,
        mustChangePassword: user?.mustChangePassword ?? false,
        allUsers,
        login,
        logout,
        changePassword,
        createUser,
        updateUser,
        deleteUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth doit être utilisé dans un AuthProvider');
    }
    return context;
}