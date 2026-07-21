/**
 * Quick Actions Component
 * Provides quick access to main features
 */

'use client';

import Link from 'next/link';
import { Activity, TrendingUp, FileText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
}

const actions: QuickAction[] = [
  {
    title: 'Nova Medição',
    description: 'Registrar nova leitura',
    icon: Activity,
    href: '/readings?action=new',
    color: 'text-blue-600',
  },
  {
    title: 'Ver Gráficos',
    description: 'Análise visual dos dados',
    icon: TrendingUp,
    href: '/charts',
    color: 'text-green-600',
  },
  {
    title: 'Gerar Relatório',
    description: 'Exportar dados e análises',
    icon: FileText,
    href: '/reports',
    color: 'text-purple-600',
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações Rápidas</CardTitle>
        <CardDescription>
          Acesso rápido às funcionalidades principais
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="rounded-lg border p-4 hover:bg-accent transition-colors cursor-pointer"
              >
                <Icon className={`h-8 w-8 mb-2 ${action.color}`} />
                <h3 className="font-semibold mb-1">{action.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
