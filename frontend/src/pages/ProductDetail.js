import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DealerPageShell from '../components/DealerPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, Trash2, Save, X, Package, Grid3x3, 
  Box, Calendar, History, Plus, FileEdit, ArrowUp, ArrowDown, RefreshCw, ArrowLeft
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import api from '../utils/api';
import ImageUpload from '../components/ImageUpload';
import SectionHeader from '@/components/theme/SectionHeader';
import StatusChip from '@/components/theme/StatusChip';
import AppBreadcrumb from '@/components/theme/AppBreadcrumb';

const ProductDetail = () => {
  const navigate = useNavigate();
  const { subcategoryId, productId } = useParams();
  const { toast } = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canWriteInventory = ['dealer', 'manager'].includes(user.user_type);
  const canDeleteInventory = user.user_type === 'dealer';
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form state
  const [formData, setFormData] = useState({});
  
  // Reference data
  const [surfaceTypes, setSurfaceTypes] = useState([]);
  const [applicationTypes, setApplicationTypes] = useState([]);
  const [bodyTypes, setBodyTypes] = useState([]);
  const [qualities, setQualities] = useState([]);
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Transaction history
  const [showHistory, setShowHistory] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Activity log
  const [activityLog, setActivityLog] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  
  // Product images
  const [images, setImages] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    fetchProduct();
    fetchReferenceData();
    fetchImages();
    fetchRecentTransactions();
  }, [productId]);
  
  const fetchImages = async () => {
    try {
      const response = await api.get(`/dealer/products/${productId}/images`);
      setImages(response.data);
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const response = await api.get(`/dealer/products/${productId}/transactions`);
      setRecentTransactions((response.data?.transactions || []).slice(0, 5));
    } catch (error) {
      setRecentTransactions([]);
    }
  };

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/dealer/products/${productId}`);
      setProduct(response.data.product);
      setFormData(response.data.product);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load product details',
        variant: 'destructive',
      });
      navigate(`/dealer/inventory/${subcategoryId}/products`);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [surfaces, applications, bodies, quals] = await Promise.all([
        api.get('/reference/surface-types'),
        api.get('/reference/application-types'),
        api.get('/reference/body-types'),
        api.get('/reference/qualities'),
      ]);
      setSurfaceTypes(surfaces.data.surface_types);
      setApplicationTypes(applications.data.application_types);
      setBodyTypes(bodies.data.body_types);
      setQualities(quals.data.qualities);
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
    }
  };

  const handleEdit = () => {
    if (!canWriteInventory) {
      toast({
        title: 'Access denied',
        description: 'View-only access for staff accounts',
        variant: 'destructive',
      });
      return;
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData(product); // Reset to original data
  };

  const handleSave = async () => {
    if (!canWriteInventory) {
      return;
    }
    setSaving(true);
    try {
      const updateData = {
        brand: formData.brand,
        name: formData.name,
        sku: formData.sku,
        surface_type_id: formData.surface_type_id,
        application_type_id: formData.application_type_id,
        body_type_id: formData.body_type_id,
        quality_id: formData.quality_id,
        packing_per_box: formData.packing_per_box,
      };
      
      await api.put(`/dealer/products/${productId}`, updateData);
      
      toast({
        title: 'Success',
        description: 'Product updated successfully',
      });
      
      setIsEditing(false);
      fetchProduct(); // Refresh data
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update product',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDeleteInventory) {
      toast({
        title: 'Access denied',
        description: 'Only dealer can delete inventory records',
        variant: 'destructive',
      });
      return;
    }
    setDeleting(true);
    try {
      await api.delete(`/dealer/products/${productId}`);
      
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
      
      navigate(`/dealer/inventory/${subcategoryId}/products`);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete product',
        variant: 'destructive',
      });
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const viewTransactionHistory = async () => {
    setShowHistory(true);
    setLoadingHistory(true);
    setLoadingActivity(true);
    
    try {
      // Fetch both transactions and activity log
      const [transactionsRes, activityRes] = await Promise.all([
        api.get(`/dealer/products/${productId}/transactions`),
        api.get(`/dealer/products/${productId}/activity-log`)
      ]);
      
      setTransactionHistory(transactionsRes.data.transactions);
      setActivityLog(activityRes.data.activities);
    } catch (error) {
      toast({
        title: 'Failed to Load History',
        description: error.response?.data?.detail || 'Could not load history',
        variant: 'destructive',
      });
    } finally {
      setLoadingHistory(false);
      setLoadingActivity(false);
    }
  };

  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case 'created':
        return <Plus className="h-4 w-4" />;
      case 'edited':
        return <FileEdit className="h-4 w-4" />;
      case 'quantity_add':
        return <ArrowUp className="h-4 w-4" />;
      case 'quantity_subtract':
        return <ArrowDown className="h-4 w-4" />;
      case 'deleted':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getActivityColor = (activityType) => {
    switch (activityType) {
      case 'created':
        return 'bg-blue-500';
      case 'edited':
        return 'bg-orange-500';
      case 'quantity_add':
        return 'bg-green-500';
      case 'quantity_subtract':
        return 'bg-red-500';
      case 'deleted':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStockStatus = (qty) => {
    if ((qty || 0) <= 0) return { label: 'Out of Stock', tone: 'danger' };
    if ((qty || 0) < 20) return { label: 'Low Stock', tone: 'warning' };
    return { label: 'In Stock', tone: 'success' };
  };

  const formatDateTimeDDMMYYYY = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day}/${month}/${year} ${time}`;
  };
  const productSizeLabel = product?.size_mm || 'N/A';

  if (loading) {
    return (
      <DealerPageShell>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
          </div>
        </div>
      </DealerPageShell>
    );
  }

  return (
    <DealerPageShell>
        <AppBreadcrumb
          items={[
            { label: 'Home', to: '/dealer/dashboard' },
            { label: 'Inventory', to: '/dealer/inventory' },
            { label: 'Products', to: `/dealer/inventory/${subcategoryId}/products` },
            { label: 'Product Detail', to: `/dealer/inventory/${subcategoryId}/products/${productId}` },
          ]}
        />
        {/* Header and metadata strip keep ProductList rhythm */}
        <div className="mb-5">
          <SectionHeader
            title={(
              <div className="flex items-center gap-2">
                <span>{`${product.brand} - ${product.name}`}</span>
                <StatusChip tone={getStockStatus(product.current_quantity).tone}>
                  {getStockStatus(product.current_quantity).label}
                </StatusChip>
              </div>
            )}
            subtitle={(
              <span className="text-sm text-slate-light">
                {`${product.sub_category_name || 'N/A'} | ${product.surface_type || 'N/A'} | ${productSizeLabel}`}
              </span>
            )}
            actions={!isEditing ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/dealer/inventory/${subcategoryId}/products`)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Products
                </Button>
                {canWriteInventory && (
                  <Button
                    onClick={handleEdit}
                    className="bg-orange hover:bg-orange-dark text-white"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Product
                  </Button>
                )}
                {canDeleteInventory && (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-600 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
            className="mb-2"
          />
        </div>

        {/* Main content only: four operational cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* A) Product Images */}
          <Card className="border-app-border shadow-none">
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="aspect-video rounded-md border border-app-border bg-slate-50 overflow-hidden">
                {images?.[0]?.image_url ? (
                  <img src={images[0].image_url} alt="Primary product" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-slate-light">No image</div>
                )}
              </div>
              {images.length > 1 ? (
                <div className="grid grid-cols-4 gap-2">
                  {images.slice(0, 4).map((img) => (
                    <div key={img.id} className="aspect-square rounded border border-app-border overflow-hidden">
                      <img src={img.image_url} alt="Thumbnail" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
              <ImageUpload
                productId={productId}
                images={images}
                onImagesChange={setImages}
              />
            </CardContent>
          </Card>

          {/* B) Product Information */}
          <Card className="border-app-border shadow-none">
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-slate-light">Name:</span>{' '}
                {isEditing ? (
                  <Input
                    className="mt-1 h-9"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                ) : (
                  <span className="text-slate">{product.name}</span>
                )}
              </div>
              <div>
                <span className="text-slate-light">Brand:</span>{' '}
                {isEditing ? (
                  <Input
                    className="mt-1 h-9"
                    value={formData.brand || ''}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                ) : (
                  <span className="text-slate">{product.brand}</span>
                )}
              </div>
              <div><span className="text-slate-light">Sub-category:</span> <span className="text-slate">{product.sub_category_name}</span></div>
              <div>
                <span className="text-slate-light">Surface:</span>{' '}
                {isEditing ? (
                  <Select
                    value={formData.surface_type_id}
                    onValueChange={(value) => setFormData({ ...formData, surface_type_id: value })}
                  >
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {surfaceTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-slate">{product.surface_type}</span>
                )}
              </div>
              <div>
                <span className="text-slate-light">Body Type:</span>{' '}
                {isEditing ? (
                  <Select
                    value={formData.body_type_id}
                    onValueChange={(value) => setFormData({ ...formData, body_type_id: value })}
                  >
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {bodyTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-slate">{product.body_type}</span>
                )}
              </div>
              <div>
                <span className="text-slate-light">Application:</span>{' '}
                {isEditing ? (
                  <Select
                    value={formData.application_type_id}
                    onValueChange={(value) => setFormData({ ...formData, application_type_id: value })}
                  >
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {applicationTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-slate">{product.application_type}</span>
                )}
              </div>
              <div>
                <span className="text-slate-light">Quality:</span>{' '}
                {isEditing ? (
                  <Select
                    value={formData.quality_id}
                    onValueChange={(value) => setFormData({ ...formData, quality_id: value })}
                  >
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {qualities.map((quality) => (
                        <SelectItem key={quality.id} value={quality.id}>{quality.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-slate">{product.quality}</span>
                )}
              </div>
              <div>
                <span className="text-slate-light">Packing:</span>{' '}
                {isEditing ? (
                  <Input
                    className="mt-1 h-9"
                    type="number"
                    min="1"
                    value={formData.packing_per_box || ''}
                    onChange={(e) => setFormData({ ...formData, packing_per_box: parseInt(e.target.value, 10) || '' })}
                  />
                ) : (
                  <span className="text-slate">{product.packing_per_box} pieces/box</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* C) Stock Overview */}
          <Card className="border-app-border shadow-none">
            <CardHeader>
              <CardTitle>Stock Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-slate">{product.current_quantity}</p>
                <p className="text-sm text-slate-light">boxes in stock</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/dealer/inventory/${subcategoryId}/products`)}
                >
                  + Add Stock
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/dealer/inventory/${subcategoryId}/products`)}
                >
                  - Reduce Stock
                </Button>
              </div>
              <p className="text-xs text-slate-light">
                Uses existing transaction flow from Products list page.
              </p>
            </CardContent>
          </Card>

          {/* D) Recent Stock History */}
          <Card className="border-app-border shadow-none">
            <CardHeader>
              <CardTitle>Recent Stock History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-slate-light">No recent stock history.</p>
              ) : (
                recentTransactions.map((txn) => (
                  <div key={txn.id} className="rounded border border-app-border px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-medium ${
                          txn.transaction_type === 'add' ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {txn.transaction_type === 'add' ? '+' : '-'} {txn.quantity} boxes
                      </span>
                      <span className="text-xs text-slate-light">
                        {formatDateTimeDDMMYYYY(txn.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-light mt-1">By: {txn.created_by || 'Unknown'}</p>
                  </div>
                ))
              )}
              <Button variant="outline" className="w-full" onClick={viewTransactionHistory}>
                <History className="mr-2 h-4 w-4" />
                View Full History
              </Button>
            </CardContent>
          </Card>
        </div>
      

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{product.brand} - {product.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? 'Deleting...' : 'Delete Product'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transaction History & Activity Log Dialog with Tabs */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Product History & Activity</DialogTitle>
            <DialogDescription>
              {product.brand} - {product.name}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="transactions" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions">
                <History className="mr-2 h-4 w-4" />
                Transactions ({transactionHistory.length})
              </TabsTrigger>
              <TabsTrigger value="activity">
                <FileEdit className="mr-2 h-4 w-4" />
                Activity Log ({activityLog.length})
              </TabsTrigger>
            </TabsList>
            
            {/* Transactions Tab */}
            <TabsContent value="transactions" className="flex-1 overflow-y-auto mt-4">
              {loadingHistory ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange mx-auto"></div>
                  <p className="mt-2 text-sm text-slate-light">Loading transactions...</p>
                </div>
              ) : transactionHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-light">
                  <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No transaction history yet</p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {transactionHistory.map((txn) => (
                    <Card key={txn.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={txn.transaction_type === 'add' ? 'default' : 'destructive'}
                                className={txn.transaction_type === 'add' ? 'bg-green-500' : 'bg-red-500'}
                              >
                                {txn.transaction_type === 'add' ? '+' : '-'} {txn.quantity}
                              </Badge>
                              <span className="text-sm text-slate-light">
                                {formatDateTimeDDMMYYYY(txn.created_at)}
                              </span>
                            </div>
                            <div className="mt-2 text-sm">
                              <span className="text-slate-light">Quantity: </span>
                              <span className="font-medium">
                                {txn.quantity_before} → {txn.quantity_after} boxes
                              </span>
                            </div>
                            <div className="text-xs text-slate-light mt-1">
                              By: {txn.created_by}
                            </div>
                            {txn.notes && (
                              <div className="text-xs text-slate-light mt-1 italic">
                                Note: {txn.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            {/* Activity Log Tab */}
            <TabsContent value="activity" className="flex-1 overflow-y-auto mt-4">
              {loadingActivity ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange mx-auto"></div>
                  <p className="mt-2 text-sm text-slate-light">Loading activity log...</p>
                </div>
              ) : activityLog.length === 0 ? (
                <div className="text-center py-8 text-slate-light">
                  <FileEdit className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No activity recorded yet</p>
                  <p className="text-xs mt-2">Activities will appear here when actions are performed</p>
                </div>
              ) : (
                <div className="space-y-3 pr-2">
                  {activityLog.map((activity) => (
                    <Card key={activity.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          {/* Activity Icon */}
                          <div className={`p-2 rounded-full ${getActivityColor(activity.activity_type)} text-white flex-shrink-0`}>
                            {getActivityIcon(activity.activity_type)}
                          </div>
                          
                          {/* Activity Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-slate capitalize">
                                {activity.activity_type.replace('_', ' ')}
                              </h4>
                              <span className="text-xs text-slate-light">
                                {formatDateTimeDDMMYYYY(activity.created_at)}
                              </span>
                            </div>
                            
                            <p className="text-sm text-slate-light mt-1">
                              {activity.description}
                            </p>
                            
                            {/* Show detailed changes for edits */}
                            {activity.activity_type === 'edited' && activity.changes?.fields_changed && (
                              <div className="mt-2 space-y-1 bg-orange-50 p-2 rounded text-xs">
                                <p className="font-medium text-orange-700">Changes made:</p>
                                {activity.changes.fields_changed.map((change, idx) => (
                                  <div key={idx} className="text-slate">
                                    <span className="font-medium capitalize">{change.field.replace('_', ' ')}:</span>{' '}
                                    <span className="line-through text-slate-light">{change.old_value}</span>
                                    {' → '}
                                    <span className="font-medium">{change.new_value}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Show quantity change details */}
                            {(activity.activity_type === 'quantity_add' || activity.activity_type === 'quantity_subtract') && activity.changes && (
                              <div className="mt-1 text-xs">
                                <Badge variant="outline" className="text-xs">
                                  {activity.changes.from} → {activity.changes.to} boxes
                                </Badge>
                              </div>
                            )}
                            
                            <div className="text-xs text-slate-light mt-1">
                              By: {activity.created_by}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            {/* Images Tab */}
            <TabsContent value="images" className="flex-1 overflow-y-auto mt-4">
              <ImageUpload 
                productId={productId} 
                images={images}
                onImagesChange={setImages}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </DealerPageShell>
  );
};

export default ProductDetail;
