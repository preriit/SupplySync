import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { webStorage } from '@supplysync/core';
import DealerPageShell from '../components/DealerPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, Package, Minus, History, Trash2, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PageToolbar from '@/components/theme/PageToolbar';
import SectionHeader from '@/components/theme/SectionHeader';
import StatusChip from '@/components/theme/StatusChip';
import { EmptyStatePanel, ListPageSkeleton } from '@/components/theme/PageStates';
import AppBreadcrumb from '@/components/theme/AppBreadcrumb';
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

const DEFAULT_SORT_CONFIG = {
  key: 'name',
  direction: 'asc',
};

const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'brand', label: 'Brand' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'status', label: 'Stock Status' },
  { key: 'updated_at', label: 'Last Updated' },
];

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

const ProductsList = () => {
  const { t } = useTranslation(['inventory', 'common']);
  const navigate = useNavigate();
  const { subcategoryId } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const user = JSON.parse(webStorage.getItem('user') || '{}');
  const canWriteInventory = ['dealer', 'manager'].includes(user.user_type);
  const canDeleteProducts = user.user_type === 'dealer';
  const [subcategory, setSubcategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [deletingProducts, setDeletingProducts] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState('single');
  const [productToDelete, setProductToDelete] = useState(null);
  
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
  const stockFilter = searchParams.get('stock');
  const [localStockFilter, setLocalStockFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState(DEFAULT_SORT_CONFIG);
  const [surfaceFilter, setSurfaceFilter] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Dashboard can deep-link into this page with ?stock=low|out.
  // Filtering stays client-side because this page already loads one subcategory's products.
  const effectiveStockFilter = stockFilter || localStockFilter;
  const filteredProducts = useMemo(() => {
    const stockFiltered = products.filter((product) => {
      if (effectiveStockFilter === 'low') {
        return product.current_quantity > 0 && product.current_quantity < 20;
      }
      if (effectiveStockFilter === 'out') {
        return product.current_quantity === 0;
      }
      if (effectiveStockFilter === 'in') {
        return product.current_quantity > 0;
      }
      return true;
    });

    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return stockFiltered;
    }

    const surfaceFiltered = surfaceFilter === 'all'
      ? stockFiltered
      : stockFiltered.filter((product) => (product.surface_type || '').toLowerCase() === surfaceFilter);

    return surfaceFiltered.filter((product) => {
      const haystack = `${product.brand || ''} ${product.name || ''} ${product.surface_type || ''}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [products, effectiveStockFilter, searchTerm, surfaceFilter]);

  const sortedProducts = useMemo(() => {
    const normalizedText = (value) => (value || '').toString().trim().toLowerCase();
    const statusRank = (quantity) => {
      if (quantity === 0) return 0; // Out of stock first
      if (quantity < 20) return 1; // Low stock next
      return 2; // Healthy last
    };

    // Sorting always runs after filters/search to keep user context predictable.
    const sorted = [...filteredProducts].sort((left, right) => {
      let comparison = 0;
      if (sortConfig.key === 'brand') {
        comparison = normalizedText(left.brand).localeCompare(normalizedText(right.brand));
      } else if (sortConfig.key === 'quantity') {
        comparison = (left.current_quantity || 0) - (right.current_quantity || 0);
      } else if (sortConfig.key === 'status') {
        comparison = statusRank(left.current_quantity) - statusRank(right.current_quantity);
      } else if (sortConfig.key === 'updated_at') {
        comparison = new Date(left.updated_at || 0).getTime() - new Date(right.updated_at || 0).getTime();
      } else {
        comparison = normalizedText(left.name).localeCompare(normalizedText(right.name));
      }

      // Tie-breaker keeps list stable and readable for users.
      if (comparison === 0) {
        comparison = normalizedText(left.name).localeCompare(normalizedText(right.name));
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredProducts, sortConfig]);

  const getStockBadge = (quantity) => {
    if (quantity === 0) {
      return <StatusChip tone="danger">Out of stock</StatusChip>;
    }
    if (quantity < 20) {
      return <StatusChip tone="warning">Low stock</StatusChip>;
    }
    return <StatusChip tone="success">Healthy</StatusChip>;
  };

  const productsByStatus = useMemo(() => ({
    all: products.length,
    in: products.filter((product) => product.current_quantity > 0).length,
    low: products.filter((product) => product.current_quantity > 0 && product.current_quantity < 20).length,
    out: products.filter((product) => product.current_quantity === 0).length,
  }), [products]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, localStockFilter, stockFilter, surfaceFilter, pageSize, sortConfig.key, sortConfig.direction]);

  const selectedVisibleCount = useMemo(
    () => sortedProducts.filter((product) => selectedProductIds.includes(product.id)).length,
    [sortedProducts, selectedProductIds],
  );

  const toggleSelectAllVisible = () => {
    const visibleIds = sortedProducts.map((product) => product.id);
    const allVisibleSelected = visibleIds.every((id) => selectedProductIds.includes(id));
    if (allVisibleSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const clearQuickFilters = () => {
    setSearchTerm('');
    setLocalStockFilter('all');
    setSurfaceFilter('all');
    setSortConfig(DEFAULT_SORT_CONFIG);
  };

  const selectedSortOption = SORT_OPTIONS.find((option) => option.key === sortConfig.key) || SORT_OPTIONS[0];

  const handleSortSelection = (newSortKey) => {
    // UX rule: selecting the active sort field toggles direction;
    // selecting a different field starts in ascending order.
    setSortConfig((prev) => {
      if (prev.key === newSortKey) {
        return {
          ...prev,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        key: newSortKey,
        direction: 'asc',
      };
    });
  };

  const handleColumnSort = (columnKey) => {
    // Table-header sorting mirrors earlier arrow-based UX:
    // click same column toggles direction; new column starts ascending.
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        return {
          ...prev,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        key: columnKey,
        direction: 'asc',
      };
    });
  };

  // legacy stock filter behavior for dashboard deep-link
  const isDashboardFilterApplied = stockFilter === 'low' || stockFilter === 'out';
  const dashboardFilterLabel = stockFilter === 'low' ? 'low-stock' : 'out-of-stock';

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

  const openProductDetail = (productId) => {
    navigate(`/dealer/inventory/${subcategoryId}/products/${productId}`);
  };

  const toggleSelectionMode = () => {
    // Keep multi-delete behind an explicit mode to avoid accidental bulk operations.
    setSelectionMode((prev) => !prev);
    setSelectedProductIds([]);
  };

  const toggleProductSelection = (productId) => {
    setSelectedProductIds((prev) => (
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    ));
  };

  const openSingleDeleteDialog = (product) => {
    setDeleteScope('single');
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const openBulkDeleteDialog = () => {
    if (selectedProductIds.length === 0) {
      toast({
        title: 'No products selected',
        description: 'Select at least one product to delete.',
        variant: 'destructive',
      });
      return;
    }
    setDeleteScope('bulk');
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setDeletingProducts(true);
    try {
      if (deleteScope === 'single' && productToDelete) {
        await api.delete(`/dealer/products/${productToDelete.id}`);
        setProducts((prev) => prev.filter((product) => product.id !== productToDelete.id));
        toast({
          title: 'Product deleted',
          description: `${productToDelete.brand} ${productToDelete.name} deleted successfully.`,
        });
      } else if (deleteScope === 'bulk') {
        const response = await api.post('/dealer/products/bulk-delete', {
          product_ids: selectedProductIds,
        });
        setProducts((prev) => prev.filter((product) => !selectedProductIds.includes(product.id)));
        toast({
          title: 'Bulk delete completed',
          description: response?.data?.message || `${selectedProductIds.length} product(s) deleted.`,
        });
        setSelectionMode(false);
        setSelectedProductIds([]);
      }
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error.response?.data?.detail || 'Could not delete product(s).',
        variant: 'destructive',
      });
    } finally {
      setDeletingProducts(false);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      setDeleteScope('single');
    }
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
    <DealerPageShell>
        <AppBreadcrumb
          items={[
            { label: 'Home', to: '/dealer/dashboard' },
            { label: 'Inventory', to: '/dealer/inventory' },
            { label: 'Products', to: `/dealer/inventory/${subcategoryId}/products` },
          ]}
        />
        {loading ? (
          <ListPageSkeleton cards={6} />
        ) : (
          <>
            {/* Header */}
            <SectionHeader
              title="Products"
              actions={(
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" className="h-10">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  {canWriteInventory && (
                    <Button
                      onClick={handleAddProduct}
                      className="h-10 bg-orange hover:bg-orange-dark text-white shadow-md"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Add Product
                    </Button>
                  )}
                </div>
              )}
            />
            <PageToolbar
              className="mb-6"
              left={(
                <div className="relative w-full lg:max-w-md">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search product name, SKU, or brand..."
                    className="h-10 rounded-md border-slate-200 bg-slate-50 pl-9 shadow-none focus:bg-white"
                  />
                </div>
              )}
              right={(
                <div className="flex flex-wrap items-stretch gap-2">
                    {canDeleteProducts && (
                      <>
                        <Button
                          variant={selectionMode ? 'secondary' : 'outline'}
                          onClick={toggleSelectionMode}
                          className="h-10 rounded-md shadow-none"
                        >
                          {selectionMode ? 'Cancel Selection' : 'Select'}
                        </Button>
                        {selectionMode && (
                          <Button
                            variant="destructive"
                            onClick={openBulkDeleteDialog}
                            disabled={selectedProductIds.length === 0 || deletingProducts}
                            className="h-10 rounded-md shadow-none"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Selected ({selectedProductIds.length})
                          </Button>
                        )}
                      </>
                    )}
                    <select className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm min-w-[140px]" disabled>
                      <option>{subcategory?.name || 'Sub Category'}</option>
                    </select>
                    <select
                      value={surfaceFilter}
                      onChange={(e) => setSurfaceFilter(e.target.value)}
                      className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm min-w-[140px]"
                    >
                      <option value="all">Surface Type</option>
                      {Array.from(new Set((products || []).map((p) => p.surface_type).filter(Boolean))).map((surface) => (
                        <option key={surface} value={surface.toLowerCase()}>{surface}</option>
                      ))}
                    </select>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" className="h-10 min-w-[170px] justify-start rounded-md border-slate-200 bg-slate-50 shadow-none hover:bg-white">
                          Sort: {selectedSortOption.label} {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {SORT_OPTIONS.map((option) => {
                          const isSelected = option.key === sortConfig.key;
                          return (
                            <DropdownMenuItem
                              key={option.key}
                              onSelect={() => handleSortSelection(option.key)}
                              className="flex items-center justify-between"
                            >
                              <span>{option.label}</span>
                              {/* Show arrow only for selected sort field to reduce menu noise. */}
                              {isSelected ? (
                                <span className="text-xs text-slate-light">
                                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                </span>
                              ) : null}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button type="button" variant="ghost" className="h-10 rounded-md" onClick={clearQuickFilters}>Clear</Button>
                </div>
              )}
            />
            <div className="mb-4 border-b border-app-border bg-white rounded-t-lg px-4">
              <div className="flex items-center gap-6 overflow-x-auto">
                {[
                  { key: 'all', label: `All (${productsByStatus.all})` },
                  { key: 'in', label: `In Stock (${productsByStatus.in})` },
                  { key: 'low', label: `Low Stock (${productsByStatus.low})` },
                  { key: 'out', label: `Out of Stock (${productsByStatus.out})` },
                ].map((tab) => {
                  const active = effectiveStockFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      disabled={isDashboardFilterApplied}
                      onClick={() => setLocalStockFilter(tab.key)}
                      className={`py-3 text-sm whitespace-nowrap border-b-2 ${active ? 'border-orange text-orange font-semibold' : 'border-transparent text-slate-light'}`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
                {isDashboardFilterApplied ? (
                  <p className="text-xs text-slate-light mt-2">
                    Dashboard filter is active ({dashboardFilterLabel}). Go back from dashboard to unlock quick stock filters.
                  </p>
                ) : null}
            

            {sortedProducts.length === 0 ? (
              <EmptyStatePanel
                icon={<Package className="h-8 w-8 text-gray-400" />}
                title={effectiveStockFilter !== 'all' || searchTerm.trim()
                  ? 'No products match current filters'
                  : 'No products yet'}
                description={effectiveStockFilter !== 'all' || searchTerm.trim()
                  ? 'Try adjusting stock filter or search keyword.'
                  : 'Start by adding your first product to this category'}
                action={canWriteInventory ? (
                  <Button
                    onClick={handleAddProduct}
                    className="bg-orange hover:bg-orange-dark"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Product
                  </Button>
                ) : null}
              />
            ) : (
              /* Products Table */
              <>
                {selectionMode && canDeleteProducts ? (
                  <div className="mb-4 sticky top-2 z-10 rounded-lg border border-orange-200 bg-orange-50/80 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-slate">
                      {selectedVisibleCount} selected in current view
                    </p>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={toggleSelectAllVisible}>
                      {selectedVisibleCount === sortedProducts.length && sortedProducts.length > 0 ? 'Clear All' : 'Select All'}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={openBulkDeleteDialog}
                        disabled={selectedProductIds.length === 0 || deletingProducts}
                      >
                        Delete Selected ({selectedProductIds.length})
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="rounded-lg border border-app-border bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-light">
                        <tr>
                          <th className="px-3 py-3 text-left w-10">
                            {selectionMode && canDeleteProducts ? (
                              <input
                                type="checkbox"
                                checked={selectedVisibleCount === sortedProducts.length && sortedProducts.length > 0}
                                onChange={toggleSelectAllVisible}
                              />
                            ) : null}
                          </th>
                          <th className="px-3 py-3 text-left">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 font-semibold hover:text-orange"
                              onClick={() => handleColumnSort('name')}
                            >
                              Name
                              <span className="text-xs text-slate-light">
                                {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                              </span>
                            </button>
                          </th>
                          <th className="px-3 py-3 text-left">Sub Category</th>
                          <th className="px-3 py-3 text-left">Surface Type</th>
                          <th className="px-3 py-3 text-left">Size / Thickness</th>
                          <th className="px-3 py-3 text-left">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 font-semibold hover:text-orange"
                              onClick={() => handleColumnSort('quantity')}
                            >
                              Quantity (Boxes)
                              <span className="text-xs text-slate-light">
                                {sortConfig.key === 'quantity' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                              </span>
                            </button>
                          </th>
                          <th className="px-3 py-3 text-left">Status</th>
                          <th className="px-3 py-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedProducts.map((product) => (
                          <tr key={product.id} className="border-t border-app-border hover:bg-slate-50/70">
                            <td className="px-3 py-3">
                              {selectionMode && canDeleteProducts ? (
                                <input
                                  type="checkbox"
                                  checked={selectedProductIds.includes(product.id)}
                                  onChange={() => toggleProductSelection(product.id)}
                                />
                              ) : null}
                            </td>
                            <td className="px-3 py-3">
                              <button type="button" className="block text-left pl-2" onClick={() => openProductDetail(product.id)}>
                                <p className="font-semibold text-slate">{product.name}</p>
                              </button>
                            </td>
                            <td className="px-3 py-3 text-slate">{subcategory?.name || '-'}</td>
                            <td className="px-3 py-3 text-slate">{product.surface_type || '-'}</td>
                            <td className="px-3 py-3 text-slate">{subcategory?.size_mm || '-'}</td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate">{product.current_quantity}</span>
                                {canWriteInventory && (
                                  <>
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setTransactionProduct({ ...product, type: 'subtract' })}>
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setTransactionProduct({ ...product, type: 'add' })}>
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">{getStockBadge(product.current_quantity)}</td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => viewTransactionHistory(product)}>
                                        <History className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>History</TooltipContent>
                                  </Tooltip>
                                  {canDeleteProducts && !selectionMode && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-8 w-8 text-red-600 border-red-300" onClick={() => openSingleDeleteDialog(product)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Delete</TooltipContent>
                                    </Tooltip>
                                  )}
                                </TooltipProvider>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Results Count */}
                <div className="mt-4 flex items-center justify-between text-sm text-slate-light">
                  <p>Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedProducts.length)} of {sortedProducts.length} products</p>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Prev</Button>
                    <span>{currentPage} / {totalPages}</span>
                    <Button type="button" variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="h-8 rounded-md border border-input bg-background px-2"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      

      {/* Shared confirmation for single and bulk product delete actions. */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteScope === 'bulk' ? 'Delete selected products?' : 'Delete product?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteScope === 'bulk'
                ? `This will delete ${selectedProductIds.length} selected product(s).`
                : `Are you sure you want to delete ${productToDelete?.brand || ''} ${productToDelete?.name || ''}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingProducts}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deletingProducts}
              className="bg-red-500 hover:bg-red-600"
            >
              {deletingProducts
                ? 'Deleting...'
                : deleteScope === 'bulk'
                  ? 'Delete Selected'
                  : 'Delete Product'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
          </div>
        </DialogContent>
      </Dialog>
    </DealerPageShell>
  );
};

export default ProductsList;
