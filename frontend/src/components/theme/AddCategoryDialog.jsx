import React, { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../utils/api';

/**
 * Modal-based category creation flow.
 * Keeps user on inventory page while reusing existing create-category payload logic.
 */
const AddCategoryDialog = ({ open, onOpenChange, onCreated }) => {
  const [sizes, setSizes] = useState([]);
  const [makeTypes, setMakeTypes] = useState([]);
  const [applicationTypes, setApplicationTypes] = useState([]);
  const [bodyTypes, setBodyTypes] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [selectedSizeId, setSelectedSizeId] = useState('');
  const [selectedMakeType, setSelectedMakeType] = useState('');
  const [selectedApplicationType, setSelectedApplicationType] = useState('');
  const [selectedBodyType, setSelectedBodyType] = useState('');
  const [defaultPackingPerBox, setDefaultPackingPerBox] = useState('');
  const [reactivateProducts, setReactivateProducts] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchReferenceData = async () => {
      setLoadingRefs(true);
      try {
        const [sizesRes, makeTypesRes, appRes, bodyRes] = await Promise.all([
          api.get('/reference/tile-sizes'),
          api.get('/reference/make-types'),
          api.get('/reference/application-types'),
          api.get('/reference/body-types'),
        ]);
        setSizes(sizesRes.data.sizes || []);
        setMakeTypes(makeTypesRes.data.make_types || []);
        setApplicationTypes(appRes.data.application_types || []);
        setBodyTypes(bodyRes.data.body_types || []);
      } finally {
        setLoadingRefs(false);
      }
    };
    fetchReferenceData();
  }, [open]);

  useEffect(() => {
    if (!selectedSizeId) {
      setDefaultPackingPerBox('');
      return;
    }
    const size = sizes.find((x) => x.id === selectedSizeId);
    if (size?.default_packaging_per_box != null) {
      setDefaultPackingPerBox(String(size.default_packaging_per_box));
    }
  }, [selectedSizeId, sizes]);

  const selectedMt = useMemo(
    () => makeTypes.find((m) => m.id === selectedMakeType),
    [makeTypes, selectedMakeType],
  );
  const selectedSize = useMemo(
    () => sizes.find((s) => s.id === selectedSizeId),
    [sizes, selectedSizeId],
  );
  const sizeBodyId = selectedSize?.body_type_id;
  const bodyManualRequired = (!selectedMakeType && !sizeBodyId) || !!(selectedMakeType && selectedMt && !selectedMt.body_type_id);

  useEffect(() => {
    if (!selectedMakeType && sizeBodyId) {
      setSelectedBodyType(sizeBodyId);
    }
  }, [selectedMakeType, sizeBodyId]);

  const resetForm = () => {
    setSelectedSizeId('');
    setSelectedMakeType('');
    setSelectedApplicationType('');
    setSelectedBodyType('');
    setDefaultPackingPerBox('');
    setReactivateProducts(false);
    setMessage(null);
  };

  const canSubmit = Boolean(
    selectedSizeId &&
    selectedApplicationType &&
    (selectedMakeType ? (selectedMt?.body_type_id || selectedBodyType) : (sizeBodyId || selectedBodyType)),
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        size_id: selectedSizeId,
        application_type_id: selectedApplicationType,
      };
      const packing = parseInt(defaultPackingPerBox, 10);
      if (!Number.isNaN(packing) && packing >= 1) payload.default_packing_per_box = packing;
      if (selectedMakeType) {
        payload.make_type_id = selectedMakeType;
        if (selectedMt && !selectedMt.body_type_id) payload.body_type_id = selectedBodyType;
      } else if (selectedBodyType || sizeBodyId) {
        payload.body_type_id = selectedBodyType || sizeBodyId;
      }
      if (reactivateProducts) payload.reactivate_products = true;

      const response = await api.post('/dealer/subcategories', payload);
      setMessage({
        type: response.data?.exists ? 'warning' : 'success',
        text: response.data?.message || 'Category added',
      });
      onCreated?.();
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 600);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to create category',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => {
      onOpenChange(next);
      if (!next) resetForm();
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
          <DialogDescription>Create a new category without leaving this page.</DialogDescription>
        </DialogHeader>
        {message ? (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Size *</Label>
              <Select value={selectedSizeId} onValueChange={setSelectedSizeId} disabled={loadingRefs || saving}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  {sizes.map((size) => (
                    <SelectItem key={size.id} value={size.id}>{size.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Application Type *</Label>
              <Select value={selectedApplicationType} onValueChange={setSelectedApplicationType} disabled={loadingRefs || saving}>
                <SelectTrigger><SelectValue placeholder="Select application type" /></SelectTrigger>
                <SelectContent>
                  {applicationTypes.map((at) => (
                    <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Make Type (optional)</Label>
              <Select value={selectedMakeType || 'none'} onValueChange={(v) => setSelectedMakeType(v === 'none' ? '' : v)} disabled={loadingRefs || saving}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {makeTypes.map((mt) => (
                    <SelectItem key={mt.id} value={mt.id}>{mt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Body Type {bodyManualRequired ? '*' : '(auto/optional)'}</Label>
              <Select value={selectedBodyType || 'none'} onValueChange={(v) => setSelectedBodyType(v === 'none' ? '' : v)} disabled={loadingRefs || saving}>
                <SelectTrigger><SelectValue placeholder="Select body type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {bodyTypes.map((bt) => (
                    <SelectItem key={bt.id} value={bt.id}>{bt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default packing per box</Label>
              <Input
                type="number"
                min={1}
                value={defaultPackingPerBox}
                onChange={(e) => setDefaultPackingPerBox(e.target.value)}
                disabled={loadingRefs || saving}
              />
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-md border p-3">
            <Checkbox
              id="reactivateProductsInModal"
              checked={reactivateProducts}
              onCheckedChange={(v) => setReactivateProducts(v === true)}
              disabled={saving}
            />
            <Label htmlFor="reactivateProductsInModal" className="text-sm">
              Reactivate matching inactive products, if found
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" className="bg-orange hover:bg-orange-dark" disabled={!canSubmit || saving}>
              {saving ? 'Adding...' : 'Add Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCategoryDialog;
