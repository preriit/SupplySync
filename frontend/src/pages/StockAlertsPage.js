import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DealerPageShell from '../components/DealerPageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../utils/api';
import SectionHeader from '@/components/theme/SectionHeader';
import StatusChip from '@/components/theme/StatusChip';
import { EmptyStatePanel, ListPageSkeleton } from '@/components/theme/PageStates';
import AppBreadcrumb from '@/components/theme/AppBreadcrumb';

const StockAlertsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ stock_type: 'low', total_products: 0, groups: [] });
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showProductList, setShowProductList] = useState(false);

  const stockType = (searchParams.get('stock') || 'low').toLowerCase();
  const isOutOfStock = stockType === 'out';

  useEffect(() => {
    const fetchStockAlerts = async () => {
      setLoading(true);
      try {
        const response = await api.get('/dealer/products/stock-alerts', {
          params: { stock_type: stockType },
        });
        const payload = response.data || { stock_type: stockType, total_products: 0, groups: [] };
        setData(payload);
        // Keep cards collapsed by default to maximize scan density.
        const initialExpandedState = {};
        payload.groups.forEach((group) => {
          initialExpandedState[group.subcategory_id] = false;
        });
        setExpandedGroups(initialExpandedState);
      } catch (error) {
        setData({ stock_type: stockType, total_products: 0, groups: [] });
        setExpandedGroups({});
      } finally {
        setLoading(false);
      }
    };

    fetchStockAlerts();
  }, [stockType]);

  const toggleGroup = (subcategoryId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [subcategoryId]: !prev[subcategoryId],
    }));
  };

  const expandAll = () => {
    const next = {};
    data.groups.forEach((group) => {
      next[group.subcategory_id] = true;
    });
    setExpandedGroups(next);
  };

  const collapseAll = () => {
    const next = {};
    data.groups.forEach((group) => {
      next[group.subcategory_id] = false;
    });
    setExpandedGroups(next);
  };

  const sortedGroups = [...data.groups].sort((a, b) => b.products.length - a.products.length);
  const flatProducts = sortedGroups.flatMap((group) =>
    group.products.map((product) => ({
      ...product,
      subcategory_id: group.subcategory_id,
      subcategory_name: group.subcategory_name,
      size_mm: group.size_mm,
    }))
  );

  return (
    <DealerPageShell>
        <AppBreadcrumb
          items={[
            { label: 'Home', to: '/dealer/dashboard' },
            { label: 'Stock Alerts', to: `/dealer/stock-alerts?stock=${stockType}` },
          ]}
        />
        <SectionHeader
          title={isOutOfStock ? 'Out of Stock Products' : 'Low Stock Products'}
          subtitle={loading ? 'Loading...' : `${data.total_products} product(s) need attention`}
        />

        {loading ? (
          <ListPageSkeleton cards={6} />
        ) : data.groups.length === 0 ? (
          <EmptyStatePanel
            icon={isOutOfStock
              ? <ShoppingBag className="h-8 w-8 text-gray-400" />
              : <AlertTriangle className="h-8 w-8 text-gray-400" />}
            title="No matching products found"
            description="Everything looks healthy for this stock segment."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowProductList((prev) => !prev)}
              >
                {showProductList ? 'Show Grouped View' : 'Show Product List'}
              </Button>
              {!showProductList && (
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={expandAll}>
                    Expand All
                  </Button>
                  <Button type="button" variant="outline" onClick={collapseAll}>
                    Collapse All
                  </Button>
                </div>
              )}
            </div>

            {showProductList ? (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                    {flatProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => navigate(`/dealer/inventory/${product.subcategory_id}/products/${product.id}`)}
                        className="w-full text-left p-3 rounded-md border hover:border-orange hover:bg-orange-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-light">{product.subcategory_name} • {product.size_mm}</p>
                            <p className="text-xs text-orange font-semibold uppercase tracking-wide mt-1">{product.brand}</p>
                            <p className="font-medium text-slate">{product.name}</p>
                          </div>
                          <StatusChip tone={product.current_quantity === 0 ? 'danger' : 'warning'}>
                            {product.current_quantity} boxes
                          </StatusChip>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedGroups.map((group) => (
                <Card key={group.subcategory_id} className="h-fit">
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => toggleGroup(group.subcategory_id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleGroup(group.subcategory_id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <CardTitle className="text-xl font-display text-slate">
                          {group.subcategory_name}
                        </CardTitle>
                        <p className="text-sm text-slate-light">{group.size_mm}</p>
                      </div>
                      <div className="flex items-center gap-2 text-slate-light">
                        <span className="text-sm">{group.products.length} products</span>
                        {expandedGroups[group.subcategory_id] ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {expandedGroups[group.subcategory_id] && (
                    <CardContent>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {group.products.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => navigate(`/dealer/inventory/${group.subcategory_id}/products/${product.id}`)}
                          className="w-full text-left p-3 rounded-md border hover:border-orange hover:bg-orange-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-orange font-semibold uppercase tracking-wide">{product.brand}</p>
                              <p className="font-medium text-slate">{product.name}</p>
                            </div>
                            <StatusChip tone={product.current_quantity === 0 ? 'danger' : 'warning'}>
                              {product.current_quantity} boxes
                            </StatusChip>
                          </div>
                        </button>
                      ))}
                    </div>
                    </CardContent>
                  )}
                </Card>
              ))}
              </div>
            )}
          </div>
        )}
    </DealerPageShell>
  );
};

export default StockAlertsPage;
