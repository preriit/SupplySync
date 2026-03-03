import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import DealerNav from '../components/DealerNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Package, Edit, Trash2, Eye, ArrowLeft, Grid3x3, Box } from 'lucide-react';
import api from '../utils/api';

const ProductsList = () => {
  const { t } = useTranslation(['inventory', 'common']);
  const navigate = useNavigate();
  const { subcategoryId } = useParams();
  const [subcategory, setSubcategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [subcategoryId]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = products.filter(product =>
        product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchQuery, products]);

  const fetchProducts = async () => {
    try {
      const response = await api.get(`/api/dealer/subcategories/${subcategoryId}/products`);
      setSubcategory(response.data.subcategory);
      setProducts(response.data.products);
      setFilteredProducts(response.data.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    navigate(`/dealer/inventory/${subcategoryId}/products/add`);
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
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-display font-bold text-slate">
                  Products
                </h1>
                <Button
                  onClick={handleAddProduct}
                  className="bg-orange hover:bg-orange-dark text-white shadow-md"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add Product
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by brand or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 py-6"
                />
              </div>
            </div>

            {filteredProducts.length === 0 ? (
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
                  <Button
                    onClick={handleAddProduct}
                    className="bg-orange hover:bg-orange-dark"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Product
                  </Button>
                </CardContent>
              </Card>
            ) : (
              /* Products Grid */
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => (
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

                          {/* Quantity */}
                          <div className="flex items-center space-x-2 text-slate-light pt-2">
                            <Box className="h-4 w-4" />
                            <span className="text-sm">
                              {product.current_quantity} boxes
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-2 pt-4 border-t border-gray-100">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-orange border-orange hover:bg-orange-50"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="hover:bg-gray-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Results Count */}
                <div className="mt-8 text-center text-sm text-slate-light">
                  Showing {filteredProducts.length} of {products.length} products
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductsList;
