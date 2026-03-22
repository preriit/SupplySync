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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const AddSubCategory = () => {
  const { t } = useTranslation(['inventory', 'common']);
  const navigate = useNavigate();
  const [sizes, setSizes] = useState([]);
  const [makeTypes, setMakeTypes] = useState([]);
  const [applicationTypes, setApplicationTypes] = useState([]);
  const [bodyTypes, setBodyTypes] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedSizeId, setSelectedSizeId] = useState('');
  const [selectedMakeType, setSelectedMakeType] = useState('');
  const [selectedApplicationType, setSelectedApplicationType] = useState('');
  const [selectedBodyType, setSelectedBodyType] = useState('');
  const [defaultPackingPerBox, setDefaultPackingPerBox] = useState('');
  const [previewName, setPreviewName] = useState('');
  const [reactivateProducts, setReactivateProducts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    if (!selectedSizeId) return;
    const s = sizes.find((x) => x.id === selectedSizeId);
    if (s && s.default_packaging_per_box != null) {
      setDefaultPackingPerBox(String(s.default_packaging_per_box));
    }
  }, [selectedSizeId, sizes]);

  // No make type → default body type from tile size; switching back from make type re-applies size
  useEffect(() => {
    if (selectedMakeType) return;
    if (!selectedSizeId || !sizes.length) {
      setSelectedBodyType('');
      return;
    }
    const s = sizes.find((x) => x.id === selectedSizeId);
    if (s?.body_type_id) {
      setSelectedBodyType(s.body_type_id);
    } else {
      setSelectedBodyType('');
    }
  }, [selectedSizeId, selectedMakeType, sizes]);

  useEffect(() => {
    if (!selectedSize) {
      setPreviewName('');
      return;
    }
    const makeType = makeTypes.find((mt) => mt.id === selectedMakeType);
    const bodyType = bodyTypes.find((b) => b.id === selectedBodyType);
    if (selectedMakeType && makeType) {
      setPreviewName(`${selectedSize.toUpperCase()} ${makeType.name.toUpperCase()}`);
    } else if (!selectedMakeType && bodyType) {
      setPreviewName(`${selectedSize.toUpperCase()} ${bodyType.name.toUpperCase()}`);
    } else {
      setPreviewName(selectedSize.toUpperCase());
    }
  }, [selectedSize, selectedMakeType, selectedBodyType, makeTypes, bodyTypes]);

  const fetchReferenceData = async () => {
    try {
      const [sizesRes, makeTypesRes, appRes, bodyRes] = await Promise.all([
        api.get('/reference/tile-sizes'),
        api.get('/reference/make-types'),
        api.get('/reference/application-types'),
        api.get('/reference/body-types'),
      ]);
      setSizes(sizesRes.data.sizes);
      setMakeTypes(makeTypesRes.data.make_types);
      setApplicationTypes(appRes.data.application_types ?? []);
      setBodyTypes(bodyRes.data.body_types ?? []);
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const selectedMt = makeTypes.find((m) => m.id === selectedMakeType);
      const payload = {
        ...(selectedSizeId ? { size_id: selectedSizeId } : { size: selectedSize }),
        application_type_id: selectedApplicationType,
      };
      if (defaultPackingPerBox !== '' && defaultPackingPerBox != null) {
        const n = parseInt(defaultPackingPerBox, 10);
        if (!Number.isNaN(n) && n >= 1) {
          payload.default_packing_per_box = n;
        }
      }
      if (selectedMakeType) {
        payload.make_type_id = selectedMakeType;
        if (selectedMt && !selectedMt.body_type_id) {
          payload.body_type_id = selectedBodyType;
        }
      } else {
        const s = sizes.find((x) => x.id === selectedSizeId);
        const fromSize = s?.body_type_id;
        if (selectedBodyType || fromSize) {
          payload.body_type_id = selectedBodyType || fromSize;
        }
      }
      if (reactivateProducts) {
        payload.reactivate_products = true;
      }

      const response = await api.post('/dealer/subcategories', payload);

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
    setSelectedSizeId('');
    setSelectedMakeType('');
    setSelectedApplicationType('');
    setSelectedBodyType('');
    setDefaultPackingPerBox('');
    setReactivateProducts(false);
    setMessage(null);
  };

  const selectedMt = makeTypes.find((m) => m.id === selectedMakeType);
  const selectedSizeObj = sizes.find((x) => x.id === selectedSizeId);
  const sizeBodyId = selectedSizeObj?.body_type_id;
  const showBodyTypeSection =
    !selectedMakeType || !!(selectedMt && !selectedMt.body_type_id);
  const bodyManualRequired =
    (!selectedMakeType && !sizeBodyId) ||
    !!(selectedMakeType && selectedMt && !selectedMt.body_type_id);
  const canSubmit =
    (selectedSizeId || selectedSize) &&
    selectedApplicationType &&
    (selectedMakeType
      ? !!(selectedMt?.body_type_id || selectedBodyType)
      : !!(sizeBodyId || selectedBodyType));

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
                  {sizes.map((size) => {
                    const sizeSelected = size.id
                      ? selectedSizeId === size.id
                      : selectedSize === size.value;
                    return (
                    <label
                      key={size.id || size.value}
                      className={`
                        flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all
                        ${sizeSelected
                          ? 'border-orange bg-orange-50 text-orange font-semibold'
                          : 'border-gray-300 hover:border-orange-light hover:bg-gray-50'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="size"
                        value={size.id || size.value}
                        checked={Boolean(size.id ? selectedSizeId === size.id : selectedSize === size.value)}
                        onChange={() => {
                          if (size.id) {
                            setSelectedSizeId(size.id);
                            setSelectedSize(size.value || '');
                            if (size.default_packaging_per_box != null) {
                              setDefaultPackingPerBox(String(size.default_packaging_per_box));
                            } else {
                              setDefaultPackingPerBox('');
                            }
                          } else {
                            setSelectedSizeId('');
                            setSelectedSize(size.value || '');
                            setDefaultPackingPerBox('');
                          }
                        }}
                        className="sr-only"
                      />
                      <span>{size.value}</span>
                    </label>
                    );
                  })}
                </div>
              </div>

              {/* APPLICATION TYPE */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-slate flex items-center">
                  <span className="text-orange mr-2">*</span>
                  APPLICATION TYPE
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {applicationTypes.map((at) => (
                    <label
                      key={at.id}
                      className={`
                        flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all text-center
                        ${selectedApplicationType === at.id
                          ? 'border-orange bg-orange-50 text-orange font-semibold'
                          : 'border-gray-300 hover:border-orange-light hover:bg-gray-50'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="applicationType"
                        value={at.id}
                        checked={selectedApplicationType === at.id}
                        onChange={(e) => setSelectedApplicationType(e.target.value)}
                        className="sr-only"
                      />
                      <span className="text-sm">{at.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* DEFAULT PACKING (optional; falls back to tile size or 10) */}
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="defaultPacking" className="text-lg font-semibold text-slate">
                  Default packing per box
                </Label>
                <Input
                  id="defaultPacking"
                  type="number"
                  min={1}
                  placeholder="From tile size / 10"
                  value={defaultPackingPerBox}
                  onChange={(e) => setDefaultPackingPerBox(e.target.value)}
                />
                <p className="text-xs text-slate-light">Leave empty to use the tile size default or 10.</p>
              </div>

              {/* MAKE TYPE - optional; body type comes from make when linked */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-slate">
                  MAKE TYPE <span className="text-slate-light font-normal text-sm">(optional)</span>
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  <label
                    className={`
                      flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all text-center
                      ${selectedMakeType === ''
                        ? 'border-orange bg-orange-50 text-orange font-semibold'
                        : 'border-gray-300 hover:border-orange-light hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="makeType"
                      value=""
                      checked={selectedMakeType === ''}
                      onChange={() => setSelectedMakeType('')}
                      className="sr-only"
                    />
                    <span className="text-sm">None</span>
                  </label>
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

              {/* BODY TYPE — from tile size when no make type; from make when linked; else pick manually */}
              {showBodyTypeSection && (
                <div className="space-y-3">
                  <Label className="text-lg font-semibold text-slate flex items-center">
                    {bodyManualRequired && (
                      <span className="text-orange mr-2">*</span>
                    )}
                    BODY TYPE
                  </Label>
                  <p className="text-sm text-slate-light">
                    {selectedMakeType
                      ? 'This make type has no linked body type — choose one.'
                      : sizeBodyId
                        ? 'Default comes from the tile size; change below if needed.'
                        : 'Choose body type (this tile size has no default in admin).'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {bodyTypes.map((bt) => (
                      <label
                        key={bt.id}
                        className={`
                          flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all text-center
                          ${selectedBodyType === bt.id
                            ? 'border-orange bg-orange-50 text-orange font-semibold'
                            : 'border-gray-300 hover:border-orange-light hover:bg-gray-50'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="bodyType"
                          value={bt.id}
                          checked={selectedBodyType === bt.id}
                          onChange={(e) => setSelectedBodyType(e.target.value)}
                          className="sr-only"
                        />
                        <span className="text-sm">{bt.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {selectedMakeType && selectedMt?.body_type_id && (
                <p className="text-sm text-slate-light">
                  Body type for products will default from this make type (
                  {bodyTypes.find((b) => b.id === selectedMt.body_type_id)?.name || 'linked type'}
                  ).
                </p>
              )}

              <div className="flex items-start space-x-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4">
                <Checkbox
                  id="reactivateProducts"
                  checked={reactivateProducts}
                  onCheckedChange={(v) => setReactivateProducts(v === true)}
                  className="mt-1 border-orange data-[state=checked]:bg-orange data-[state=checked]:border-orange"
                />
                <div className="space-y-1">
                  <Label htmlFor="reactivateProducts" className="text-sm font-medium text-slate cursor-pointer">
                    {t('inventory:reactivate_products_label')}
                  </Label>
                  <p className="text-xs text-slate-light">{t('inventory:reactivate_products_hint')}</p>
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
                  disabled={!canSubmit || loading}
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
