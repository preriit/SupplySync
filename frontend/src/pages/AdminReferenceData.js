import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Database, Plus, Trash2, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AdminReferenceData = () => {
  const [summary, setSummary] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const dataTypes = [
    { key: 'body_types', label: 'Body Types', icon: Package, color: 'bg-blue-500' },
    { key: 'make_types', label: 'Make Types', icon: Package, color: 'bg-green-500' },
    { key: 'surface_types', label: 'Surface Types', icon: Package, color: 'bg-purple-500' },
    { key: 'application_types', label: 'Application Types', icon: Package, color: 'bg-orange' },
    { key: 'quality_types', label: 'Quality Types', icon: Package, color: 'bg-pink-500' },
    { key: 'sizes', label: 'Sizes', icon: Package, color: 'bg-indigo-500' },
  ];

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (selectedType) {
      fetchItems(selectedType);
    }
  }, [selectedType]);

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await api.get('/admin/reference-data/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      toast.error('Failed to load reference data summary');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (dataType) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await api.get(`/admin/reference-data/${dataType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(response.data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      toast.error('Failed to load items');
    }
  };

  const createItem = async () => {
    if (!newItemName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      await api.post(
        `/admin/reference-data/${selectedType}`,
        { name: newItemName, display_order: 0 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Item created successfully');
      setNewItemName('');
      setIsDialogOpen(false);
      fetchItems(selectedType);
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create item');
    }
  };

  const deleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to deactivate this item?')) return;

    try {
      const token = localStorage.getItem('admin_token');
      await api.delete(`/admin/reference-data/${selectedType}/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Item deactivated successfully');
      fetchItems(selectedType);
      fetchSummary();
    } catch (error) {
      toast.error('Failed to deactivate item');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Reference Data Management</h1>
          <p className="text-slate-400">Manage product categories, types, and attributes</p>
        </div>

        {/* Summary Cards */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange mx-auto"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataTypes.map((type) => {
                const Icon = type.icon;
                const count = summary?.[type.key] || 0;
                
                return (
                  <Card
                    key={type.key}
                    className={`bg-slate-800 border-slate-700 cursor-pointer transition-all hover:scale-105 ${
                      selectedType === type.key ? 'ring-2 ring-orange' : ''
                    }`}
                    onClick={() => setSelectedType(type.key)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-slate-200">
                        {type.label}
                      </CardTitle>
                      <div className={`${type.color} p-2 rounded-lg`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{count}</div>
                      <p className="text-xs text-slate-400 mt-1">
                        Click to manage
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Selected Type Management */}
            {selectedType && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">
                        {dataTypes.find(t => t.key === selectedType)?.label}
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Manage {dataTypes.find(t => t.key === selectedType)?.label.toLowerCase()}
                      </CardDescription>
                    </div>
                    
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-orange hover:bg-orange-dark">
                          <Plus className="h-4 w-4 mr-2" />
                          Add New
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-slate-800 border-slate-700">
                        <DialogHeader>
                          <DialogTitle className="text-white">
                            Add New {dataTypes.find(t => t.key === selectedType)?.label.slice(0, -1)}
                          </DialogTitle>
                          <DialogDescription className="text-slate-400">
                            Enter the name for the new item
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-200">Name</Label>
                            <Input
                              id="name"
                              placeholder="Enter name..."
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              className="bg-slate-900 border-slate-600 text-white"
                              onKeyPress={(e) => e.key === 'Enter' && createItem()}
                            />
                          </div>
                          <Button onClick={createItem} className="w-full bg-orange hover:bg-orange-dark">
                            Create
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        No items found. Click "Add New" to create one.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700"
                          >
                            <span className="text-white">{item.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteItem(item.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReferenceData;
