import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Users, Building2, Package, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '../utils/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await api.get('/admin/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
    {
      title: 'Total Users',
      value: stats.total_users,
      icon: Users,
      color: 'bg-blue-500',
      description: 'All registered users'
    },
    {
      title: 'Total Merchants',
      value: stats.total_merchants,
      icon: Building2,
      color: 'bg-green-500',
      description: 'Dealer businesses'
    },
    {
      title: 'Body Types',
      value: stats.body_types,
      icon: Package,
      color: 'bg-purple-500',
      description: 'Active body types'
    },
    {
      title: 'Make Types',
      value: stats.make_types,
      icon: Package,
      color: 'bg-indigo-500',
      description: 'Active make types'
    },
    {
      title: 'Application Types',
      value: stats.application_types,
      icon: Package,
      color: 'bg-pink-500',
      description: 'Active application types'
    },
    {
      title: 'Sizes',
      value: stats.sizes,
      icon: Package,
      color: 'bg-cyan-500',
      description: 'Active size configurations'
    },
    {
      title: 'Active Subscriptions',
      value: stats.active_subscriptions,
      icon: TrendingUp,
      color: 'bg-orange',
      description: 'Paid subscriptions'
    },
    {
      title: 'Trial Subscriptions',
      value: stats.trial_subscriptions,
      icon: Clock,
      color: 'bg-yellow-500',
      description: 'Trial accounts'
    },
    {
      title: 'Suspended Users',
      value: stats.suspended_users,
      icon: AlertCircle,
      color: 'bg-red-500',
      description: 'Inactive accounts'
    },
  ] : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Dashboard Overview</h1>
          <p className="text-slate-400">Platform statistics and key metrics</p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange mx-auto"></div>
            <p className="text-slate-400 mt-4">Loading statistics...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="bg-slate-800 border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-200">
                      {stat.title}
                    </CardTitle>
                    <div className={`${stat.color} p-2 rounded-lg`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                    <p className="text-xs text-slate-400">{stat.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-slate-400">Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/admin/users"
                className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Users className="h-8 w-8 text-orange mb-2" />
                <h3 className="text-white font-medium mb-1">Manage Users</h3>
                <p className="text-sm text-slate-400">View and control user accounts</p>
              </a>
              <a
                href="/admin/merchants"
                className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Building2 className="h-8 w-8 text-orange mb-2" />
                <h3 className="text-white font-medium mb-1">Manage Merchants</h3>
                <p className="text-sm text-slate-400">Control dealer subscriptions</p>
              </a>
              <a
                href="/admin/reference-data"
                className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Package className="h-8 w-8 text-orange mb-2" />
                <h3 className="text-white font-medium mb-1">Reference Data</h3>
                <p className="text-sm text-slate-400">Manage categories and types</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
