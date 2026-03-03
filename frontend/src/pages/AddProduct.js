import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import DealerNav from '../components/DealerNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle2, AlertCircle, Grid3x3 } from 'lucide-react';
import api from '../utils/api';

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
    packing_per_box: '10'
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, [subcategoryId]);

  const fetchData = async () => {
    try {
      const [subcatRes, surfaceRes, appRes, bodyRes, qualityRes] = await Promise.all([
        api.get(`/api/dealer/subcategories/${subcategoryId}/products`),
        api.get('/api/reference/surface-types'),
        api.get('/api/reference/application-types'),
        api.get('/api/reference/body-types'),
        api.get('/api/reference/qualities')
      ]);
      
      setSubcategory(subcatRes.data.subcategory);
      setSurfaceTypes(surfaceRes.data.surface_types);
      setApplicationTypes(appRes.data.application_types);
      setBodyTypes(bodyRes.data.body_types);
      setQualities(qualityRes.data.qualities);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const response = await api.post('/api/dealer/products', {
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

  const handleReset = () => {
    setFormData({
      brand: '',
      name: '',
      sku: '',
      surface_type_id: '',
      application_type_id: '',
      body_type_id: '',
      quality_id: '',
      current_quantity: '',
      packing_per_box: '10'
    });
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-grey-50">
      <DealerNav />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/dealer/inventory/${subcategoryId}/products`)}
          className="mb-6 text-orange hover:text-orange-dark"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>

        {subcategory && (
          <Card className="mb-6 bg-gradient-to-r from-orange-50 to-white border-orange">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange rounded-lg flex items-center justify-center">
                  <Grid3x3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-display font-bold text-slate">{subcategory.name}</p>
                  <p className="text-sm text-slate-light">{subcategory.size_mm} • {subcategory.make_type}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-display">Add Product</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {message && (
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'}
                  className={message.type === 'success' ? 'bg-green-50 border-green-200' : ''}>
                  {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertDescription className={message.type === 'success' ? 'text-green-800' : ''}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand *</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    placeholder="e.g., Kajaria, Somany, Nitco"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Ivory, Beige, White"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU (Optional)</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  placeholder="Product SKU code"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold text-slate">SURFACE TYPE *</Label>
                <div className="grid grid-cols-3 gap-3">
                  {surfaceTypes.map((st) => (
                    <label
                      key={st.id}
                      className={`
                        flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all
                        ${formData.surface_type_id === st.id 
                          ? 'border-orange bg-orange-50 text-orange font-semibold' 
                          : 'border-gray-300 hover:border-orange-light hover:bg-gray-50'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="surface_type"
                        value={st.id}
                        checked={formData.surface_type_id === st.id}
                        onChange={(e) => setFormData({...formData, surface_type_id: e.target.value})}
                        className="sr-only"
                        required
                      />
                      <span className="text-sm">{st.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold text-slate">APPLICATION TYPE *</Label>
                <div className="grid grid-cols-3 gap-3">
                  {applicationTypes.map((at) => (
                    <label
                      key={at.id}
                      className={`
                        flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all
                        ${formData.application_type_id === at.id 
                          ? 'border-orange bg-orange-50 text-orange font-semibold' 
                          : 'border-gray-300 hover:border-orange-light hover:bg-gray-50'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="application_type"
                        value={at.id}
                        checked={formData.application_type_id === at.id}
                        onChange={(e) => setFormData({...formData, application_type_id: e.target.value})}
                        className="sr-only"
                        required
                      />
                      <span className="text-sm">{at.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold text-slate">BODY TYPE *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {bodyTypes.map((bt) => (
                    <label
                      key={bt.id}
                      className={`
                        flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all
                        ${formData.body_type_id === bt.id 
                          ? 'border-orange bg-orange-50 text-orange font-semibold' 
                          : 'border-gray-300 hover:border-orange-light hover:bg-gray-50'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="body_type"
                        value={bt.id}
                        checked={formData.body_type_id === bt.id}
                        onChange={(e) => setFormData({...formData, body_type_id: e.target.value})}
                        className="sr-only"
                        required
                      />
                      <span className="text-sm">{bt.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold text-slate">QUALITY *</Label>
                <div className="grid grid-cols-3 gap-3">
                  {qualities.map((q) => (
                    <label
                      key={q.id}
                      className={`
                        flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all
                        ${formData.quality_id === q.id 
                          ? 'border-orange bg-orange-50 text-orange font-semibold' 
                          : 'border-gray-300 hover:border-orange-light hover:bg-gray-50'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="quality"
                        value={q.id}
                        checked={formData.quality_id === q.id}
                        onChange={(e) => setFormData({...formData, quality_id: e.target.value})}
                        className="sr-only"
                        required
                      />
                      <span className="text-sm">{q.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity (Boxes) *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={formData.current_quantity}
                    onChange={(e) => setFormData({...formData, current_quantity: parseInt(e.target.value) || ''})}
                    placeholder="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="packing">Packing per Box *</Label>
                  <Input
                    id="packing"
                    type="number"
                    min="1"
                    value={formData.packing_per_box}
                    onChange={(e) => setFormData({...formData, packing_per_box: parseInt(e.target.value) || ''})}
                    placeholder="10"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-center space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={loading}
                  className="px-8 py-6 text-orange border-2 border-orange hover:bg-orange-50"
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="px-12 py-6 bg-orange hover:bg-orange-dark text-white text-lg"
                >
                  {loading ? t('common:loading') : 'ADD'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddProduct;
