import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import DealerNav from '../components/DealerNav';
import StatCard from '../components/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertTriangle, TrendingUp, ShoppingBag, Plus, Eye, FileText } from 'lucide-react';
import api from '../utils/api';

const DealerDashboard = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canWriteInventory = ['dealer', 'manager'].includes(user.user_type);
  const [stats, setStats] = useState({
    total_products: 0,
    active_products: 0,
    low_stock_items: 0,
    out_of_stock_items: 0,
    inventory_value: 0,
    recent_activity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/dealer/dashboard/stats');
      // Ensure all fields have default values
      setStats({
        total_products: response.data?.total_products || 0,
        active_products: response.data?.active_products || 0,
        low_stock_items: response.data?.low_stock_items || 0,
        out_of_stock_items: response.data?.out_of_stock_items || 0,
        inventory_value: response.data?.inventory_value || 0,
        recent_activity: response.data?.recent_activity || []
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Keep default stats on error
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-grey-50">
      <DealerNav />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-slate mb-2">
            {t('dashboard:welcome_back')}, {user.username}!
          </h1>
          <p className="text-slate-light">
            {t('dashboard:overview')}
          </p>
        </div>

        {/* Stats Grid - Bento Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title={t('dashboard:total_products')}
            value={loading ? '...' : stats.total_products}
            subtitle={`${stats.active_products} ${t('dashboard:active_products').toLowerCase()}`}
            icon={Package}
            iconColor="text-orange"
          />
          
          <StatCard
            title={t('dashboard:low_stock_items')}
            value={loading ? '...' : stats.low_stock_items}
            subtitle="Need attention"
            icon={AlertTriangle}
            iconColor="text-yellow-500"
          />
          
          <StatCard
            title={t('dashboard:out_of_stock')}
            value={loading ? '...' : stats.out_of_stock_items}
            subtitle="Restock required"
            icon={ShoppingBag}
            iconColor="text-red-500"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl font-display">
                {t('dashboard:quick_actions')}
              </CardTitle>
              <CardDescription>
                Manage your inventory and business operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {canWriteInventory && (
                  <Button
                    onClick={() => navigate('/dealer/inventory')}
                    className="bg-orange hover:bg-orange-dark h-24 flex flex-col items-center justify-center space-y-2"
                  >
                    <Plus className="h-8 w-8" />
                    <span className="font-semibold">{t('dashboard:add_product')}</span>
                  </Button>
                )}
                
                <Button
                  onClick={() => navigate('/dealer/inventory')}
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center space-y-2 border-2 hover:border-orange hover:text-orange"
                >
                  <Eye className="h-8 w-8" />
                  <span className="font-semibold">{t('dashboard:view_inventory')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-display">
                {t('dashboard:recent_activity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!stats.recent_activity || stats.recent_activity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('dashboard:no_activity')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recent_activity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-orange rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Get Started Guide - Show if no products */}
        {!loading && stats.total_products === 0 && canWriteInventory && (
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
      </div>
    </div>
  );
};

export default DealerDashboard;
