import React, { useState, useEffect } from 'react';
import { webStorage } from '@supplysync/core';
import AdminLayout from '../components/AdminLayout';
import { Search, Filter, CheckCircle, XCircle, Ban } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = webStorage.getItem('admin_token');
      const response = await api.get('/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Ensure response.data is always an array
      const usersData = Array.isArray(response.data) ? response.data : [];
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
      setUsers([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = webStorage.getItem('admin_token');
      await api.put(
        `/admin/users/${userId}/status`,
        { is_active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`User ${!currentStatus ? 'activated' : 'suspended'} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || user.user_type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">User Management</h1>
          <p className="text-slate-400">Manage all user accounts and access control</p>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-600 text-white"
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterType('all')}
                  className={filterType === 'all' ? 'bg-orange' : 'border-slate-600 text-slate-300'}
                >
                  All
                </Button>
                <Button
                  variant={filterType === 'dealer' ? 'default' : 'outline'}
                  onClick={() => setFilterType('dealer')}
                  className={filterType === 'dealer' ? 'bg-orange' : 'border-slate-600 text-slate-300'}
                >
                  Dealers
                </Button>
                <Button
                  variant={filterType === 'subdealer' ? 'default' : 'outline'}
                  onClick={() => setFilterType('subdealer')}
                  className={filterType === 'subdealer' ? 'bg-orange' : 'border-slate-600 text-slate-300'}
                >
                  Sub-dealers
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Users ({filteredUsers.length})</CardTitle>
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
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Username</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Email</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Type</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Joined</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                        <td className="py-3 px-4 text-white">{user.username}</td>
                        <td className="py-3 px-4 text-slate-300">{user.email}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={
                              user.user_type === 'admin'
                                ? 'border-orange text-orange'
                                : user.user_type === 'dealer'
                                ? 'border-blue-500 text-blue-500'
                                : 'border-green-500 text-green-500'
                            }
                          >
                            {user.user_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {user.is_active ? (
                            <div className="flex items-center text-green-500">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Active
                            </div>
                          ) : (
                            <div className="flex items-center text-red-500">
                              <XCircle className="h-4 w-4 mr-1" />
                              Suspended
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          {user.user_type !== 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleUserStatus(user.id, user.is_active)}
                              className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                              {user.is_active ? (
                                <>
                                  <Ban className="h-3 w-3 mr-1" />
                                  Suspend
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                          )}
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

export default AdminUsers;
