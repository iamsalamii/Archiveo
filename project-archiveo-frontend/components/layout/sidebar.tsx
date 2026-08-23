'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/contexts/i18n-context';
import { useAuth } from '@/contexts/auth-context';
import { useParameters } from '@/contexts/parameters-context';
import { getIcon } from '@/utils/icons';
import { cn } from '@/lib/utils';
import { Archive, Wrench, ChevronDown, ChevronRight } from 'lucide-react';
import type { TranslationKey } from '@/config/i18n';

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: string;
  group: string;
  permission?: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: 'LayoutDashboard', group: 'main', permission: 'dashboard.read' },
  { href: '/documents', labelKey: 'nav.documents', icon: 'FileText', group: 'main', permission: 'documents.read' },
  { href: '/archives', labelKey: 'nav.archives', icon: 'Archive', group: 'main', permission: 'archives.read' },
  { href: '/documentalist', labelKey: 'nav.documentalist', icon: 'Library', group: 'main', permission: 'documents.read' },
  { href: '/search', labelKey: 'nav.search', icon: 'Search', group: 'main', permission: 'documents.read' },
  { href: '/correspondence', labelKey: 'nav.correspondence', icon: 'Mail', group: 'main', permission: 'correspondence.read' },
  { href: '/loans', labelKey: 'nav.loans', icon: 'HandHelping', group: 'main', permission: 'loans.read' },
  { href: '/workflows', labelKey: 'nav.workflows', icon: 'Workflow', group: 'main', permission: 'workflows.read' },
  { href: '/users', labelKey: 'nav.users', icon: 'Users', group: 'admin', permission: 'users.read' },
  { href: '/parameters', labelKey: 'nav.parameters' as TranslationKey, icon: 'Sliders', group: 'admin', permission: 'parameters.read' },
  { href: '/audit', labelKey: 'nav.audit', icon: 'History', group: 'admin', permission: 'audit.read' },
  { href: '/security', labelKey: 'nav.security', icon: 'Shield', group: 'admin', permission: 'roles.read' },
  { href: '/import-export', labelKey: 'nav.importExport' as TranslationKey, icon: 'ArrowDownUp', group: 'admin', permission: 'documents.read' },
  { href: '/settings', labelKey: 'nav.settings', icon: 'Settings', group: 'admin', permission: 'settings.read' },
  { href: '/profile', labelKey: 'nav.profile', icon: 'UserCircle', group: 'account', permission: 'profile.read' },
];

// Outils categories for the expandable section
const outilsCategories = [
  { code: 'DOC_TYPE', name: 'Types de documents', icon: 'FileText' },
  { code: 'CATEGORY', name: 'Catégories', icon: 'FolderTree' },
  { code: 'SUB_CATEGORY', name: 'Sous catégories', icon: 'FolderTree' },
  { code: 'SERVICE', name: 'Services', icon: 'Building2' },
  { code: 'DIRECTION', name: 'Directions', icon: 'Landmark' },
  { code: 'DEPARTMENT', name: 'Départements', icon: 'Network' },
  { code: 'UNIT', name: 'Unités', icon: 'GitBranch' },
  { code: 'AGENCY', name: 'Agences', icon: 'Store' },
  { code: 'SITE', name: 'Sites', icon: 'MapPin' },
  { code: 'LOCATION', name: 'Localisations', icon: 'Archive' },
  { code: 'SUPPORT_TYPE', name: 'Types de support', icon: 'HardDrive' },
  { code: 'FORMAT', name: 'Formats', icon: 'FileType' },
  { code: 'CONFIDENTIALITY', name: 'Confidentialité', icon: 'ShieldAlert' },
  { code: 'SECURITY_LEVEL', name: 'Sécurité', icon: 'Lock' },
  { code: 'DOC_STATUS', name: 'Statuts documentaires', icon: 'CircleDot' },
  { code: 'PHYSICAL_STATE', name: 'Etats physiques', icon: 'Package' },
  { code: 'LANGUAGE', name: 'Langues', icon: 'Languages' },
  { code: 'COUNTRY', name: 'Pays', icon: 'Globe' },
  { code: 'REGION', name: 'Régions', icon: 'Map' },
  { code: 'CITY', name: 'Villes', icon: 'MapPin' },
  { code: 'ORGANISM', name: 'Organismes', icon: 'Building' },
  { code: 'ARCHIVE_TYPE', name: "Types d'archives", icon: 'Archive' },
  { code: 'RETENTION', name: 'Conservation', icon: 'Clock' },
  { code: 'FINAL_SORT', name: 'Sort final', icon: 'GitMerge' },
  { code: 'DESTRUCTION_REASON', name: 'Motifs destruction', icon: 'Trash2' },
  { code: 'CLASSIFICATION', name: 'Classement', icon: 'ArrowDownAZ' },
  { code: 'PRIORITY', name: 'Priorités', icon: 'Flag' },
  { code: 'TAG', name: 'Etiquettes', icon: 'Tag' },
  { code: 'KEYWORD', name: 'Mots clés', icon: 'Hash' },
  { code: 'COLLECTION', name: 'Collections', icon: 'Library' },
  { code: 'FUND', name: 'Fonds', icon: 'Database' },
  { code: 'SERIE', name: 'Séries', icon: 'Layers' },
  { code: 'SUB_SERIE', name: 'Sous séries', icon: 'Layers' },
  { code: 'PRODUCER', name: 'Producteurs', icon: 'UserCog' },
  { code: 'SENDER', name: 'Expéditeurs', icon: 'Send' },
  { code: 'AUTHOR', name: 'Auteurs', icon: 'PenTool' },
  { code: 'RECIPIENT', name: 'Destinataires', icon: 'Send' },
  { code: 'CORRESPONDENCE_TYPE', name: 'Correspondance', icon: 'Mail' },
  { code: 'SIGNATURE_TYPE', name: 'Signature', icon: 'FileSignature' },
  { code: 'VALIDATION_TYPE', name: 'Validation', icon: 'CheckCircle' },
  { code: 'VALIDATION_CIRCUIT', name: 'Circuits', icon: 'Workflow' },
  { code: 'LOAN_TYPE', name: 'Types de prêt', icon: 'HandHelping' },
  { code: 'LOAN_REASON', name: 'Motifs de prêt', icon: 'ClipboardList' },
  { code: 'CONSULTATION_TYPE', name: 'Consultation', icon: 'Eye' },
  { code: 'ACCESS_TYPE', name: "Types d'accès", icon: 'KeyRound' },
  { code: 'USER_GROUP', name: 'Groupes', icon: 'Users' },
  { code: 'PROFILE', name: 'Profils', icon: 'IdCard' },
  { code: 'PERMISSION', name: 'Permissions', icon: 'ShieldCheck' },
  { code: 'ROLE', name: 'Rôles', icon: 'Shield' },
  { code: 'NOTIFICATION_TYPE', name: 'Notifications', icon: 'Bell' },
  { code: 'REMINDER_TYPE', name: 'Rappels', icon: 'AlarmClock' },
  { code: 'EMAIL_PARAM', name: 'Email', icon: 'Mail' },
  { code: 'SMS_PARAM', name: 'SMS', icon: 'MessageSquare' },
  { code: 'WORKFLOW_PARAM', name: 'Workflow', icon: 'Workflow' },
  { code: 'OCR_PARAM', name: 'OCR', icon: 'ScanText' },
  { code: 'AI_PARAM', name: 'IA', icon: 'BrainCircuit' },
];

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user } = useAuth();
  const { getItems } = useParameters();
  const [outilsExpanded, setOutilsExpanded] = useState(false);

  const hasPermission = (permission?: string) =>
    !permission || user?.permissions?.includes(permission) === true;
  const visibleItems = navItems.filter((item) => hasPermission(item.permission));
  const main = visibleItems.filter((i) => i.group === 'main');
  const admin = visibleItems.filter((i) => i.group === 'admin');
  const account = visibleItems.filter((i) => i.group === 'account');

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const renderLink = (item: NavItem) => {
    const Icon = getIcon(item.icon);
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={true}
        title={collapsed ? t(item.labelKey) : undefined}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
          active
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground',
          collapsed && 'justify-center'
        )}
      >
        <Icon className={cn('h-5 w-5 shrink-0', active && 'text-primary-foreground')} />
        {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-foreground/10 px-4">
        <Link href="/" prefetch={true} className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Archive className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight">Archivéo</span>
              <span className="text-[10px] text-sidebar-foreground/50">GED Enterprise</span>
            </div>
          )}
        </Link>
      </div>

      {/* Outils — expandable, prominent */}
      <div className="border-b border-sidebar-foreground/10 px-3 py-2">
        <Link
          href="/outils"
          prefetch={true}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all',
            pathname.startsWith('/outils')
              ? 'bg-primary text-primary-foreground'
              : 'bg-sidebar-foreground/10 text-sidebar-foreground hover:bg-sidebar-foreground/20',
            collapsed && 'justify-center'
          )}
        >
          <Wrench className={cn('h-5 w-5 shrink-0', pathname.startsWith('/outils') ? 'text-primary-foreground' : 'text-primary')} />
          {!collapsed && <span className="flex-1">{t('nav.outils')}</span>}
          {!collapsed && (
            <button
              onClick={(e) => { e.preventDefault(); setOutilsExpanded(!outilsExpanded); }}
              className="shrink-0"
            >
              {outilsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </Link>

        {/* Expandable categories */}
        {outilsExpanded && !collapsed && (
          <div className="mt-1 max-h-[400px] space-y-0.5 overflow-y-auto pl-2">
            {outilsCategories.map((cat) => {
              const Icon = getIcon(cat.icon);
              const count = getItems(cat.code).length;
              return (
                <Link
                  key={cat.code}
                  href={`/outils?group=${cat.code}`}
                  prefetch={true}
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{cat.name}</span>
                  <span className="text-[10px] text-sidebar-foreground/40">{count}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {!collapsed && (
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Navigation
          </p>
        )}
        {main.map(renderLink)}

        {!collapsed && (
          <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Administration
          </p>
        )}
        {admin.map(renderLink)}

        {!collapsed && (
          <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Compte
          </p>
        )}
        {account.map(renderLink)}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-foreground/10 p-3">
        {!collapsed && (
          <div className="px-3 text-[10px] text-sidebar-foreground/40">
            v2.4.0 — © 2024 Archivéo
          </div>
        )}
      </div>
    </aside>
  );
}