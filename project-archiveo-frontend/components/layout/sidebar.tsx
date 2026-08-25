'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { getIcon } from '@/utils/icons';
import { cn } from '@/lib/utils';
import { Archive } from 'lucide-react';
import type { TranslationKey } from '@/config/i18n';

interface NavSection {
  titleKey: TranslationKey;
  items: {
    href: string;
    labelKey: TranslationKey;
    icon: string;
    permission?: string;
  }[];
}

const navSections: NavSection[] = [
  {
    titleKey: 'nav.section.pilotage',
    items: [
      { href: '/dashboard', labelKey: 'nav.dashboard', icon: 'LayoutDashboard', permission: 'dashboard.read' },
      { href: '/search', labelKey: 'nav.search', icon: 'Search', permission: 'documents.read' },
      { href: '/ocr-search', labelKey: 'nav.ocrSearch', icon: 'FileSearch', permission: 'documents.read' },
    ],
  },
  {
    titleKey: 'nav.section.documentaire',
    items: [
      { href: '/documents', labelKey: 'nav.documents', icon: 'FileText', permission: 'documents.read' },
      { href: '/correspondence', labelKey: 'nav.correspondence', icon: 'Mail', permission: 'correspondence.read' },
      { href: '/documentalist', labelKey: 'nav.documentalist', icon: 'Library', permission: 'documents.read' },
    ],
  },
  {
    titleKey: 'nav.section.conservation',
    items: [
      { href: '/archives', labelKey: 'nav.archives', icon: 'Archive', permission: 'archives.read' },
      { href: '/topography', labelKey: 'nav.topography', icon: 'Warehouse', permission: 'archives.read' },
      { href: '/loans', labelKey: 'nav.loans', icon: 'HandHelping', permission: 'loans.read' },
    ],
  },
  {
    titleKey: 'nav.section.conformite',
    items: [
      { href: '/workflows', labelKey: 'nav.workflows', icon: 'Workflow', permission: 'workflows.read' },
      { href: '/signatures', labelKey: 'nav.signatures', icon: 'PenTool', permission: 'documents.read' },
      { href: '/security', labelKey: 'nav.security', icon: 'Shield', permission: 'roles.read' },
      { href: '/audit', labelKey: 'nav.audit', icon: 'History', permission: 'audit.read' },
    ],
  },
  {
    titleKey: 'nav.section.administration',
    items: [
      { href: '/outils', labelKey: 'nav.outils', icon: 'Wrench', permission: 'parameters.read' },
      { href: '/users', labelKey: 'nav.users', icon: 'Users', permission: 'users.read' },
      { href: '/import-export', labelKey: 'nav.importExport', icon: 'ArrowDownUp', permission: 'documents.read' },
      { href: '/settings', labelKey: 'nav.settings', icon: 'Settings', permission: 'settings.read' },
      { href: '/profile', labelKey: 'nav.profile', icon: 'UserCircle', permission: 'profile.read' },
    ],
  },
];

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useI18n();

  const hasPermission = (permission?: string) =>
    !permission || user?.permissions?.includes(permission) === true;

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-foreground/10 transition-[width] duration-150 ease-out select-none shadow-sm',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo & Marque */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-foreground/10 px-4 shrink-0">
        <Link href="/" prefetch={true} className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md group-hover:scale-105 transition-all">
            <Archive className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden whitespace-nowrap">
              <span className="text-sm font-extrabold tracking-tight text-foreground flex items-center gap-1.5">
                ARCHIVÉO
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                GED & Records Management
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation thématique groupée */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3 scrollbar-thin">
        {navSections.map((section) => {
          const visibleSectionItems = section.items.filter((item) => hasPermission(item.permission));
          if (visibleSectionItems.length === 0) return null;

          return (
            <div key={section.titleKey} className="space-y-1">
              {!collapsed && (
                <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 truncate">
                  {t(section.titleKey)}
                </p>
              )}
              {visibleSectionItems.map((item) => {
                const Icon = getIcon(item.icon);
                const active = isActive(item.href);
                const label = t(item.labelKey);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    title={collapsed ? label : undefined}
                    className={cn(
                      'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground',
                      collapsed && 'justify-center px-0'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary-foreground' : 'text-primary/80')} />
                    {!collapsed && <span className="flex-1 truncate">{label}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Pied de Sidebar */}
      <div className="border-t border-sidebar-foreground/10 p-3 shrink-0">
        {!collapsed ? (
          <div className="flex items-center justify-between px-2 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
            <span>Archivéo Enterprise</span>
            <span className="font-mono font-bold text-primary">v2.4.0</span>
          </div>
        ) : (
          <div className="text-center font-mono text-[9px] text-muted-foreground">v2.4</div>
        )}
      </div>
    </aside>
  );
}