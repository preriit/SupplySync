import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import DealerPageShell from '../components/DealerPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Check } from 'lucide-react';
import api from '../utils/api';
import AppBreadcrumb from '@/components/theme/AppBreadcrumb';
import SectionHeader from '@/components/theme/SectionHeader';

const AddProduct = () => {
  const { t } = useTranslation(['inventory', 'common']);
  const navigate = useNavigate();
  const { subcategoryId } = useParams();
  
  const [subcategory, setSubcategory] = useState(null);
  const [surfaceTypes, setSurfaceTypes] = useState([]);
  const [applicationTypes, setApplicationTypes] = useState([]);
  const [bodyTypes, setBodyTypes] = useState([]);
  const [qualities, setQualities] = useState([]);
  
  const [formData, setFormData] = useState({
    brand: '',
    name: '',
    sku: '',
    surface_type_id: '',
    application_type_id: '',
    body_type_id: '',
    quality_id: '',
    current_quantity: '',
    packing_per_box: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  const fetchData = useCallback(async () => {
    if (!subcategoryId) return;
    try {
      const [subcatRes, surfaceRes, appRes, bodyRes, qualityRes] = await Promise.all([
        api.get(`/dealer/subcategories/${subcategoryId}/products`),
        api.get('/reference/surface-types'),
        api.get('/reference/application-types'),
        api.get('/reference/body-types'),
        api.get('/reference/qualities')
      ]);
      
      setSubcategory(subcatRes.data.subcategory);
      setSurfaceTypes(surfaceRes.data.surface_types ?? []);
      setApplicationTypes(appRes.data.application_types ?? []);
      setBodyTypes(bodyRes.data.body_types ?? []);
      setQualities(qualityRes.data.qualities ?? []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  }, [subcategoryId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!subcategory) return;
    setFormData((prev) => ({
      ...prev,
      // Prefer API defaults (includes size / make-type fallbacks from backend)
      application_type_id:
        subcategory.application_type_id ?? prev.application_type_id ?? '',
      body_type_id: subcategory.body_type_id ?? prev.body_type_id ?? '',
      packing_per_box:
        subcategory.default_packing_per_box != null && subcategory.default_packing_per_box !== ''
          ? String(subcategory.default_packing_per_box)
          : prev.packing_per_box || '0',
    }));
  }, [subcategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setErrors({});

    const nextErrors = {};
    if (!String(formData.brand || '').trim()) nextErrors.brand = 'Brand is required';
    if (!String(formData.name || '').trim()) nextErrors.name = 'Product name is required';
    if (!formData.surface_type_id) nextErrors.surface_type_id = 'Select a surface type';
    if (!formData.application_type_id) nextErrors.application_type_id = 'Select an application type';
    if (!formData.body_type_id) nextErrors.body_type_id = 'Select a body type';
    if (!formData.quality_id) nextErrors.quality_id = 'Select a quality';
    if (formData.current_quantity === '' || Number(formData.current_quantity) < 0) {
      nextErrors.current_quantity = 'Quantity must be 0 or more';
    }
    if (formData.packing_per_box === '' || Number(formData.packing_per_box) < 1) {
      nextErrors.packing_per_box = 'Packing per box must be at least 1';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/dealer/products', {
        sub_category_id: subcategoryId,
        ...formData
      });

      setMessage({
        type: 'success',
        text: response.data.message
      });
      
      setTimeout(() => {
        navigate(`/dealer/inventory/${subcategoryId}/products`);
      }, 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to create product'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!subcategoryId) {
    return (
      <DealerPageShell>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Missing tile category. Open Inventory, select a category, then use Add Product from that list.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/dealer/inventory')} className="bg-orange">
            Go to Inventory
          </Button>
        </div>
      </DealerPageShell>
    );
  }

  const controlClassName = 'h-10 rounded-md border-app-border focus-visible:ring-2 focus-visible:ring-orange/30 focus-visible:ring-offset-0';
  const sectionTitleClass = 'text-sm font-semibold text-slate';
  const sectionBlockClass = 'space-y-4 rounded-md border border-app-border bg-white p-4';

  const renderError = (field) => {
    if (!errors[field]) return null;
    return (
      <p className="mt-1 inline-flex items-center gap-1 text-xs text-red-600">
        <AlertCircle className="h-3.5 w-3.5" />
        {errors[field]}
      </p>
    );
  };

  const ChoiceGrid = ({ items, value, onChange, columns = 'grid-cols-2 md:grid-cols-3', fieldKey }) => (
    <div>
      <div className={`grid ${columns} gap-2`}>
        {items.map((item) => {
          const selected = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`h-10 rounded-md border px-3 text-sm transition-colors flex items-center justify-between ${
                selected
                  ? 'border-orange bg-orange-50 text-orange'
                  : 'border-app-border bg-white text-slate hover:bg-slate-50'
              }`}
            >
              <span className="truncate">{item.name}</span>
              {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
            </button>
          );
        })}
      </div>
      {renderError(fieldKey)}
    </div>
  );

  return (
    <DealerPageShell>
      <AppBreadcrumb
        items={[
          { label: 'Home', to: '/dealer/dashboard' },
          { label: 'Inventory', to: '/dealer/inventory' },
          { label: 'Products', to: `/dealer/inventory/${subcategoryId}/products` },
          { label: 'Add Product', to: `/dealer/inventory/${subcategoryId}/products/add` },
        ]}
      />

      <SectionHeader
        title="Add Product"
        subtitle={(
          <span>
            Create a new product in this category
            {subcategory ? (
              <span>
                {' · '}
                {subcategory.name}
                {' · '}
                {subcategory.size_mm || subcategory.size_inches || subcategory.size || ''}
                {subcategory.make_type ? ` · ${subcategory.make_type}` : ''}
              </span>
            ) : null}
          </span>
        )}
        className="mb-4"
        actions={null}
      />

      <Card className="border-app-border shadow-none">
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
              {message && (
                <Alert
                  variant={message.type === 'error' ? 'destructive' : 'default'}
                  className={message.type === 'success' ? 'bg-green-50 border-green-200' : ''}
                >
                  {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertDescription className={message.type === 'success' ? 'text-green-800' : ''}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}

              <div className={sectionBlockClass}>
                <h3 className={sectionTitleClass}>Basic details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="brand">Brand *</Label>
                    <Input
                      id="brand"
                      className={controlClassName}
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="e.g., Kajaria, Somany, Nitco"
                    />
                    {renderError('brand')}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      className={controlClassName}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Ivory, Beige, White"
                    />
                    {renderError('name')}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sku">SKU (Optional)</Label>
                  <Input
                    id="sku"
                    className={controlClassName}
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Product SKU code"
                  />
                </div>
              </div>

              <div className={sectionBlockClass}>
                <h3 className={sectionTitleClass}>Surface Type</h3>
                <ChoiceGrid
                  items={surfaceTypes}
                  value={formData.surface_type_id}
                  onChange={(id) => setFormData({ ...formData, surface_type_id: id })}
                  fieldKey="surface_type_id"
                />
              </div>

              <div className={sectionBlockClass}>
                <h3 className={sectionTitleClass}>Other attributes</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Application Type *</Label>
                    <ChoiceGrid
                      items={applicationTypes}
                      value={formData.application_type_id}
                      onChange={(id) => setFormData({ ...formData, application_type_id: id })}
                      fieldKey="application_type_id"
                    />
                  </div>
                  <div className="border-t border-app-border pt-4">
                    <Label className="mb-2 block">Body Type *</Label>
                    <ChoiceGrid
                      items={bodyTypes}
                      value={formData.body_type_id}
                      onChange={(id) => setFormData({ ...formData, body_type_id: id })}
                      columns="grid-cols-1 md:grid-cols-2"
                      fieldKey="body_type_id"
                    />
                  </div>
                  <div className="border-t border-app-border pt-4">
                    <Label className="mb-2 block">Quality *</Label>
                    <ChoiceGrid
                      items={qualities}
                      value={formData.quality_id}
                      onChange={(id) => setFormData({ ...formData, quality_id: id })}
                      fieldKey="quality_id"
                    />
                  </div>
                </div>
              </div>

              <div className={sectionBlockClass}>
                <h3 className={sectionTitleClass}>Inventory settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="quantity">Quantity (Boxes) *</Label>
                    <Input
                      id="quantity"
                      className={controlClassName}
                      type="number"
                      min="0"
                      value={formData.current_quantity}
                      onChange={(e) => setFormData({ ...formData, current_quantity: parseInt(e.target.value, 10) || 0 })}
                      placeholder="0"
                    />
                    {renderError('current_quantity')}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="packing">Packing per Box *</Label>
                    <Input
                      id="packing"
                      className={controlClassName}
                      type="number"
                      min="1"
                      value={formData.packing_per_box}
                      onChange={(e) => setFormData({ ...formData, packing_per_box: parseInt(e.target.value, 10) || '' })}
                      placeholder="10"
                    />
                    {renderError('packing_per_box')}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 z-10 -mx-6 mt-2 border-t border-app-border bg-white px-6 py-3">
                <div className="flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/dealer/inventory/${subcategoryId}/products`)}
                    disabled={loading}
                    className="h-10 rounded-md border-app-border"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-10 rounded-md bg-orange hover:bg-orange-dark text-white"
                  >
                    {loading ? t('common:loading') : 'Save Product'}
                  </Button>
                </div>
              </div>
          </form>
        </CardContent>
      </Card>
    </DealerPageShell>
  );
};

export default AddProduct;
