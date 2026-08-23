'use client';

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from 'react';
import { useAuth } from './auth-context';
import {
    getParameterGroups,
    getParameterItems,
    saveParameterGroup,
    saveParameterItem,
    updateParameterItem,
    deleteParameterItem,
    ParameterGroupApi,
    ParameterItemApi,
    UpdateParameterItemPayload,
} from '@/services/api';

type ParameterGroup = ParameterGroupApi;
type ParameterItem = ParameterItemApi;

interface ParametersContextType {
    groups: ParameterGroup[];
    isLoading: boolean;
    loading: boolean;
    error: string | null;
    getItems: (code: string) => ParameterItem[];
    getItem: (code: string, itemCode: string) => ParameterItem | undefined;
    getItemName: (code: string, itemCode: string) => string;
    getGroup: (code: string) => ParameterGroup | undefined;
    refresh: () => Promise<void>;
    createGroup: (group: Partial<ParameterGroup>) => Promise<ParameterGroup>;
    createItem: (groupCode: string, item: Partial<ParameterItem>) => Promise<ParameterItem>;
    updateItem: (groupCode: string, itemId: string, item: Partial<ParameterItem>) => Promise<ParameterItem>;
    removeItem: (groupCode: string, itemId: string) => Promise<void>;
}

const ParametersContext = createContext<ParametersContextType | undefined>(undefined);

import { parameterGroups } from '@/mock/parameters';

const CACHE_KEY = 'archiveo_param_groups_cache';

export function ParametersProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated, authReady } = useAuth();
    const [groups, setGroups] = useState<ParameterGroup[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = sessionStorage.getItem(CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                }
            } catch {}
        }
        return parameterGroups as unknown as ParameterGroup[];
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setError(null);
        try {
            const data = await getParameterGroups();
            if (Array.isArray(data) && data.length > 0) {
                // S'assurer que SENDER est présent si absent de la DB existante
                const hasSender = data.some((g: ParameterGroup) => g.code === 'SENDER');
                const finalData = hasSender
                    ? data
                    : [...data, parameterGroups.find((g) => g.code === 'SENDER') as unknown as ParameterGroup].filter(Boolean);
                
                setGroups(finalData);
                if (typeof window !== 'undefined') {
                    try {
                        sessionStorage.setItem(CACHE_KEY, JSON.stringify(finalData));
                    } catch {}
                }
            } else {
                setGroups(parameterGroups as unknown as ParameterGroup[]);
            }
        } catch (err) {
            console.error('Erreur chargement parametres, utilisation des donnees locales:', err);
            setGroups(parameterGroups as unknown as ParameterGroup[]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authReady) {
            refresh();
        }
    }, [refresh, authReady]);

    const getItems = useCallback(
        (code: string): ParameterItem[] => {
            const group = groups.find((g: ParameterGroup) => g.code === code);
            return group?.items ?? [];
        },
        [groups]
    );

    const getItem = useCallback(
        (code: string, itemCode: string): ParameterItem | undefined => {
            const items = getItems(code);
            return items.find((i: ParameterItem) => i.code === itemCode);
        },
        [getItems]
    );

    const getItemName = useCallback(
        (code: string, itemCode: string): string => {
            const item = getItem(code, itemCode);
            return item?.name ?? itemCode;
        },
        [getItem]
    );

    const getGroup = useCallback(
        (code: string): ParameterGroup | undefined => {
            return groups.find((g: ParameterGroup) => g.code === code);
        },
        [groups]
    );

    const createGroup = useCallback(
        async (group: Partial<ParameterGroup>): Promise<ParameterGroup> => {
            const newGroup = await saveParameterGroup(group);
            await refresh();
            return newGroup;
        },
        [refresh]
    );

    const createItem = useCallback(
        async (groupCode: string, item: Partial<ParameterItem>): Promise<ParameterItem> => {
            const newItem = await saveParameterItem(groupCode, item);
            setGroups((prev) =>
                prev.map((g: ParameterGroup) =>
                    g.code === groupCode ? { ...g, items: [...g.items, newItem] } : g
                )
            );
            return newItem;
        },
        []
    );

    const updateItem = useCallback(
        async (groupCode: string, itemId: string, item: Partial<ParameterItem>): Promise<ParameterItem> => {
            // Construire un payload valide avec des valeurs par defaut
            const payload: UpdateParameterItemPayload = {
                code: item.code ?? '',
                name: item.name ?? '',
                description: item.description,
                color: item.color,
                icon: item.icon,
                order: item.order ?? 0,
                parentId: item.parentId,
            };

            const updatedItem = await updateParameterItem(groupCode, itemId, payload);

            // Mise a jour immediate du state local
            setGroups((prev) =>
                prev.map((g: ParameterGroup) =>
                    g.code === groupCode
                        ? { ...g, items: g.items.map((i: ParameterItem) => (i.id === itemId ? updatedItem : i)) }
                        : g
                )
            );
            return updatedItem;
        },
        []
    );

    const removeItem = useCallback(
        async (groupCode: string, itemId: string): Promise<void> => {
            await deleteParameterItem(groupCode, itemId);
            setGroups((prev) =>
                prev.map((g: ParameterGroup) =>
                    g.code === groupCode
                        ? { ...g, items: g.items.filter((i: ParameterItem) => i.id !== itemId) }
                        : g
                )
            );
        },
        []
    );

    const value: ParametersContextType = {
        groups,
        isLoading,
        loading: isLoading,
        error,
        getItems,
        getItem,
        getItemName,
        getGroup,
        refresh,
        createGroup,
        createItem,
        updateItem,
        removeItem,
    };

    return (
        <ParametersContext.Provider value={value}>{children}</ParametersContext.Provider>
    );
}

export function useParameters() {
    const context = useContext(ParametersContext);
    if (context === undefined) {
        throw new Error('useParameters doit etre utilise dans un ParametersProvider');
    }
    return context;
}