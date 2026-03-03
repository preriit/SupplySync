import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import DealerNav from '../components/DealerNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Grid3x3, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const AddSubCategory = () => {
  const { t } = useTranslation(['inventory', 'common']);
  const navigate = useNavigate();
  const [sizes, setSizes] = useState([]);
  const [makeTypes, setMakeTypes] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedMakeType, setSelectedMakeType] = useState('');
  const [previewName, setPreviewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    // Generate preview name
    if (selectedSize && selectedMakeType) {
      const makeType = makeTypes.find(mt => mt.id === selectedMakeType);
      if (makeType) {
        setPreviewName(`${selectedSize.toUpperCase()} ${makeType.name.toUpperCase()}`);
      }
    } else {
      setPreviewName('');
    }
  }, [selectedSize, selectedMakeType, makeTypes]);

  const fetchReferenceData = async () => {
    try {
      const [sizesRes, makeTypesRes] = await Promise.all([
        api.get('/api/reference/tile-sizes'),
        api.get('/api/reference/make-types')
      ]);
      setSizes(sizesRes.data.sizes);
      setMakeTypes(makeTypesRes.data.make_types);
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const response = await api.post('/api/dealer/subcategories', {
        size: selectedSize,
        make_type_id: selectedMakeType
      });

      if (response.data.exists) {
        setMessage({
          type: 'warning',
          text: response.data.message
        });
      } else {
        setMessage({
          type: 'success',
          text: response.data.message
        });
        setTimeout(() => {
          navigate('/dealer/inventory');
        }, 2000);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to create sub-category'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-grey-50">
      <DealerNav />
      
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/dealer/inventory')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Categories
        </Button>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-display flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-light rounded-lg flex items-center justify-center">
                <Grid3x3 className="h-5 w-5 text-orange" />
              </div>
              <span>Add Tile Category</span>
            </CardTitle>
            <CardDescription>
              Select tile size and make type to create a new category
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Alert Messages */}
              {message && (
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                  {message.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {message.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                  {message.type === 'error' && <AlertCircle className="h-4 w-4" />}
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}

              {/* Tile Size */}
              <div className="space-y-2">
                <Label htmlFor="size">Tile Size *</Label>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger id="size">
                    <SelectValue placeholder="Select tile size" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizes.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Common tile sizes in inches (with mm equivalents)
                </p>
              </div>

              {/* Make Type */}
              <div className="space-y-2">
                <Label htmlFor="makeType">Make Type *</Label>
                <Select value={selectedMakeType} onValueChange={setSelectedMakeType}>
                  <SelectTrigger id="makeType">
                    <SelectValue placeholder="Select make type" />
                  </SelectTrigger>
                  <SelectContent>
                    {makeTypes.map((mt) => (
                      <SelectItem key={mt.id} value={mt.id}>
                        {mt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Type of tile manufacturing process
                </p>
              </div>

              {/* Preview */}
              {previewName && (
                <div className="p-4 bg-grey-100 rounded-lg border-2 border-orange-light">
                  <Label className="text-xs text-muted-foreground">Category Preview:</Label>
                  <p className="text-xl font-display font-bold text-slate mt-1">
                    {previewName}
                  </p>
                  <p className="text-sm text-slate-light mt-1">
                    This name will be used for the sub-category
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center space-x-3 pt-4">
                <Button
                  type="submit"
                  disabled={!selectedSize || !selectedMakeType || loading}
                  className="bg-orange hover:bg-orange-dark"
                >
                  {loading ? t('common:loading') : 'Create Category'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dealer/inventory')}
                  disabled={loading}
                >
                  {t('common:cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <h4 className="font-semibold text-slate mb-2">Smart Category Management</h4>
            <ul className="text-sm text-slate-light space-y-1">
              <li>• If the category already exists, you'll be able to add products to it</li>
              <li>• All dealers share the same categories for better marketplace integration</li>
              <li>• Category names are auto-generated for consistency</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddSubCategory;
