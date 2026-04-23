import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import DealerNav from '../components/DealerNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Package, Edit, Trash2, Eye, ArrowLeft, Grid3x3, Box, Minus, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import api from '../utils/api';

const ProductsList = () => {
  const { t } = useTranslation(['inventory', 'common']);
  const navigate = useNavigate();
  const { subcategoryId } = useParams();
  const { toast } = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canWriteInventory = ['dealer', 'manager'].includes(user.user_type);
  const [subcategory, setSubcategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Transaction state
  const [transactionProduct, setTransactionProduct] = useState(null);
  const [transactionQuantity, setTransactionQuantity] = useState('');
  const [transactionError, setTransactionError] = useState('');
  const [showNegativeConfirm, setShowNegativeConfirm] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [transacting, setTransacting] = useState(false);
  
  // Transaction history state
  const [historyProduct, setHistoryProduct] = useState(null);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [subcategoryId]);

  const fetchProducts = async () => {
    try {
      const response = await api.get(`/dealer/subcategories/${subcategoryId}/products`);
      setSubcategory(response.data.subcategory);
      setProducts(response.data.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    navigate(`/dealer/inventory/${subcategoryId}/products/add`);
  };

  const handleTransaction = async (product, type) => {
    // Clear previous error
    setTransactionError('');
    
    const qty = parseInt(transactionQuantity);
    
    // Validate integer - reject decimals
    if (!transactionQuantity || transactionQuantity.trim() === '') {
      setTransactionError('Please enter a quantity');
      return;
    }
    
    // Check if it's a valid integer (reject decimals like 5.5)
    const floatValue = parseFloat(transactionQuantity);
    const intValue = parseInt(transactionQuantity);
    
    if (isNaN(floatValue)) {
      setTransactionError('Please enter a valid number');
      return;
    }
    
    if (floatValue !== intValue) {
      setTransactionError('Decimals not allowed. Please enter a whole number');
      return;
    }
    
    if (qty <= 0) {
      setTransactionError('Quantity must be greater than 0');
      return;
    }
    
    if (!Number.isInteger(qty)) {
      setTransactionError('Please enter a valid whole number');
      return;
    }
    
    // Check for negative result
    if (type === 'subtract') {
      const newQuantity = product.current_quantity - qty;
      if (newQuantity < 0) {
        // Show confirmation dialog
        setPendingTransaction({ product, type, quantity: qty, newQuantity });
        setShowNegativeConfirm(true);
        return;
      }
    }
    
    // Execute transaction
    await executeTransaction(product, type, qty);
  };

  const executeTransaction = async (product, type, qty) => {
    setTransacting(true);
    try {
      const response = await api.post(`/dealer/products/${product.id}/transactions`, {
        transaction_type: type,
        quantity: qty
      });
      
      // Update product quantity in state
      const updatedProducts = products.map(p => 
        p.id === product.id 
          ? { ...p, current_quantity: response.data.product.current_quantity }
          : p
      );
      setProducts(updatedProducts);
      
      toast({
        title: 'Transaction Successful',
        description: `${type === 'add' ? 'Added' : 'Subtracted'} ${qty} boxes`,
      });
      
      // Close dialog and reset
      setTransactionProduct(null);
      setTransactionQuantity('');
      setTransactionError('');
      setShowNegativeConfirm(false);
      setPendingTransaction(null);
    } catch (error) {
      toast({
        title: 'Transaction Failed',
        description: error.response?.data?.detail || 'Failed to process transaction',
        variant: 'destructive',
      });
    } finally {
      setTransacting(false);
    }
  };

  const handleNegativeConfirm = async () => {
    if (pendingTransaction) {
      await executeTransaction(
        pendingTransaction.product,
        pendingTransaction.type,
        pendingTransaction.quantity
      );
    }
  };

  const viewTransactionHistory = async (product) => {
    setHistoryProduct(product);
    setLoadingHistory(true);
    try {
      const response = await api.get(`/dealer/products/${product.id}/transactions`);
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

  return (
    <div className="min-h-screen bg-grey-50">
      <DealerNav />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/dealer/inventory')}
          className="mb-6 text-orange hover:text-orange-dark"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Categories
        </Button>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange mx-auto"></div>
            <p className="mt-4 text-slate-light">{t('common:loading')}</p>
          </div>
        ) : (
          <>
            {/* Sub-Category Info Card */}
            {subcategory && (
              <Card className="mb-6 bg-gradient-to-r from-orange-50 to-white border-orange">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-orange rounded-lg flex items-center justify-center">
                        <Grid3x3 className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-display font-bold text-slate">
                          {subcategory.name}
                        </h2>
                        <p className="text-slate-light">
                          {subcategory.size_mm} • {subcategory.make_type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-display font-bold text-orange">
                        {products.length}
                      </p>
                      <p className="text-sm text-slate-light">Products</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-display font-bold text-slate">
                  Products
                </h1>
                {canWriteInventory && (
                  <Button
                    onClick={handleAddProduct}
                    className="bg-orange hover:bg-orange-dark text-white shadow-md"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Add Product
                  </Button>
                )}
              </div>
            </div>

            {products.length === 0 ? (
              /* Empty State */
              <Card className="border-2 border-dashed border-gray-300">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate mb-2">
                    No products yet
                  </h3>
                  <p className="text-slate-light mb-4">
                    Start by adding your first product to this category
                  </p>
                  {canWriteInventory && (
                    <Button
                      onClick={handleAddProduct}
                      className="bg-orange hover:bg-orange-dark"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Product
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Products Grid */
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Card key={product.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        {/* Product Image */}
                        <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                          {product.primary_image_url ? (
                            <img 
                              src={product.primary_image_url} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="h-16 w-16 text-gray-300" />
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-xs text-orange font-semibold uppercase tracking-wide">
                                {product.brand}
                              </p>
                              <h3 className="text-lg font-semibold text-slate mt-1">
                                {product.name}
                              </h3>
                            </div>
                          </div>

                          {/* Surface Type Badge */}
                          <Badge variant="outline" className="border-orange text-orange">
                            {product.surface_type}
                          </Badge>

                          {/* Quantity Transaction Controls */}
                          <div className="pt-3 border-t border-gray-100">
                            <label className="text-xs text-slate-light mb-1 block">Quantity (boxes)</label>
                            <div className="flex items-center space-x-2">
                              {canWriteInventory && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 border-red-500 text-red-500 hover:bg-red-50"
                                  onClick={() => setTransactionProduct({ ...product, type: 'subtract' })}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <div className="flex-1 text-center">
                                <div className="text-2xl font-bold text-slate">
                                  {product.current_quantity}
                                </div>
                                <div className="text-xs text-slate-light">boxes</div>
                              </div>
                              
                              {canWriteInventory && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 border-green-500 text-green-500 hover:bg-green-50"
                                  onClick={() => setTransactionProduct({ ...product, type: 'add' })}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-2 pt-4 border-t border-gray-100">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-orange border-orange hover:bg-orange-50"
                              onClick={() => viewTransactionHistory(product)}
                            >
                              <History className="mr-2 h-4 w-4" />
                              History
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="hover:bg-gray-50"
                              onClick={() => navigate(`/dealer/inventory/${subcategoryId}/products/${product.id}`)}
                            >
                              {canWriteInventory ? <Edit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Results Count */}
                <div className="mt-8 text-center text-sm text-slate-light">
                  Showing {products.length} products
                </div>
              </>
            )}
          </>
        )}
      </div>
      
      {/* Transaction Dialog */}
      <Dialog open={transactionProduct !== null} onOpenChange={() => {
        setTransactionProduct(null);
        setTransactionQuantity('');
        setTransactionError('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transactionProduct?.type === 'add' ? 'Add' : 'Subtract'} Quantity
            </DialogTitle>
            <DialogDescription>
              {transactionProduct?.brand} - {transactionProduct?.name}
              <br />
              Current Quantity: {transactionProduct?.current_quantity} boxes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Enter quantity to {transactionProduct?.type}
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="Enter whole number"
                value={transactionQuantity}
                onChange={(e) => {
                  setTransactionQuantity(e.target.value);
                  setTransactionError(''); // Clear error on input change
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && transactionProduct) {
                    handleTransaction(transactionProduct, transactionProduct.type);
                  }
                }}
                className={transactionError ? 'border-red-500' : ''}
              />
              {transactionError ? (
                <p className="text-sm text-red-600 mt-2 font-medium">
                  {transactionError}
                </p>
              ) : (
                <p className="text-xs text-slate-light mt-1">
                  Must be a positive whole number (integer)
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTransactionProduct(null);
                setTransactionQuantity('');
                setTransactionError('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleTransaction(transactionProduct, transactionProduct?.type)}
              disabled={transacting}
              className={transactionProduct?.type === 'add' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
            >
              {transacting ? 'Processing...' : transactionProduct?.type === 'add' ? 'Add Quantity' : 'Subtract Quantity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Negative Quantity Confirmation */}
      <AlertDialog open={showNegativeConfirm} onOpenChange={setShowNegativeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quantity will become negative</AlertDialogTitle>
            <AlertDialogDescription>
              Current quantity: {pendingTransaction?.product?.current_quantity} boxes
              <br />
              Subtracting: {pendingTransaction?.quantity} boxes
              <br />
              <strong className="text-red-600">
                New quantity will be: {pendingTransaction?.newQuantity} boxes
              </strong>
              <br /><br />
              Do you want to proceed with this transaction?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowNegativeConfirm(false);
              setPendingTransaction(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleNegativeConfirm}
              className="bg-red-500 hover:bg-red-600"
            >
              Yes, Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Transaction History Dialog */}
      <Dialog open={historyProduct !== null} onOpenChange={() => setHistoryProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
            <DialogDescription>
              {historyProduct?.brand} - {historyProduct?.name}
              <br />
              Current Quantity: {historyProduct?.current_quantity} boxes
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

export default ProductsList;
