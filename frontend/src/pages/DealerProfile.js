import React, { useEffect, useState } from 'react';
import DealerPageShell from '../components/DealerPageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Save, CheckCircle2, AlertCircle, Pencil, X } from 'lucide-react';
import api from '../utils/api';
import SectionHeader from '@/components/theme/SectionHeader';
import AppBreadcrumb from '@/components/theme/AppBreadcrumb';

const DealerProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    preferred_language: 'en',
    user_type: '',
    merchant_id: '',
  });
  const [originalData, setOriginalData] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/me');
      const user = response.data || {};
      setFormData({
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || JSON.parse(localStorage.getItem('user') || '{}').phone || '',
        preferred_language: user.preferred_language || 'en',
        user_type: user.user_type || '',
        merchant_id: user.merchant_id || '',
      });
      setOriginalData({
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || JSON.parse(localStorage.getItem('user') || '{}').phone || '',
        preferred_language: user.preferred_language || 'en',
        user_type: user.user_type || '',
        merchant_id: user.merchant_id || '',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to load profile',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isEditing) return;
    setMessage(null);
    setSaving(true);
    try {
      const payload = {
        username: formData.username,
        phone: formData.phone,
        preferred_language: formData.preferred_language,
      };
      const response = await api.put('/auth/me', payload);
      const updated = response.data || {};

      const existingLocal = JSON.parse(localStorage.getItem('user') || '{}');
      const mergedLocal = {
        ...existingLocal,
        username: updated.username || existingLocal.username,
        preferred_language: updated.preferred_language || existingLocal.preferred_language,
      };
      if (formData.phone) mergedLocal.phone = formData.phone;
      localStorage.setItem('user', JSON.stringify(mergedLocal));

      setFormData((prev) => ({
        ...prev,
        username: updated.username || prev.username,
        phone: updated.phone ?? prev.phone,
        preferred_language: updated.preferred_language || prev.preferred_language,
      }));
      setOriginalData((prev) => ({
        ...(prev || {}),
        username: updated.username || formData.username,
        email: formData.email,
        phone: updated.phone ?? formData.phone,
        preferred_language: updated.preferred_language || formData.preferred_language,
        user_type: formData.user_type,
        merchant_id: formData.merchant_id,
      }));
      setMessage({
        type: 'success',
        text: 'Profile updated successfully',
      });
      setIsEditing(false);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to update profile',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setMessage(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (originalData) {
      setFormData(originalData);
    }
    setMessage(null);
    setIsEditing(false);
  };

  return (
    <DealerPageShell contentClassName="max-w-4xl mx-auto px-4 py-8">
        <AppBreadcrumb
          items={[
            { label: 'Home', to: '/dealer/dashboard' },
            { label: 'Settings', to: '/dealer/profile' },
          ]}
        />
        <SectionHeader
          title="Profile"
          subtitle="Manage your account details."
        />

        {/* Implementation plan notes (requested):
           Phase 1 (implemented): profile read/update for username, phone, preferred language.
           Phase 2 (planned): password change, business profile fields, and security/session controls.
        */}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-orange" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-slate-light">Loading profile...</p>
            ) : (
              <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
                {message && (
                  <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                    {message.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{message.text}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Name</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (read-only)</Label>
                    <Input id="email" value={formData.email} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Preferred Language</Label>
                    <Select
                      value={formData.preferred_language}
                      onValueChange={(v) => setFormData({ ...formData, preferred_language: v })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>User Type (read-only)</Label>
                    <Input value={formData.user_type || 'dealer'} disabled />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  {isEditing ? (
                    <>
                      <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-orange hover:bg-orange-dark"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button type="button" onClick={handleEdit} className="bg-orange hover:bg-orange-dark">
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
    </DealerPageShell>
  );
};

export default DealerProfile;
