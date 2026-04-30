import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { webStorage } from '@supplysync/core';
import DealerPageShell from '../components/DealerPageShell';
import StatCard from '../components/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Package, AlertTriangle, ShoppingBag, Repeat, Plus, Eye, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import SectionHeader from '@/components/theme/SectionHeader';
import AppBreadcrumb from '@/components/theme/AppBreadcrumb';

const DealerDashboard = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const user = JSON.parse(webStorage.getItem('user') || '{}');
  const canWriteInventory = ['dealer', 'manager'].includes(user.user_type);
  const [stats, setStats] = useState({
    total_products: 0,
    low_stock_skus: 0,
    out_of_stock_skus: 0,
    inventory_transactions_today: 0,
    inventory_transactions_trend: null,
    inventory_transactions_sparkline: [],
    inventory_value: 0,
    recent_activity: [],
    fast_moving_products: [],
    dead_stock_products: [],
  });
  const [loading, setLoading] = useState(true);
  const [viewAllDialog, setViewAllDialog] = useState({ open: false, type: null, items: [], loading: false });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/dealer/dashboard/stats');
      // Ensure all fields have default values
      setStats({
        total_products: response.data?.total_products || 0,
        low_stock_skus: response.data?.low_stock_skus || 0,
        out_of_stock_skus: response.data?.out_of_stock_skus || 0,
        inventory_transactions_today: response.data?.inventory_transactions_today || 0,
        inventory_transactions_trend: response.data?.inventory_transactions_trend || null,
        inventory_transactions_sparkline: response.data?.inventory_transactions_sparkline || [],
        inventory_value: response.data?.inventory_value || 0,
        recent_activity: response.data?.recent_activity || [],
        fast_moving_products: response.data?.fast_moving_products || [],
        dead_stock_products: response.data?.dead_stock_products || [],
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Keep default stats on error
    } finally {
      setLoading(false);
    }
  };

  const openStockFocus = (stockType) => {
    navigate(`/dealer/stock-alerts?stock=${stockType}`);
  };

  const stockChip = (qty) => {
    if (qty <= 0) {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Out</Badge>;
    }
    if (qty < 20) {
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Low</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">In</Badge>;
  };

  const openViewAll = async (type) => {
    setViewAllDialog({ open: true, type, items: [], loading: true });
    try {
      const response = await api.get(`/dealer/dashboard/products-list?list_type=${type}&limit=20`);
      setViewAllDialog({
        open: true,
        type,
        items: response.data?.items || [],
        loading: false,
      });
    } catch (error) {
      setViewAllDialog({ open: true, type, items: [], loading: false });
    }
  };

  const formatProductDisplayName = (name) => {
    const raw = (name || '').trim();
    if (!raw) return 'Unnamed Product';
    const lettersOnly = raw.replace(/[^A-Za-z]/g, '');
    const looksAllCaps = lettersOnly.length > 0 && lettersOnly === lettersOnly.toUpperCase();
    if (!looksAllCaps) return raw;
    return raw
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatDateDDMMYYYY = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <DealerPageShell>
        <AppBreadcrumb
          items={[
            { label: 'Home', to: '/dealer/dashboard' },
            { label: 'Dashboard', to: '/dealer/dashboard' },
          ]}
        />
        {/* Reusable heading pattern keeps top-of-page hierarchy consistent. */}
        <SectionHeader
          className="mb-8"
          title={`${t('dashboard:welcome_back')}, ${user.username}!`}
          subtitle={t('dashboard:overview')}
        />

        {/* Stats Grid - Bento Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title={t('dashboard:total_products')}
            value={loading ? '...' : stats.total_products}
            subtitle="Total inventory items"
            icon={Package}
            iconColor="text-orange"
          />
          
          <StatCard
            title="Low Stock SKUs"
            value={loading ? '...' : stats.low_stock_skus}
            subtitle="Need attention • Click to review"
            icon={AlertTriangle}
            iconColor="text-yellow-500"
            onClick={() => openStockFocus('low')}
          />
          
          <StatCard
            title="Out of Stock SKUs"
            value={loading ? '...' : stats.out_of_stock_skus}
            subtitle="Restock required • Click to review"
            icon={ShoppingBag}
            iconColor="text-red-500"
            onClick={() => openStockFocus('out')}
          />

          <StatCard
            title="Inventory Transactions Today"
            value={loading ? '...' : stats.inventory_transactions_today}
            subtitle="Today's throughput"
            icon={Repeat}
            iconColor="text-purple-600"
            trend={!loading ? stats.inventory_transactions_trend : null}
            sparklineData={!loading ? stats.inventory_transactions_sparkline : []}
          />
        </div>

        {/* Row 2: Fast moving + dead stock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-display">Fast Moving Products</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openViewAll('fast_movers')}
                  className="text-orange hover:text-orange-dark hover:underline"
                >
                  View all
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
              <CardDescription>Top movers in last 30 days</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {!stats.fast_moving_products?.length ? (
                <p className="text-sm text-muted-foreground">No movement yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <colgroup>
                      <col />
                      <col className="w-32" />
                      <col className="w-24" />
                    </colgroup>
                    <thead className="text-xs text-muted-foreground border-b">
                      <tr>
                        <th className="text-left py-1.5 pr-2 font-medium">Product</th>
                        <th className="text-right py-1.5 px-2 font-medium">Sold (Last 30 Days)</th>
                        <th className="text-right py-1.5 pl-2 font-medium">In Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.fast_moving_products.map((item) => (
                        <tr
                          key={item.product_id}
                          className="group border-b last:border-b-0 cursor-pointer hover:bg-slate-50"
                          onClick={() => {
                            if (item.sub_category_id) {
                              navigate(`/dealer/inventory/${item.sub_category_id}/products/${item.product_id}`);
                            }
                          }}
                        >
                          <td className="py-1.5 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-slate line-clamp-1">{item.name}</span>
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-right text-slate tabular-nums">{item.units_moved}</td>
                          <td className="py-1.5 pl-2 text-right text-slate tabular-nums">{item.in_stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-display">Slow Moving</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openViewAll('dead_stock')}
                  className="text-orange hover:text-orange-dark hover:underline"
                >
                  View all
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
              <CardDescription>No movement in 90+ days</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {!stats.dead_stock_products?.length ? (
                <p className="text-sm text-muted-foreground">No dead stock detected.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <colgroup>
                      <col />
                      <col className="w-32" />
                      <col className="w-24" />
                    </colgroup>
                    <thead className="text-xs text-muted-foreground border-b">
                      <tr>
                        <th className="text-left py-1.5 pr-2 font-medium">Product</th>
                        <th className="text-left py-1.5 px-2 font-medium">Last Movement</th>
                        <th className="text-right py-1.5 pl-2 font-medium">In Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.dead_stock_products.map((item) => (
                        <tr
                          key={item.product_id}
                          className="group border-b last:border-b-0 cursor-pointer hover:bg-slate-50"
                          onClick={() => {
                            if (item.sub_category_id) {
                              navigate(`/dealer/inventory/${item.sub_category_id}/products/${item.product_id}`);
                            }
                          }}
                        >
                          <td className="py-1.5 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate line-clamp-1">{item.name}</span>
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-slate">
                            <span>{formatDateDDMMYYYY(item.last_movement)}</span>
                          </td>
                          <td className="py-1.5 pl-2 text-right">
                            <span className={`text-slate tabular-nums ${item.is_urgent ? 'text-red-700 font-medium' : ''}`}>{item.current_quantity}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Compact Recent Activity */}
        <Card className="mb-6 border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">{t('dashboard:recent_activity')}</CardTitle>
            <CardDescription>Latest inventory actions</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {!stats.recent_activity || stats.recent_activity.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">
                {t('dashboard:no_activity')}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="hidden md:grid md:grid-cols-[1fr_100px_180px] md:gap-4 px-3 text-[10px] uppercase tracking-wide text-slate-500">
                  <span>Activity</span>
                  <span className="pl-1">Time</span>
                  <span>Updated By</span>
                </div>
                {[...(stats.recent_activity || [])]
                  .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                  .map((activity, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-[1fr_100px_180px] gap-1 md:gap-4 rounded-md border px-3 py-1.5"
                  >
                    <p className="text-sm text-slate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground md:whitespace-nowrap md:pl-1">{activity.time}</p>
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-xs text-muted-foreground md:whitespace-nowrap md:truncate">
                            {activity.actor || 'System'}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent>
                          {activity.actor || 'System'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={viewAllDialog.open}
          onOpenChange={(open) => setViewAllDialog((prev) => ({ ...prev, open }))}
        >
          <DialogContent className="max-w-3xl max-h-[86vh] overflow-y-auto [&>button]:text-slate-400 [&>button]:hover:text-slate-600 [&>button]:border-0 [&>button]:shadow-none">
            <DialogHeader>
              <DialogTitle>
                {viewAllDialog.type === 'dead_stock' ? 'Slow Moving - Top 20 Active Products' : 'Fast Movers - Top 20 Active Products'}
              </DialogTitle>
              <DialogDescription>
                {viewAllDialog.type === 'dead_stock'
                  ? 'Products with no movement in 90+ days.'
                  : 'Products with highest sold volume in last 30 days.'}
              </DialogDescription>
            </DialogHeader>
            {viewAllDialog.loading ? (
              <p className="text-sm text-muted-foreground py-3">Loading...</p>
            ) : viewAllDialog.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">No products found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <colgroup>
                    <col />
                    <col className="w-40" />
                    <col className="w-28" />
                  </colgroup>
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-1.5 pr-2 font-medium">Product</th>
                      {viewAllDialog.type === 'dead_stock' ? (
                        <th className="text-left py-1.5 px-2 font-medium">Last Movement</th>
                      ) : (
                        <th className="text-right py-1.5 px-2 font-medium">Sold (Last 30 Days)</th>
                      )}
                      <th className="text-right py-1.5 pl-2 font-medium">In Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewAllDialog.items.map((item) => (
                      <tr
                        key={item.product_id}
                        className="group border-b last:border-b-0 cursor-pointer hover:bg-slate-50"
                        onClick={() => {
                          if (item.sub_category_id) {
                            navigate(`/dealer/inventory/${item.sub_category_id}/products/${item.product_id}`);
                            setViewAllDialog((prev) => ({ ...prev, open: false }));
                          }
                        }}
                      >
                        <td className="py-1.5 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate line-clamp-1">{formatProductDisplayName(item.name)}</span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                          </div>
                        </td>
                        {viewAllDialog.type === 'dead_stock' ? (
                          <td className="py-1.5 px-2 text-slate">
                            <span>{formatDateDDMMYYYY(item.last_movement)}</span>
                          </td>
                        ) : (
                          <td className="py-1.5 px-2 text-right text-slate tabular-nums">{item.units_moved}</td>
                        )}
                        <td className="py-1.5 pl-2 text-right text-slate tabular-nums">{item.current_stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Secondary strip: Quick Actions */}
        <Card className="mb-6 border border-slate-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3">
              {canWriteInventory && (
                <Button onClick={() => navigate('/dealer/inventory')} className="bg-orange hover:bg-orange-dark">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('dashboard:add_product')}
                </Button>
              )}
              <Button onClick={() => navigate('/dealer/inventory')} variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                {t('dashboard:view_inventory')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Get Started Guide - Show if no products */}
        {!loading && stats.low_stock_skus === 0 && stats.out_of_stock_skus === 0 && canWriteInventory && (
          <Card className="mt-6 border-orange border-2">
            <CardHeader>
              <CardTitle className="text-xl font-display text-orange">
                🚀 Get Started with SupplySync
              </CardTitle>
              <CardDescription>
                Start building your inventory to manage your tile business effectively
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-orange text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold">Add Your First Product</h4>
                    <p className="text-sm text-muted-foreground">
                      Open Inventory, choose a tile category, then use Add Product to enter brand, surface type, and stock
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="bg-orange text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold">Manage Your Inventory</h4>
                    <p className="text-sm text-muted-foreground">
                      Keep track of stock levels and update quantities as you sell
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="bg-orange text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold">Connect with Sub-dealers</h4>
                    <p className="text-sm text-muted-foreground">
                      Share your inventory with sub-dealers and manage orders seamlessly
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => navigate('/dealer/inventory')}
                  className="w-full bg-orange hover:bg-orange-dark mt-4"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Go to Inventory
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
    </DealerPageShell>
  );
};

export default DealerDashboard;
