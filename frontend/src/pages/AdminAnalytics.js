import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '../utils/api';

const DEFAULT_ANALYTICS = {
  kpis: {
    period_days: 30,
    dead_stock_days: 60,
    total_products: 0,
    products_with_movement: 0,
    total_units_added: 0,
    total_units_removed: 0,
    dead_stock_count: 0,
    avg_rotation_score: 0,
  },
  fast_movers: [],
  dead_stock: [],
};

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(DEFAULT_ANALYTICS);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/admin/analytics/inventory?days=30&dead_stock_days=60&limit=8');
        setData(response.data || DEFAULT_ANALYTICS);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const { kpis, fast_movers, dead_stock } = data;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Inventory Analytics</h1>
          <p className="text-slate-400">
            Fast movers, dead stock and stock rotation over the last {kpis.period_days} days.
          </p>
        </div>

        {error && (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4 text-red-200">{error}</CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription>Total products</CardDescription>
              <CardTitle className="text-white">{loading ? '...' : kpis.total_products}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription>Products with movement</CardDescription>
              <CardTitle className="text-white">{loading ? '...' : kpis.products_with_movement}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription>Units removed</CardDescription>
              <CardTitle className="text-white">{loading ? '...' : kpis.total_units_removed}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription>Average rotation score</CardDescription>
              <CardTitle className="text-white">{loading ? '...' : `${kpis.avg_rotation_score}%`}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Fast Movers</CardTitle>
              <CardDescription>Top products by units removed in the last {kpis.period_days} days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!loading && fast_movers.length === 0 && (
                <p className="text-slate-400 text-sm">No movement detected in this period.</p>
              )}
              {fast_movers.map((item) => (
                <div key={item.product_id} className="p-3 bg-slate-700/40 rounded-lg">
                  <p className="text-white font-medium">{item.brand} - {item.product_name}</p>
                  <p className="text-xs text-slate-400">{item.merchant_name}</p>
                  <p className="text-sm text-orange-300 mt-1">
                    Moved: {item.units_moved} | Rotation: {item.rotation_score}%
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Dead Stock</CardTitle>
              <CardDescription>
                Products with quantity on hand and no movement for at least {kpis.dead_stock_days} days.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!loading && dead_stock.length === 0 && (
                <p className="text-slate-400 text-sm">No dead stock detected.</p>
              )}
              {dead_stock.map((item) => (
                <div key={item.product_id} className="p-3 bg-slate-700/40 rounded-lg">
                  <p className="text-white font-medium">{item.brand} - {item.product_name}</p>
                  <p className="text-xs text-slate-400">{item.merchant_name}</p>
                  <p className="text-sm text-red-300 mt-1">
                    Qty: {item.current_quantity} | No movement: {item.days_since_movement} days
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 text-sm">
            Units added: <span className="text-white font-medium">{kpis.total_units_added}</span> | Dead stock count:{' '}
            <span className="text-white font-medium">{kpis.dead_stock_count}</span>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
