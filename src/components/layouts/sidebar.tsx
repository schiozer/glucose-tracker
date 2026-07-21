'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Activity, BarChart, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  className?: string;
}

const navigationItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    label: 'Medições',
    href: '/readings',
    icon: Activity,
  },
  {
    label: 'Gráficos',
    href: '/charts',
    icon: BarChart,
  },
  {
    label: 'Relatórios',
    href: '/reports',
    icon: FileText,
  },
  {
    label: 'Configurações',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-background',
        className
      )}
    >
      {/* Logo/Brand */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Activity className="h-6 w-6 text-primary" />
          <span className="text-xl">Glucose Tracker</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4" aria-label="Navegação principal">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Footer */}
      <div className="p-4">
        <p className="text-xs text-muted-foreground text-center">
          Glucose Tracker v1.0
        </p>
      </div>
    </aside>
  );
}
