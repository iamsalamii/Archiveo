'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/theme-context';
import { useI18n } from '@/contexts/i18n-context';
import { useAuth } from '@/contexts/auth-context';
import type { AppNotification } from '@/types';
import { useNotifications } from '@/hooks/use-notifications';
import { getIcon } from '@/utils/icons';
import { cn } from '@/lib/utils';
import {
  Menu,
  Sun,
  Moon,
  Monitor,
  Bell,
  Settings,
  User,
  LogOut,
  Globe,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Locale } from '@/config/i18n';

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);

  // Initialise notifications via custom hook (handled in useNotifications)
  const { notifications, markAllRead } = useNotifications(user?.id ?? '');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : '?';

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="lg:flex">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden items-center gap-2 md:flex">
          <span className="text-sm font-medium text-muted-foreground">
            {new Date().toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Language */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Globe className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Langue / Language</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {([
              { code: 'fr', label: 'Français', flag: 'FR' },
              { code: 'en', label: 'English', flag: 'EN' },
            ] as { code: Locale; label: string; flag: string }[]).map((l) => (
              <DropdownMenuItem
                key={l.code}
                onClick={() => setLocale(l.code)}
                className="flex items-center justify-between"
              >
                <span>{l.label}</span>
                {locale === l.code && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>



        {/* Theme */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4" />
              ) : theme === 'system' ? (
                <Monitor className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('settings.theme')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {([
              { val: 'light' as const, icon: Sun, label: t('settings.lightMode') },
              { val: 'dark' as const, icon: Moon, label: t('settings.darkMode') },
              { val: 'system' as const, icon: Monitor, label: t('settings.systemMode') },
            ]).map((opt) => (
              <DropdownMenuItem
                key={opt.val}
                onClick={() => setTheme(opt.val)}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </span>
                {theme === opt.val && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between">
                Notifications
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllRead}>
                    Tout marquer comme lu
                  </Button>
                )}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-2 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucune notification</p>
              ) : (
                notifications.map((n) => {
                  const Icon = getIcon('Bell');
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'flex gap-3 rounded-lg border p-3 transition-colors',
                        n.read ? 'bg-card' : 'bg-primary/5'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                          n.type === 'error' && 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
                          n.type === 'warning' && 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
                          n.type === 'success' && 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
                          n.type === 'info' && 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {new Date(n.date).toLocaleString('fr-FR')}  {/* ✅ Utilise date */}
                        </p>
                      </div>
                      {!n.read && <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                  );
                })
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start lg:flex">
                <span className="text-sm font-medium leading-none">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-[10px] text-muted-foreground">{user?.function}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.firstName} {user?.lastName}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" /> {t('nav.profile')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" /> {t('nav.settings')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { logout(); router.push('/login'); }} className="flex items-center gap-2 text-destructive">
              <LogOut className="h-4 w-4" /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}