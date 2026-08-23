'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authReady && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authReady, isAuthenticated, router]);

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4 p-8">
          <Skeleton className="h-12 w-12 rounded-2xl mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Skeleton className="h-12 w-12 rounded-2xl" />
      </div>
    );
  }

  return <>{children}</>;
}
