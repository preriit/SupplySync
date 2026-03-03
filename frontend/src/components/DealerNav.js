import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User, LayoutDashboard, Package, ShoppingCart, Users, BarChart3 } from 'lucide-react';

const DealerNav = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { path: '/dealer/dashboard', label: t('dashboard:nav.dashboard'), icon: LayoutDashboard },
    { path: '/dealer/inventory', label: t('dashboard:nav.inventory'), icon: Package },
    { path: '/dealer/orders', label: t('dashboard:nav.orders'), icon: ShoppingCart },
    { path: '/dealer/subdealers', label: t('dashboard:nav.subdealers'), icon: Users },
    { path: '/dealer/analytics', label: t('dashboard:nav.analytics'), icon: BarChart3 },
  ];

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  return (
    <nav className="bg-white border-b border-grey-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-display font-bold text-orange cursor-pointer" onClick={() => navigate('/dealer/dashboard')}>
              {t('common:app_name')}
            </h1>

            {/* Nav Links */}
            <div className="hidden md:flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? 'default' : 'ghost'}
                    className={`flex items-center space-x-2 ${
                      isActive ? 'bg-orange text-white hover:bg-orange-dark' : 'text-slate-light hover:text-slate'
                    }`}
                    onClick={() => navigate(item.path)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-orange text-white">
                      {getInitials(user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-slate">{user.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-semibold">{user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dealer/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>{t('dashboard:nav.profile')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('dashboard:nav.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DealerNav;
