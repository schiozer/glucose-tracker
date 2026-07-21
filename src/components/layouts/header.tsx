'use client';

import { Menu, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface HeaderProps {
  userName?: string;
  userPicture?: string;
  onMenuToggle?: () => void;
}

export function Header({ userName, userPicture, onMenuToggle }: HeaderProps) {
  const handleLogout = () => {
    window.location.href = '/api/auth/logout';
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-6">
      {/* Mobile menu toggle */}
      {onMenuToggle && (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuToggle}
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* User info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {/* User avatar */}
          <div className="relative h-8 w-8 overflow-hidden rounded-full bg-muted">
            {userPicture ? (
              <Image
                src={userPicture}
                alt={userName || 'Usuário'}
                fill
                className="object-cover"
                sizes="32px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* User name */}
          {userName && (
            <span className="hidden text-sm font-medium md:inline-block">
              {userName}
            </span>
          )}
        </div>

        {/* Logout button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="gap-2"
          aria-label="Sair da aplicação"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}
