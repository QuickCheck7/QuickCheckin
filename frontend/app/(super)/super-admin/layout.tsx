'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Building,
  BarChart3,
  Settings,
  Users,
  Home,
  CheckCircle,
  LogOut,
  TrendingUp,
} from 'lucide-react';
import Image from 'next/image';
import { isSuperAdminAuthenticated, clearSuperAdminAuth } from '@/lib/super-admin-auth';

const navigation = [
  { name: 'Restaurants', href: '/super-admin/restaurants', icon: Building },
  { name: 'Analytics', href: '/super-admin/analytics', icon: TrendingUp },
  { name: 'System Settings', href: '/super-admin/settings', icon: Settings },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (pathname === '/super-admin/auth') {
      setIsAuthenticated(true);
      return;
    }

    const isAuth = isSuperAdminAuthenticated();

    if (!isAuth) {
      clearSuperAdminAuth();
      setIsAuthenticated(false);
      router.push('/super-admin/auth');
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  const handleLogout = () => {
    clearSuperAdminAuth();
    router.push('/super-admin/auth');
  };

  // Don't render layout for auth page
  if (pathname === '/super-admin/auth') {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null; // or a loading spinner
  }

  return (
    <div className="min-h-screen bg-off text-ink">
      {/* Header */}
      <header className="bg-panel border-b border-border">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/QuickCheck.svg" alt="QuickCheck Logo" width={36} height={36}></Image>
                <span className="text-2xl font-display font-bold">QuickCheck</span>
              </Link>

              <div className="hidden sm:flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-sm font-medium text-primary">Super Admin</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-ink/15 text-ink hover:bg-off"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-ink/15 text-ink hover:bg-off"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
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
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted hover:text-ink hover:bg-off'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
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
