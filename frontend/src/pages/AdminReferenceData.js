import React, { useState, useEffect, useRef } from 'react';
import { webStorage } from '@supplysync/core';
import AdminLayout from '../components/AdminLayout';
import { Database, Plus, Trash2, Package, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [summary, setSummary] = useState({
    body_types: 0,
    make_types: 0,
    surface_types: 0,
    application_types: 0,
    quality_types: 0,
    sizes: 0
  });
  const [selectedType, setSelectedType] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const summaryRequestId = useRef(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [tempEditMode, setTempEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedBodyType, setSelectedBodyType] = useState('');
  const [bodyTypes, setBodyTypes] = useState([]);
  const [applicationTypes, setApplicationTypes] = useState([]);
  
  // Size-specific state
  const [sizeForm, setSizeForm] = useState({
    widthInches: '',
    widthMm: '',
    heightInches: '',
    heightMm: '',
    packagingPerBox: '',
    applicationTypeId: '',
    bodyTypeId: ''
  });
  const [editForm, setEditForm] = useState({
    name: '',
    displayOrder: '0',
    bodyTypeId: '',
    widthInches: '',
    widthMm: '',
    heightInches: '',
    heightMm: '',
    packagingPerBox: '',
    applicationTypeId: '',
  });

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
    fetchBodyTypes();
    fetchApplicationTypes();
  }, []);

  useEffect(() => {
    if (selectedType) {
      setItems([]); // clear previous type's data so we don't show body types when clicking Sizes
      fetchItems(selectedType);
    }
  }, [selectedType]);

  const fetchSummary = async () => {
    summaryRequestId.current += 1;
    const myId = summaryRequestId.current;
    try {
      const token = webStorage.getItem('admin_token');
      const response = await api.get('/admin/reference-data/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (myId !== summaryRequestId.current) return;
      setSummary(response.data ?? {});
      setLoading(false);
    } catch (error) {
      if (myId !== summaryRequestId.current) return;
      console.error('Failed to fetch summary:', error);
      toast.error('Failed to load reference data summary');
      setSummary(prev => prev ?? {});
      setLoading(false);
    }
  };

  const fetchBodyTypes = async () => {
    try {
      const token = webStorage.getItem('admin_token');
      const response = await api.get('/admin/reference-data/body_types', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBodyTypes(response.data);
    } catch (error) {
      console.error('Failed to fetch body types:', error);
    }
  };

  const fetchApplicationTypes = async () => {
    try {
      const token = webStorage.getItem('admin_token');
      const response = await api.get('/admin/reference-data/application_types', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplicationTypes(response.data);
    } catch (error) {
      console.error('Failed to fetch application types:', error);
    }
  };

  const fetchItems = async (dataType) => {
    try {
      const token = webStorage.getItem('admin_token');
      const endpoint = dataType === 'sizes' 
        ? '/admin/reference-data/sizes/detailed'
        : `/admin/reference-data/${dataType}`;
      
      const response = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = Array.isArray(response.data) ? response.data : [];
      setItems(list);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      toast.error('Failed to load items');
      setItems([]); // Set empty array on error
    }
  };

  const createItem = async () => {
    // Handle sizes separately
    if (selectedType === 'sizes') {
      return createSize();
    }
    
    // Regular handling for other types
    if (!newItemName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    if (selectedType === 'make_types' && !selectedBodyType) {
      toast.error('Please select a body type');
      return;
    }

    try {
      const token = webStorage.getItem('admin_token');
      const payload = { name: newItemName, display_order: 0 };
      
      if (selectedType === 'make_types') {
        payload.body_type_id = selectedBodyType;
      }
      
      await api.post(`/admin/reference-data/${selectedType}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Item created successfully');
      setNewItemName('');
      setSelectedBodyType('');
      setIsDialogOpen(false);
      setSummary(prev => ({ ...(prev || {}), [selectedType]: (prev?.[selectedType] ?? 0) + 1 }));
      await fetchItems(selectedType);
      await fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create item');
    }
  };

  const createSize = async () => {
    // Check if all fields are filled
    if (!sizeForm.widthInches || !sizeForm.widthMm || !sizeForm.heightInches || 
        !sizeForm.heightMm || !sizeForm.packagingPerBox || 
        !sizeForm.applicationTypeId || !sizeForm.bodyTypeId) {
      toast.error('All fields are required');
      return;
    }

    // Parse numeric values
    const widthInches = Number(sizeForm.widthInches);
    const widthMm = Number(sizeForm.widthMm);
    const heightInches = Number(sizeForm.heightInches);
    const heightMm = Number(sizeForm.heightMm);
    const packagingPerBox = Number(sizeForm.packagingPerBox);

    // Validate numeric values
    if (isNaN(widthInches) || isNaN(widthMm) || isNaN(heightInches) || isNaN(heightMm) || isNaN(packagingPerBox)) {
      toast.error('Please enter valid numbers for all fields');
      return;
    }

    // Check for positive values
    if (widthInches <= 0) {
      toast.error('Width (inches) must be greater than 0');
      return;
    }
    if (widthMm <= 0) {
      toast.error('Width (mm) must be greater than 0');
      return;
    }
    if (heightInches <= 0) {
      toast.error('Height (inches) must be greater than 0');
      return;
    }
    if (heightMm <= 0) {
      toast.error('Height (mm) must be greater than 0');
      return;
    }
    if (packagingPerBox <= 0) {
      toast.error('Number of pieces per box must be greater than 0');
      return;
    }

    try {
      const token = webStorage.getItem('admin_token');
      await api.post('/admin/reference-data/sizes/create', {
        width_inches: Math.floor(widthInches),
        width_mm: Math.floor(widthMm),
        height_inches: Math.floor(heightInches),
        height_mm: Math.floor(heightMm),
        default_packaging_per_box: Math.floor(packagingPerBox),
        application_type_id: sizeForm.applicationTypeId,
        body_type_id: sizeForm.bodyTypeId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Size created successfully');
      setSizeForm({
        widthInches: '', widthMm: '', heightInches: '', heightMm: '',
        packagingPerBox: '', applicationTypeId: '', bodyTypeId: ''
      });
      setIsDialogOpen(false);
      setSummary(prev => ({ ...(prev || {}), sizes: (prev?.sizes ?? 0) + 1 }));
      await fetchItems('sizes');
      await fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create size');
    }
  };

  const deleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to deactivate this item?')) return;

    try {
      const token = webStorage.getItem('admin_token');
      await api.delete(`/admin/reference-data/${selectedType}/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Item deactivated successfully');
      setSummary(prev => ({ ...(prev || {}), [selectedType]: Math.max(0, (prev?.[selectedType] ?? 0) - 1) }));
      await fetchItems(selectedType);
      await fetchSummary();
    } catch (error) {
      toast.error('Failed to deactivate item');
    }
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    if (selectedType === 'sizes') {
      setEditForm({
        name: item.name || '',
        displayOrder: String(item.display_order ?? 0),
        bodyTypeId: item.body_type_id || '',
        widthInches: String(item.width_inches ?? ''),
        widthMm: String(item.width_mm ?? ''),
        heightInches: String(item.height_inches ?? ''),
        heightMm: String(item.height_mm ?? ''),
        packagingPerBox: String(item.default_packaging_per_box ?? ''),
        applicationTypeId: item.application_type_id || '',
      });
    } else {
      setEditForm({
        name: item.name || '',
        displayOrder: String(item.display_order ?? 0),
        bodyTypeId: item.body_type_id || '',
        widthInches: '',
        widthMm: '',
        heightInches: '',
        heightMm: '',
        packagingPerBox: '',
        applicationTypeId: '',
      });
    }
    setIsEditDialogOpen(true);
  };

  const updateItem = async () => {
    if (!editingItem) return;

    try {
      const token = webStorage.getItem('admin_token');
      const payload = {
        display_order: Number(editForm.displayOrder || 0),
      };

      if (selectedType === 'sizes') {
        const widthInches = Number(editForm.widthInches);
        const widthMm = Number(editForm.widthMm);
        const heightInches = Number(editForm.heightInches);
        const heightMm = Number(editForm.heightMm);
        const packagingPerBox = Number(editForm.packagingPerBox);

        if (
          [widthInches, widthMm, heightInches, heightMm, packagingPerBox].some(
            (n) => Number.isNaN(n) || n <= 0
          )
        ) {
          toast.error('All size values must be valid numbers greater than 0');
          return;
        }
        if (!editForm.applicationTypeId || !editForm.bodyTypeId) {
          toast.error('Application Type and Body Type are required');
          return;
        }

        payload.width_inches = widthInches;
        payload.width_mm = widthMm;
        payload.height_inches = heightInches;
        payload.height_mm = heightMm;
        payload.default_packaging_per_box = packagingPerBox;
        payload.application_type_id = editForm.applicationTypeId;
        payload.body_type_id = editForm.bodyTypeId;
      } else {
        if (!editForm.name.trim()) {
          toast.error('Name is required');
          return;
        }
        payload.name = editForm.name.trim();
        if (selectedType === 'make_types' && editForm.bodyTypeId) {
          payload.body_type_id = editForm.bodyTypeId;
        }
      }

      await api.put(`/admin/reference-data/${selectedType}/${editingItem.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Item updated successfully');
      setIsEditDialogOpen(false);
      setEditingItem(null);
      fetchItems(selectedType);
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update item');
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant={tempEditMode ? 'destructive' : 'outline'}
                        onClick={() => setTempEditMode((prev) => !prev)}
                      >
                        {tempEditMode ? 'Disable Temp Edit' : 'Enable Temp Edit'}
                      </Button>
                      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-orange hover:bg-orange-dark">
                            <Plus className="h-4 w-4 mr-2" />
                            Add New
                          </Button>
                        </DialogTrigger>
                      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-white">
                            Add New {dataTypes.find(t => t.key === selectedType)?.label.slice(0, -1)}
                          </DialogTitle>
                          <DialogDescription className="text-slate-400">
                            {selectedType === 'sizes' ? 'Enter all size parameters (all fields required)' : 'Enter the name for the new item'}
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedType === 'sizes' ? (
                          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-slate-200">Width (Inches) *</Label>
                                <Input type="number" min="1" placeholder="24" value={sizeForm.widthInches}
                                  onChange={(e) => setSizeForm({...sizeForm, widthInches: e.target.value})}
                                  className="bg-slate-900 border-slate-600 text-white" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-slate-200">Width (MM) *</Label>
                                <Input type="number" min="1" placeholder="600" value={sizeForm.widthMm}
                                  onChange={(e) => setSizeForm({...sizeForm, widthMm: e.target.value})}
                                  className="bg-slate-900 border-slate-600 text-white" />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-slate-200">Height (Inches) *</Label>
                                <Input type="number" min="1" placeholder="48" value={sizeForm.heightInches}
                                  onChange={(e) => setSizeForm({...sizeForm, heightInches: e.target.value})}
                                  className="bg-slate-900 border-slate-600 text-white" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-slate-200">Height (MM) *</Label>
                                <Input type="number" min="1" placeholder="1200" value={sizeForm.heightMm}
                                  onChange={(e) => setSizeForm({...sizeForm, heightMm: e.target.value})}
                                  className="bg-slate-900 border-slate-600 text-white" />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-slate-200">Default Packaging Per Box *</Label>
                              <Input type="number" min="1" placeholder="4" value={sizeForm.packagingPerBox}
                                onChange={(e) => setSizeForm({...sizeForm, packagingPerBox: e.target.value})}
                                className="bg-slate-900 border-slate-600 text-white" />
                              <p className="text-xs text-slate-400">Must be a positive number</p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-slate-200">Application Type *</Label>
                              <Select value={sizeForm.applicationTypeId}
                                onValueChange={(value) => setSizeForm({...sizeForm, applicationTypeId: value})}>
                                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                  <SelectValue placeholder="Select application type..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                  {applicationTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.id} className="text-white">{type.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-slate-200">Body Type *</Label>
                              <Select value={sizeForm.bodyTypeId}
                                onValueChange={(value) => setSizeForm({...sizeForm, bodyTypeId: value})}>
                                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                  <SelectValue placeholder="Select body type..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                  {bodyTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.id} className="text-white">{type.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <Button onClick={createItem} className="w-full bg-orange hover:bg-orange-dark">
                              Create Size
                            </Button>
                          </div>
                        ) : (
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-200">
                              Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="name"
                              placeholder="Enter name..."
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              className="bg-slate-900 border-slate-600 text-white"
                              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && createItem()}
                              required
                            />
                          </div>
                          
                          {/* Show Body Type selector only for Make Types */}
                          {selectedType === 'make_types' && (
                            <div className="space-y-2">
                              <Label htmlFor="body_type" className="text-slate-200">
                                Body Type <span className="text-red-500">*</span>
                              </Label>
                              <Select
                                value={selectedBodyType}
                                onValueChange={setSelectedBodyType}
                                required
                              >
                                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                                  <SelectValue placeholder="Select body type..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                  {bodyTypes.map((bodyType) => (
                                    <SelectItem 
                                      key={bodyType.id} 
                                      value={bodyType.id}
                                      className="text-white"
                                    >
                                      {bodyType.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          <Button onClick={createItem} className="w-full bg-orange hover:bg-orange-dark">
                            Create
                          </Button>
                        </div>
                        )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  {tempEditMode && (
                    <p className="text-xs text-amber-300 mt-2">
                      Temporary edit mode is ON. Changes here affect live reference data.
                    </p>
                  )}
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
                            <div className="flex-1">
                              <span className="text-white font-medium">{item.name}</span>
                              {selectedType === 'make_types' && item.body_type_name && (
                                <div className="text-xs text-slate-400 mt-1">
                                  Body Type: {item.body_type_name}
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(item)}
                              className={`text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 ml-2 ${tempEditMode ? '' : 'hidden'}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteItem(item.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-2"
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
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">Edit {dataTypes.find(t => t.key === selectedType)?.label?.slice(0, -1)}</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Temporary admin edit mode for reference data.
                  </DialogDescription>
                </DialogHeader>
                {selectedType === 'sizes' ? (
                  <div className="space-y-4 py-2 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-200">Width (Inches)</Label>
                        <Input type="number" min="1" value={editForm.widthInches} onChange={(e) => setEditForm({ ...editForm, widthInches: e.target.value })} className="bg-slate-900 border-slate-600 text-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">Width (MM)</Label>
                        <Input type="number" min="1" value={editForm.widthMm} onChange={(e) => setEditForm({ ...editForm, widthMm: e.target.value })} className="bg-slate-900 border-slate-600 text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-200">Height (Inches)</Label>
                        <Input type="number" min="1" value={editForm.heightInches} onChange={(e) => setEditForm({ ...editForm, heightInches: e.target.value })} className="bg-slate-900 border-slate-600 text-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">Height (MM)</Label>
                        <Input type="number" min="1" value={editForm.heightMm} onChange={(e) => setEditForm({ ...editForm, heightMm: e.target.value })} className="bg-slate-900 border-slate-600 text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-200">Packaging Per Box</Label>
                        <Input type="number" min="1" value={editForm.packagingPerBox} onChange={(e) => setEditForm({ ...editForm, packagingPerBox: e.target.value })} className="bg-slate-900 border-slate-600 text-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">Display Order</Label>
                        <Input type="number" value={editForm.displayOrder} onChange={(e) => setEditForm({ ...editForm, displayOrder: e.target.value })} className="bg-slate-900 border-slate-600 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-200">Application Type</Label>
                      <Select value={editForm.applicationTypeId} onValueChange={(value) => setEditForm({ ...editForm, applicationTypeId: value })}>
                        <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                          <SelectValue placeholder="Select application type..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {applicationTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id} className="text-white">{type.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-200">Body Type</Label>
                      <Select value={editForm.bodyTypeId} onValueChange={(value) => setEditForm({ ...editForm, bodyTypeId: value })}>
                        <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                          <SelectValue placeholder="Select body type..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {bodyTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id} className="text-white">{type.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={updateItem} className="w-full bg-orange hover:bg-orange-dark">Save Changes</Button>
                  </div>
                ) : (
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label className="text-slate-200">Name</Label>
                      <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-slate-900 border-slate-600 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-200">Display Order</Label>
                      <Input type="number" value={editForm.displayOrder} onChange={(e) => setEditForm({ ...editForm, displayOrder: e.target.value })} className="bg-slate-900 border-slate-600 text-white" />
                    </div>
                    {selectedType === 'make_types' && (
                      <div className="space-y-2">
                        <Label className="text-slate-200">Body Type</Label>
                        <Select value={editForm.bodyTypeId} onValueChange={(value) => setEditForm({ ...editForm, bodyTypeId: value })}>
                          <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                            <SelectValue placeholder="Select body type..." />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {bodyTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id} className="text-white">{type.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button onClick={updateItem} className="w-full bg-orange hover:bg-orange-dark">Save Changes</Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReferenceData;
