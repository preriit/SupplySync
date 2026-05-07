import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { webStorage } from '@supplysync/core';
import DealerPageShell from '../components/DealerPageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Package, Box, Trash2, ArrowRight, AlertCircle, Grid3x3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '../utils/api';
import SectionHeader from '@/components/theme/SectionHeader';
import StatusChip from '@/components/theme/StatusChip';
import { EmptyStatePanel, ListPageSkeleton } from '@/components/theme/PageStates';
import AddCategoryDialog from '@/components/theme/AddCategoryDialog';
import AppBreadcrumb from '@/components/theme/AppBreadcrumb';

const SubCategoriesList = () => {
  const { t } = useTranslation(['inventory', 'common']);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingSubcategoryId, setDeletingSubcategoryId] = useState(null);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState(null);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const user = JSON.parse(webStorage.getItem('user') || '{}');
  const canWriteInventory = ['dealer', 'manager'].includes(user.user_type);

  useEffect(() => {
    fetchSubcategories();
  }, []);

  const fetchSubcategories = async () => {
    try {
      const response = await api.get('/dealer/subcategories');
      setSubcategories(response.data.subcategories);
    } catch (error) {
      console.error('Failed to fetch subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProducts = (subcategoryId) => {
    navigate(`/dealer/inventory/${subcategoryId}/products`);
  };

  const handleAddCategory = () => {
    setShowAddCategoryDialog(true);
  };

  const openDeleteModal = (subcategory) => {
    setSubcategoryToDelete(subcategory);
  };

  const closeDeleteModal = () => {
    setSubcategoryToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!subcategoryToDelete) return;

    setDeletingSubcategoryId(subcategoryToDelete.id);
    try {
      // Keep category/product lifecycle consistent:
      // when category has active products, confirmed delete cascades to those products.
      const shouldDeleteProducts = subcategoryToDelete.product_count > 0;
      const response = await api.delete(`/dealer/subcategories/${subcategoryToDelete.id}`, {
        params: {
          delete_products: shouldDeleteProducts,
        },
      });
      toast({
        title: 'Sub-category deleted',
        description: response.data?.message || (
          response.data?.deleted_products_count
            ? `Sub-category and ${response.data.deleted_products_count} product(s) were soft deleted.`
            : 'Sub-category was soft deleted successfully.'
        ),
      });
      closeDeleteModal();
      fetchSubcategories();
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error.response?.data?.detail || 'Failed to delete sub-category. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingSubcategoryId(null);
    }
  };

  // Small visual status helps users prioritize categories before drilling in.
  // Low stock when average boxes per product in the subcategory is below 20.
  const getStockStatus = (subcategory) => {
    if (subcategory.product_count === 0) {
      return { label: 'No products', tone: 'neutral' };
    }
    if (subcategory.total_quantity === 0) {
      return { label: 'Out of stock', tone: 'danger' };
    }
    const count = Number(subcategory.product_count) || 0;
    const total = Number(subcategory.total_quantity) || 0;
    const avgPerProduct = count > 0 ? total / count : 0;
    if (avgPerProduct < 20) {
      return { label: 'Low stock', tone: 'warning' };
    }
    return { label: 'Healthy', tone: 'success' };
  };

  return (
    <DealerPageShell>
        <AppBreadcrumb
          items={[
            { label: 'Home', to: '/dealer/dashboard' },
            { label: 'Inventory', to: '/dealer/inventory' },
          ]}
        />

        <SectionHeader
          className="mb-8"
          title={t('inventory:title')}
          subtitle={t('inventory:subtitle')}
          actions={canWriteInventory ? (
            <Button
              onClick={handleAddCategory}
              className="bg-orange hover:bg-orange-dark text-white shadow-md"
            >
              <Plus className="mr-2 h-5 w-5" />
              {t('inventory:add_category')}
            </Button>
          ) : null}
        />

        {loading ? (
          <ListPageSkeleton cards={6} />
        ) : subcategories.length === 0 ? (
          <EmptyStatePanel
            icon={<Package className="h-8 w-8 text-gray-400" />}
            title={t('inventory:empty_state.title')}
            description={t('inventory:empty_state.description')}
            action={canWriteInventory ? (
              <Button
                onClick={handleAddCategory}
                className="bg-orange hover:bg-orange-dark"
              >
                {t('inventory:empty_state.button')}
              </Button>
            ) : null}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {subcategories.map((subcat) => {
              const stockStatus = getStockStatus(subcat);
              return (
                <Card
                  key={subcat.id}
                  className="h-full hover:shadow-lg hover:border-orange/40 transition-all"
                >
                  <CardContent className="p-5 h-full flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex-1 cursor-pointer min-w-0"
                      onClick={() => handleViewProducts(subcat.id)}
                      role="button"
                      tabIndex={0}
                      // Keep the entire info block interactive for fast navigation.
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleViewProducts(subcat.id);
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-11 h-11 bg-orange-light rounded-lg flex items-center justify-center shrink-0">
                          <Grid3x3 className="h-6 w-6 text-orange" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-display font-bold text-slate truncate">
                            {subcat.name}
                          </h3>
                          <p className="text-sm text-slate-light truncate">
                            {subcat.size_mm} • {subcat.make_type}
                          </p>
                          <StatusChip tone={stockStatus.tone} className="mt-2">
                            {stockStatus.label}
                          </StatusChip>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canWriteInventory && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                          aria-label={`Delete subcategory ${subcat.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(subcat);
                          }}
                          disabled={deletingSubcategoryId === subcat.id}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 text-slate-light">
                        <Box className="h-4 w-4" />
                        <span>{t('inventory:products_count', { count: subcat.product_count })}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-light">
                        <Package className="h-4 w-4" />
                        <span>{t('inventory:boxes_in_stock', { count: subcat.total_quantity })}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProducts(subcat.id);
                      }}
                      className="border-2 border-orange text-orange hover:bg-orange-50"
                    >
                      {subcat.product_count === 0 && canWriteInventory ? (
                        <Plus className="mr-2 h-4 w-4" />
                      ) : null}
                      <span>{subcat.product_count > 0 ? t('inventory:view_products') : (canWriteInventory ? t('inventory:add_products') : t('inventory:view_products'))}</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  {subcat.product_count === 0 && (
                    <div className="mt-3 flex items-center space-x-2 text-sm text-slate-light italic">
                      <AlertCircle className="h-4 w-4" />
                      <span>{t('inventory:no_products_yet')}</span>
                    </div>
                  )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {subcategories.length > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <p className="text-sm text-slate-light">
              {t('inventory:showing')} <span className="font-semibold">{subcategories.length}</span> {t('inventory:categories')}
            </p>
          </div>
        )}
      

      <AlertDialog open={Boolean(subcategoryToDelete)} onOpenChange={(open) => !open && closeDeleteModal()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {subcategoryToDelete?.name || 'this'} category?
            </AlertDialogTitle>
            {subcategoryToDelete?.product_count > 0 && (
              <AlertDialogDescription>
                This subcategory has <strong>{subcategoryToDelete.product_count}</strong> active product(s). This will
                delete all active products in this category. Do you want to confirm?
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingSubcategoryId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={Boolean(deletingSubcategoryId)}
            >
              {deletingSubcategoryId ? 'Deleting...' : 'Confirm Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddCategoryDialog
        open={showAddCategoryDialog}
        onOpenChange={setShowAddCategoryDialog}
        onCreated={fetchSubcategories}
      />
    </DealerPageShell>
  );
};

export default SubCategoriesList;
