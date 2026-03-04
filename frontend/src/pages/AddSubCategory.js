import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import DealerNav from '../components/DealerNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
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
        api.get('/reference/tile-sizes'),
        api.get('/reference/make-types')
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
      const response = await api.post('/dealer/subcategories', {
        size: selectedSize,
        make_type_id: selectedMakeType
      });

      if (response.data.exists) {
        setMessage({
          type: 'warning',
          text: response.data.message + '. You can now add products to it!'
        });
        setTimeout(() => {
          navigate('/dealer/inventory');
        }, 2000);
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

  const handleReset = () => {
    setSelectedSize('');
    setSelectedMakeType('');
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-grey-50">
      <DealerNav />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/dealer/inventory')}
          className="mb-6 text-orange hover:text-orange-dark"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Form Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-display">
              Add Category
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Alert Messages */}
              {message && (
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'}
                  className={message.type === 'success' ? 'bg-green-50 border-green-200' : message.type === 'warning' ? 'bg-yellow-50 border-yellow-200' : ''}>
                  {message.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {message.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                  {message.type === 'error' && <AlertCircle className="h-4 w-4" />}
                  <AlertDescription className={message.type === 'success' ? 'text-green-800' : message.type === 'warning' ? 'text-yellow-800' : ''}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}

              {/* SIZE - Radio Buttons */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-slate flex items-center">
                  <span className="text-orange mr-2">*</span>
                  SIZE
                </Label>
                <div className="grid grid-cols-4 gap-3">
                  {sizes.map((size) => (
                    <label
                      key={size.value}
                      className={`
                        flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all
                        ${selectedSize === size.value 
                          ? 'border-orange bg-orange-50 text-orange font-semibold' 
                          : 'border-gray-300 hover:border-orange-light hover:bg-gray-50'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="size"
                        value={size.value}
                        checked={selectedSize === size.value}
                        onChange={(e) => setSelectedSize(e.target.value)}
                        className="sr-only"
                      />
                      <span>{size.value}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* MAKE TYPE - Radio Buttons */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-slate">
                  MAKE TYPE
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {makeTypes.map((mt) => (
                    <label
                      key={mt.id}
                      className={`
                        flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all text-center
                        ${selectedMakeType === mt.id 
                          ? 'border-orange bg-orange-50 text-orange font-semibold' 
                          : 'border-gray-300 hover:border-orange-light hover:bg-gray-50'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="makeType"
                        value={mt.id}
                        checked={selectedMakeType === mt.id}
                        onChange={(e) => setSelectedMakeType(e.target.value)}
                        className="sr-only"
                      />
                      <span className="text-sm">{mt.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview Box */}
              {previewName && (
                <div className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border-2 border-orange">
                  <Label className="text-sm text-slate-light uppercase tracking-wide">Preview:</Label>
                  <p className="text-2xl font-display font-bold text-slate mt-2">
                    {previewName}
                  </p>
                </div>
              )}

              {/* Buttons */}
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
                  disabled={!selectedSize || !selectedMakeType || loading}
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

export default AddSubCategory;
