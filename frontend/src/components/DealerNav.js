import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User, LayoutDashboard, Package, Users, BarChart3, Search, Grid3x3, Box, Bell, ChevronDown } from 'lucide-react';
import api from '../utils/api';

const DealerNav = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canManageTeam = user.user_type === 'dealer';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setShowResults(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch();
      } else {
        setSearchResults(null);
        setShowResults(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async () => {
    setSearching(true);
    try {
      const response = await api.get(`/dealer/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleResultClick = (result) => {
    if (result.type === 'subcategory') navigate(`/dealer/inventory/${result.id}/products`);
    else if (result.type === 'product') navigate(`/dealer/inventory/${result.subcategory_id}/products/${result.id}`);
    setShowResults(false);
    setSearchQuery('');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { path: '/dealer/dashboard', label: t('dashboard:nav.dashboard'), icon: LayoutDashboard },
    { path: '/dealer/inventory', label: t('dashboard:nav.inventory'), icon: Package },
    ...(canManageTeam ? [{ path: '/dealer/team-members', label: 'Team Members', icon: Users }] : []),
    { path: '/dealer/analytics', label: t('dashboard:nav.analytics'), icon: BarChart3 },
    { path: '/dealer/stock-alerts?stock=low', label: 'Stock Alerts', icon: Bell },
    { path: '/dealer/profile', label: 'Settings', icon: User },
  ];

  const getInitials = (name) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <>
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-60 bg-[#0B1F3A] text-white flex-col">
        <div className="h-16 px-5 flex items-center border-b border-white/10">
          <h1 className="text-3xl font-display font-bold text-orange cursor-pointer" onClick={() => navigate('/dealer/dashboard')}>
            {t('common:app_name')}
          </h1>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path.includes('?') && location.pathname === item.path.split('?')[0]);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? 'bg-orange text-white' : 'text-white/85 hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button type="button" onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white/85 hover:bg-white/10">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <nav className="fixed top-0 right-0 left-0 md:left-60 h-16 bg-white border-b border-app-border z-30">
        <div className="h-full px-4 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-xl relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search products, categories, brands, or SKUs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults) setShowResults(true); }}
                className="pl-10 pr-4 bg-slate-50"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange border-t-transparent"></div>
                </div>
              )}
            </div>
            {showResults && searchResults && (
              <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
                {searchResults.total_results === 0 ? (
                  <div className="p-4 text-center text-slate-light">No results found for "{searchQuery}"</div>
                ) : (
                  <>
                    {searchResults.subcategories.length > 0 && (
                      <div>
                        <div className="px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-slate-light uppercase">Categories ({searchResults.subcategories.length})</div>
                        {searchResults.subcategories.map((item) => (
                          <div key={item.id} onClick={() => handleResultClick(item)} className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-100 flex items-center space-x-3">
                            <div className="w-10 h-10 bg-orange-light rounded-lg flex items-center justify-center flex-shrink-0"><Grid3x3 className="h-5 w-5 text-orange" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate truncate">{item.name}</p>
                              <p className="text-sm text-slate-light">{item.size_inches} • {item.make_type} • {item.product_count} products</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults.products.length > 0 && (
                      <div>
                        <div className="px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-slate-light uppercase">Products ({searchResults.products.length})</div>
                        {searchResults.products.map((item) => (
                          <div key={item.id} onClick={() => handleResultClick(item)} className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-100 flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0"><Box className="h-5 w-5 text-gray-400" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate truncate"><span className="text-orange text-xs mr-2">{item.brand}</span>{item.name}</p>
                              <p className="text-sm text-slate-light truncate">{item.surface_type} • {item.quality} • {item.current_quantity} boxes</p>
                              <p className="text-xs text-slate-light truncate">in {item.subcategory_name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" className="text-slate-light"><Bell className="h-4 w-4" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8"><AvatarFallback className="bg-orange text-white">{getInitials(user.username)}</AvatarFallback></Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm text-slate font-medium leading-none">{user.username}</p>
                    <p className="text-xs text-slate-light">Dealer Account</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-light hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div><p className="font-semibold">{user.username}</p><p className="text-xs text-muted-foreground">{user.email}</p></div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dealer/profile')}><User className="mr-2 h-4 w-4" /><span>{t('dashboard:nav.profile')}</span></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600"><LogOut className="mr-2 h-4 w-4" /><span>{t('dashboard:nav.logout')}</span></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
    </>
  );
};

export default DealerNav;
