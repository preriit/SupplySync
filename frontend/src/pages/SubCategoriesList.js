import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import DealerNav from '../components/DealerNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, Package, Box, Trash2, ArrowRight, AlertCircle, Grid3x3 } from 'lucide-react';
import api from '../utils/api';

const SubCategoriesList = () => {
  const { t } = useTranslation(['inventory', 'common']);
  const navigate = useNavigate();
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

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
    navigate('/dealer/inventory/add-category');
  };

  return (
    <div className="min-h-screen bg-grey-50">
      <DealerNav />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 text-sm text-slate-light">
          <span>{t('common:welcome')}</span>
          <span className="mx-2">{'>'}</span>
          <span className="text-slate font-medium">Sub-Categories</span>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-slate">
                {t('inventory:title')}
              </h1>
              <p className="text-slate-light mt-1">{t('inventory:subtitle')}</p>
            </div>
            <Button
              onClick={handleAddCategory}
              className="bg-orange hover:bg-orange-dark text-white shadow-md"
            >
              <Plus className="mr-2 h-5 w-5" />
              {t('inventory:add_category')}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange mx-auto"></div>
            <p className="mt-4 text-slate-light">{t('common:loading')}</p>
          </div>
        ) : subcategories.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate mb-2">
                {t('inventory:empty_state.title')}
              </h3>
              <p className="text-slate-light mb-4">
                {t('inventory:empty_state.description')}
              </p>
              <Button
                onClick={handleAddCategory}
                className="bg-orange hover:bg-orange-dark"
              >
                {t('inventory:empty_state.button')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {subcategories.map((subcat) => (
              <Card key={subcat.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-orange-light rounded-lg flex items-center justify-center">
                          <Grid3x3 className="h-6 w-6 text-orange" />
                        </div>
                        <div>
                          <h3 className="text-xl font-display font-bold text-slate">
                            {subcat.name}
                          </h3>
                          <p className="text-sm text-slate-light">
                            {subcat.size_mm} • {subcat.make_type}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {subcat.product_count > 0 ? (
                        <Button
                          variant="outline"
                          onClick={() => handleViewProducts(subcat.id)}
                          className="border-2 border-orange text-orange hover:bg-orange-50"
                        >
                          <span>{t('inventory:view_products')}</span>
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => handleViewProducts(subcat.id)}
                          className="border-2 border-orange text-orange hover:bg-orange-50"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          <span>{t('inventory:add_products')}</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {subcat.product_count > 0 ? (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center space-x-6 text-sm">
                      <div className="flex items-center space-x-2 text-slate-light">
                        <Box className="h-4 w-4" />
                        <span>{t('inventory:products_count', { count: subcat.product_count })}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-light">
                        <Package className="h-4 w-4" />
                        <span>{t('inventory:boxes_in_stock', { count: subcat.total_quantity })}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-2 text-sm text-slate-light italic">
                        <AlertCircle className="h-4 w-4" />
                        <span>{t('inventory:no_products_yet')}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {subcategories.length > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <p className="text-sm text-slate-light">
              {t('inventory:showing')} <span className="font-semibold">{subcategories.length}</span> {t('inventory:categories')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubCategoriesList;
