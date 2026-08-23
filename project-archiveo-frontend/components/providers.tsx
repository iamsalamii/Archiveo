'use client';

import { ThemeProvider } from '@/contexts/theme-context';
import { AuthProvider } from '@/contexts/auth-context';
import { ParametersProvider } from '@/contexts/parameters-context';
import { I18nProvider } from '@/contexts/i18n-context';
import { Toaster as HotToaster } from 'react-hot-toast';
import { Toaster as SonnerToaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        {/* ✅ BON ORDRE : AuthProvider AVANT ParametersProvider */}
        <AuthProvider>
          <ParametersProvider>
            {children}
            <HotToaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  zIndex: 99999,
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#ffffff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#ffffff',
                  },
                },
              }}
            />
            <SonnerToaster richColors position="top-right" closeButton duration={4000} />
          </ParametersProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}