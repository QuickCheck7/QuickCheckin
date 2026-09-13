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
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
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
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-collapse sidebar on tablet screens (< 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 1024) {
          setIsCollapsed(true);
        } else {
          setIsCollapsed(false);
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    hydrate();
  }, []);

  // Redirect to /auth if not authenticated or not admin
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Check localStorage directly as fallback
        const hasToken = typeof window !== 'undefined' && (localStorage.getItem('sessionToken') || localStorage.getItem('token') || localStorage.getItem('preftech_token'));
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
      <header className="bg-panel border-b border-border sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Mobile Drawer Trigger */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-off text-muted hover:text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Tablet/Desktop Sidebar Collapse Toggle */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex p-2 rounded-lg hover:bg-off text-muted hover:text-ink transition-colors"
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </button>

              <Link href="/admin" className="flex items-center gap-2">
                <Image src="/QuickCheck.svg" alt="QuickCheck logo" width={32} height={32} />
                <span className="text-xl sm:text-2xl font-display font-bold">QuickCheck</span>
              </Link>
              <div className="hidden sm:block text-sm text-muted">
                {t('restaurantAdmin')} • {restaurantData?.name || t('restaurantPanel')}
              </div>
              <div className="hidden md:block text-xs text-muted">
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
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('logout')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] bg-panel h-full shadow-2xl p-4 flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <div className="flex items-center gap-2">
                  <Image src="/QuickCheck.svg" alt="QuickCheck logo" width={28} height={28} />
                  <span className="font-display font-bold text-lg">QuickCheck</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-off text-muted hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-1">
                {navigation.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.nameKey}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary/10 text-primary font-semibold'
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
            <div className="pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full border-ink/15 text-ink hover:bg-off justify-start"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('logout')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Desktop / Tablet Adaptive Sidebar */}
        <nav
          className={cn(
            "bg-panel border-r border-border transition-all duration-300 flex flex-col justify-between hidden md:flex shrink-0",
            isCollapsed ? "w-20" : "w-64"
          )}
        >
          <div className="p-3 lg:p-4">
            <div className="space-y-1.5">
              {navigation.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.nameKey}
                    href={item.href}
                    title={isCollapsed ? t(item.nameKey as any) : undefined}
                    className={cn(
                      'rounded-lg font-medium transition-colors flex items-center',
                      isCollapsed
                        ? 'flex-col justify-center py-2.5 px-1 text-xs gap-1 text-center'
                        : 'flex-row gap-3 px-3 py-2.5 text-sm',
                      active
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted hover:text-ink hover:bg-off'
                    )}
                  >
                    <item.icon className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-5 w-5")} />
                    <span className={cn(isCollapsed ? "text-[11px] leading-tight truncate max-w-[68px]" : "truncate")}>
                      {t(item.nameKey as any)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Bottom collapse helper toggle */}
          <div className="p-3 border-t border-border">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "w-full py-2 px-2 text-xs text-muted hover:text-ink hover:bg-off rounded-lg transition-colors flex items-center justify-center gap-2",
                isCollapsed ? "flex-col" : "flex-row"
              )}
            >
              {isCollapsed ? (
                <>
                  <PanelLeftOpen className="h-4 w-4" />
                  <span className="text-[10px]">Expand</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4" />
                  <span>Collapse Menu</span>
                </>
              )}
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
