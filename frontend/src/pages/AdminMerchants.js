import React, { useState, useEffect } from 'react';
import { webStorage } from '@supplysync/core';
import AdminLayout from '../components/AdminLayout';
import { Search, Building2, MapPin, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AdminMerchants = () => {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      const token = webStorage.getItem('admin_token');
      const response = await api.get('/admin/merchants', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Ensure response.data is always an array
      const merchantsData = Array.isArray(response.data) ? response.data : [];
      setMerchants(merchantsData);
    } catch (error) {
      console.error('Failed to fetch merchants:', error);
      toast.error('Failed to load merchants');
      setMerchants([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const updateMerchantStatus = async (merchantId, isActive, subscriptionStatus) => {
    try {
      const token = webStorage.getItem('admin_token');
      await api.put(
        `/admin/merchants/${merchantId}/status`,
        { 
          is_active: isActive,
          subscription_status: subscriptionStatus 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Merchant status updated successfully');
      fetchMerchants();
    } catch (error) {
      toast.error('Failed to update merchant status');
    }
  };

  const getSubscriptionBadge = (status) => {
    const badges = {
      active: { color: 'border-green-500 text-green-500', label: 'Active', icon: CheckCircle },
      trial: { color: 'border-yellow-500 text-yellow-500', label: 'Trial', icon: Clock },
      expired: { color: 'border-red-500 text-red-500', label: 'Expired', icon: XCircle },
      suspended: { color: 'border-gray-500 text-gray-500', label: 'Suspended', icon: AlertCircle },
    };
    
    const badge = badges[status] || badges.trial;
    const Icon = badge.icon;
    
    return (
      <div className={`flex items-center ${badge.color.split(' ')[1]}`}>
        <Icon className="h-4 w-4 mr-1" />
        <span>{badge.label}</span>
      </div>
    );
  };

  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch = 
      merchant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (merchant.email && merchant.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (merchant.city && merchant.city.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterStatus === 'all' || merchant.subscription_status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Merchant Management</h1>
          <p className="text-slate-400">Manage dealer businesses and subscriptions</p>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by business name, email, or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-600 text-white"
                />
              </div>

              {/* Filter by subscription status */}
              <div className="flex space-x-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('all')}
                  className={filterStatus === 'all' ? 'bg-orange' : 'border-slate-600 text-slate-300'}
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === 'active' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('active')}
                  className={filterStatus === 'active' ? 'bg-orange' : 'border-slate-600 text-slate-300'}
                >
                  Active
                </Button>
                <Button
                  variant={filterStatus === 'trial' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('trial')}
                  className={filterStatus === 'trial' ? 'bg-orange' : 'border-slate-600 text-slate-300'}
                >
                  Trial
                </Button>
                <Button
                  variant={filterStatus === 'expired' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('expired')}
                  className={filterStatus === 'expired' ? 'bg-orange' : 'border-slate-600 text-slate-300'}
                >
                  Expired
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Merchants Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Merchants ({filteredMerchants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Business Name</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Contact</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Location</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Subscription</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMerchants.map((merchant) => (
                      <tr key={merchant.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <Building2 className="h-5 w-5 text-orange mr-2" />
                            <div>
                              <div className="text-white font-medium">{merchant.name}</div>
                              <div className="text-xs text-slate-400">
                                Joined {new Date(merchant.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-300 text-sm">
                            {merchant.email && <div>{merchant.email}</div>}
                            {merchant.phone && <div className="text-slate-400">{merchant.phone}</div>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center text-slate-300">
                            <MapPin className="h-4 w-4 mr-1 text-slate-400" />
                            <span>
                              {merchant.city && merchant.state 
                                ? `${merchant.city}, ${merchant.state}`
                                : merchant.city || merchant.state || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getSubscriptionBadge(merchant.subscription_status || 'trial')}
                        </td>
                        <td className="py-3 px-4">
                          {merchant.is_active ? (
                            <Badge variant="outline" className="border-green-500 text-green-500">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-500 text-red-500">
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Select
                              onValueChange={(value) => updateMerchantStatus(merchant.id, merchant.is_active, value)}
                              defaultValue={merchant.subscription_status || 'trial'}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs bg-slate-900 border-slate-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="trial" className="text-white">Trial</SelectItem>
                                <SelectItem value="active" className="text-white">Active</SelectItem>
                                <SelectItem value="expired" className="text-white">Expired</SelectItem>
                                <SelectItem value="suspended" className="text-white">Suspended</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMerchantStatus(
                                merchant.id, 
                                !merchant.is_active, 
                                merchant.subscription_status
                              )}
                              className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8"
                            >
                              {merchant.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
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
    </AdminLayout>
  );
};

export default AdminMerchants;
