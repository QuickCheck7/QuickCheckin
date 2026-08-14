'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslation } from '@/lib/i18n';
import { Loading } from '@/components/Loading';
import dynamic from 'next/dynamic';
import {
  Users,
  Table,
  MessageSquare,
  Settings,
  Home,
  CheckCircle,
  LogOut,
  CreditCard,
} from 'lucide-react';

// Lazy load icons for better performance
const UsersIcon = dynamic(() => Promise.resolve(Users), { ssr: false });
const TableIcon = dynamic(() => Promise.resolve(Table), { ssr: false });
const MessageSquareIcon = dynamic(() => Promise.resolve(MessageSquare), { ssr: false });
const SettingsIcon = dynamic(() => Promise.resolve(Settings), { ssr: false });
const HomeIcon = dynamic(() => Promise.resolve(Home), { ssr: false });
const CheckCircleIcon = dynamic(() => Promise.resolve(CheckCircle), { ssr: false });
const LogOutIcon = dynamic(() => Promise.resolve(LogOut), { ssr: false });

const navigation = [
  { nameKey: 'waitlist', href: '/admin', icon: Users },
  { nameKey: 'tables', href: '/admin/tables', icon: Table },
  { nameKey: 'messages', href: '/admin/messages', icon: MessageSquare },
  { nameKey: 'subscription', href: '/admin/subscription', icon: CreditCard },
  { nameKey: 'settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { logout, phoneNumber, isAuthenticated, userRole, isLoading, restaurantData, hydrate } = useAuthStore();

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    hydrate();
  }, []);

  // Redirect to /auth if not authenticated or not admin
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Check localStorage directly as fallback
        const hasToken = typeof window !== 'undefined' && localStorage.getItem('sessionToken');
        if (!hasToken) {
          router.replace('/auth');
        }
      } else if (userRole !== 'admin') {
        router.replace('/kiosk');
      }
    }
  }, [isAuthenticated, userRole, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Show loading while checking auth
  if (isLoading || !isAuthenticated || userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-off">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-off text-ink">
      {/* Header */}
      <header className="bg-panel border-b border-border">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Image src="/QuickCheck.svg" alt="QuickCheck logo" width={32} height={32} />
                <span className="text-2xl font-display font-bold">QuickCheck</span>
              </div>
              <div className="hidden sm:block text-sm text-muted">
                {t('restaurantAdmin')} • {restaurantData?.name || t('restaurantPanel')}
              </div>
              <div className="hidden sm:block text-xs text-muted">
                {phoneNumber}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-ink/15 text-ink hover:bg-off"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-panel border-r border-border min-h-screen">
          <div className="p-4">
            <div className="space-y-2">
              {navigation.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.nameKey}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted hover:text-ink hover:bg-off'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{t(item.nameKey as any)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
