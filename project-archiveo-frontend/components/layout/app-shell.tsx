'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { FirstLoginDialog } from '@/components/shared/first-login-dialog';
import { AuthGuard } from '@/components/shared/auth-guard';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar collapsed={collapsed} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar onToggleSidebar={() => setCollapsed((c) => !c)} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="page-enter mx-auto max-w-[1600px]">{children}</div>
          </main>
        </div>
        <FirstLoginDialog />
      </div>
    </AuthGuard>
  );
}
