import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DealerNav from '../components/DealerNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Edit, Trash2, Save, X, Package, Grid3x3, 
  Box, Calendar, History
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const ProductDetail = () => {
  const navigate = useNavigate();
  const { subcategoryId, productId } = useParams();
  const { toast } = useToast();
  
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

  useEffect(() => {
    fetchProduct();
    fetchReferenceData();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/api/dealer/products/${productId}`);
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
        api.get('/api/reference/surface-types'),
        api.get('/api/reference/application-types'),
        api.get('/api/reference/body-types'),
        api.get('/api/reference/qualities'),
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
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData(product); // Reset to original data
  };

  const handleSave = async () => {
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
      
      await api.put(`/api/dealer/products/${productId}`, updateData);
      
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
    setDeleting(true);
    try {
      await api.delete(`/api/dealer/products/${productId}`);
      
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
    try {
      const response = await api.get(`/api/dealer/products/${productId}/transactions`);
      setTransactionHistory(response.data.transactions);
    } catch (error) {
      toast({
        title: 'Failed to Load History',
        description: error.response?.data?.detail || 'Could not load transaction history',
        variant: 'destructive',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DealerNav />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DealerNav />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/dealer/inventory/${subcategoryId}/products`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-slate">
                {product.brand} - {product.name}
              </h1>
              <p className="text-slate-light mt-1">Product Details</p>
            </div>
            
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={viewTransactionHistory}
                  >
                    <History className="mr-2 h-4 w-4" />
                    History
                  </Button>
                  <Button
                    onClick={handleEdit}
                    className="bg-orange hover:bg-orange-dark text-white"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-600 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Product Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Brand & Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate mb-2 block">
                    Brand
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="Enter brand name"
                    />
                  ) : (
                    <p className="text-lg text-slate">{product.brand}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate mb-2 block">
                    Product Name
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter product name"
                    />
                  ) : (
                    <p className="text-lg text-slate">{product.name}</p>
                  )}
                </div>
              </div>

              {/* SKU */}
              <div>
                <label className="text-sm font-medium text-slate mb-2 block">
                  SKU Code (Optional)
                </label>
                {isEditing ? (
                  <Input
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Enter SKU code"
                  />
                ) : (
                  <p className="text-lg text-slate">{product.sku || 'Not set'}</p>
                )}
              </div>

              {/* Attributes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Surface Type */}
                <div>
                  <label className="text-sm font-medium text-slate mb-2 block">
                    Surface Type
                  </label>
                  {isEditing ? (
                    <Select
                      value={formData.surface_type_id}
                      onValueChange={(value) => setFormData({ ...formData, surface_type_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {surfaceTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="border-orange text-orange">
                      {product.surface_type}
                    </Badge>
                  )}
                </div>

                {/* Application Type */}
                <div>
                  <label className="text-sm font-medium text-slate mb-2 block">
                    Application
                  </label>
                  {isEditing ? (
                    <Select
                      value={formData.application_type_id}
                      onValueChange={(value) => setFormData({ ...formData, application_type_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {applicationTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">{product.application_type}</Badge>
                  )}
                </div>

                {/* Body Type */}
                <div>
                  <label className="text-sm font-medium text-slate mb-2 block">
                    Body Type
                  </label>
                  {isEditing ? (
                    <Select
                      value={formData.body_type_id}
                      onValueChange={(value) => setFormData({ ...formData, body_type_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {bodyTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">{product.body_type}</Badge>
                  )}
                </div>

                {/* Quality */}
                <div>
                  <label className="text-sm font-medium text-slate mb-2 block">
                    Quality
                  </label>
                  {isEditing ? (
                    <Select
                      value={formData.quality_id}
                      onValueChange={(value) => setFormData({ ...formData, quality_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {qualities.map((quality) => (
                          <SelectItem key={quality.id} value={quality.id}>
                            {quality.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">{product.quality}</Badge>
                  )}
                </div>
              </div>

              {/* Packing */}
              <div>
                <label className="text-sm font-medium text-slate mb-2 block">
                  Packing (pieces per box)
                </label>
                {isEditing ? (
                  <Input
                    type="number"
                    min="1"
                    value={formData.packing_per_box}
                    onChange={(e) => setFormData({ ...formData, packing_per_box: parseInt(e.target.value) })}
                  />
                ) : (
                  <p className="text-lg text-slate">{product.packing_per_box} pieces/box</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar - Stock & Metadata */}
          <div className="space-y-6">
            {/* Stock Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-orange" />
                  <span>Current Stock</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate">
                    {product.current_quantity}
                  </div>
                  <div className="text-sm text-slate-light mt-1">boxes</div>
                  <p className="text-xs text-slate-light mt-2">
                    Use transaction buttons to add/subtract
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Category Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Grid3x3 className="h-5 w-5 text-orange" />
                  <span>Category</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-light mb-1">Sub-Category</p>
                <p className="text-lg font-medium text-slate">{product.sub_category_name}</p>
              </CardContent>
            </Card>

            {/* Metadata Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-orange" />
                  <span>Metadata</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-slate-light">Created</p>
                  <p className="text-sm text-slate">
                    {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-light">Last Updated</p>
                  <p className="text-sm text-slate">
                    {product.updated_at ? new Date(product.updated_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-light">Product ID</p>
                  <p className="text-xs font-mono text-slate break-all">{product.id.substring(0, 16)}...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{product.brand} - {product.name}</strong>?
              <br /><br />
              This will mark the product as inactive. Transaction history will be preserved.
              This action can be reversed by administrators.
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

      {/* Transaction History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
            <DialogDescription>
              {product.brand} - {product.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            {loadingHistory ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange mx-auto"></div>
                <p className="mt-2 text-sm text-slate-light">Loading history...</p>
              </div>
            ) : transactionHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-light">
                <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No transaction history yet</p>
              </div>
            ) : (
              <div className="space-y-2">
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
                              {new Date(txn.created_at).toLocaleString()}
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetail;
