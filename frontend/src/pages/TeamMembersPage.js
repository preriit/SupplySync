import React, { useCallback, useEffect, useState } from 'react';
import DealerNav from '../components/DealerNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import api from '../utils/api';

const INITIAL_CREATE_FORM = {
  name: '',
  email: '',
  phone: '',
  user_type: 'staff',
};

const INITIAL_EDIT_FORM = {
  name: '',
  email: '',
  phone: '',
  user_type: 'staff',
  is_active: true,
};

const TeamMembersPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState(null);
  const [updateError, setUpdateError] = useState('');
  const [members, setMembers] = useState([]);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editFormData, setEditFormData] = useState(INITIAL_EDIT_FORM);
  const [formData, setFormData] = useState(INITIAL_CREATE_FORM);

  const getErrorMessage = (error, fallback) => {
    const normalizeMessage = (message) => {
      if (!message) return '';
      const lower = message.toLowerCase();
      if (lower.includes('value is not a valid email address')) {
        return 'Please enter a valid email address or leave Email blank.';
      }
      if (lower === 'network error') {
        return 'Could not connect to server. Please check backend is running and try again.';
      }
      return message;
    };

    const detail = error?.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return normalizeMessage(detail.trim());
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const combined = detail.map((item) => item?.msg || '').filter(Boolean).join(', ');
      return normalizeMessage(combined) || fallback;
    }
    if (error?.message) {
      return normalizeMessage(error.message);
    }
    return fallback;
  };

  const fetchMembers = useCallback(async () => {
    try {
      const response = await api.get('/dealer/team-members');
      setMembers(response.data?.team_members || []);
    } catch (error) {
      toast({
        title: 'Failed to load team members',
        description: error.response?.data?.detail || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateCreateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateEditField = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmedName = formData.name?.trim();
    const trimmedPhone = formData.phone?.trim();
    if (!trimmedName) {
      toast({
        title: 'Name is required',
        description: 'Please enter a name to add a team member.',
        variant: 'destructive',
      });
      return;
    }
    if (!trimmedPhone) {
      toast({
        title: 'Mobile number is required',
        description: 'Please enter a mobile number to add a team member.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const generatedPassword = window.crypto?.randomUUID?.() || `${Date.now()}${Math.random().toString(36).slice(2)}`;
      const payload = {
        ...formData,
        name: trimmedName,
        username: trimmedPhone,
        email: formData.email?.trim() || null,
        phone: trimmedPhone,
        password: generatedPassword,
      };
      await api.post('/dealer/team-members', payload);
      toast({
        title: 'Team member added',
        description: 'New team member is linked to your merchant',
      });
      setFormData(INITIAL_CREATE_FORM);
      fetchMembers();
    } catch (error) {
      toast({
        title: 'Failed to add team member',
        description: error.response?.data?.detail || 'Please verify details and try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (member) => {
    setUpdateError('');
    setEditingMemberId(member.id);
    setEditFormData({
      ...INITIAL_EDIT_FORM,
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      user_type: member.user_type || 'staff',
      is_active: Boolean(member.is_active),
    });
  };

  const cancelEditing = () => {
    setUpdateError('');
    setEditingMemberId(null);
    setEditFormData(INITIAL_EDIT_FORM);
  };

  const handleSaveEdit = async (memberId) => {
    setUpdateError('');
    const trimmedName = editFormData.name?.trim();
    const trimmedPhone = editFormData.phone?.trim();
    const trimmedRole = editFormData.user_type?.trim();

    if (
      editFormData.name == null ||
      editFormData.phone == null ||
      editFormData.user_type == null ||
      editFormData.is_active == null
    ) {
      const message = 'Name, Mobile No., Role and Status are mandatory.';
      setUpdateError(message);
      toast({
        title: 'Missing required fields',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    if (!trimmedName) {
      const message = 'Please enter a name before saving.';
      setUpdateError(message);
      toast({
        title: 'Name is required',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    if (!trimmedPhone) {
      const message = 'Please enter a mobile number before saving.';
      setUpdateError(message);
      toast({
        title: 'Mobile number is required',
        description: message,
        variant: 'destructive',
      });
      return;
    }
    if (!trimmedRole) {
      const message = 'Please select a role before saving.';
      setUpdateError(message);
      toast({
        title: 'Role is required',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    setUpdatingMemberId(memberId);
    try {
      await api.post(`/dealer/team-members/${memberId}/update`, {
        name: trimmedName,
        username: trimmedPhone,
        email: editFormData.email?.trim() || null,
        phone: trimmedPhone,
        user_type: trimmedRole,
        is_active: editFormData.is_active,
      });
      toast({
        title: 'Team member updated',
        description: 'Changes saved successfully.',
      });
      cancelEditing();
      fetchMembers();
    } catch (error) {
      const message = getErrorMessage(error, 'Please verify details and try again');
      setUpdateError(message);
      toast({
        title: 'Failed to update team member',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingMemberId(null);
    }
  };

  return (
    <div className="min-h-screen bg-grey-50">
      <DealerNav />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate">Team Members</h1>
          <p className="text-slate-light mt-1">
            Add and manage staff linked to your merchant account.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tm_name">Name *</Label>
                <Input
                  id="tm_name"
                  value={formData.name}
                  onChange={(e) => updateCreateField('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tm_email">Email</Label>
                <Input
                  id="tm_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateCreateField('email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="tm_phone">Mobile No. *</Label>
                <Input
                  id="tm_phone"
                  value={formData.phone}
                  onChange={(e) => updateCreateField('phone', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tm_type">Role</Label>
                <select
                  id="tm_type"
                  value={formData.user_type}
                  onChange={(e) => updateCreateField('user_type', e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="staff">Staff (view only)</option>
                  <option value="manager">Manager (limited operations)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Button type="submit" className="bg-orange hover:bg-orange-dark" disabled={saving}>
                  {saving ? 'Adding...' : 'Add Team Member'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Team ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-slate-light">Loading...</p>
            ) : members.length === 0 ? (
              <p className="text-slate-light">No team members found yet.</p>
            ) : (
              <div className="overflow-x-auto">
                {updateError ? (
                  <p className="text-sm text-red-600 mb-3">{updateError}</p>
                ) : null}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Name</th>
                      <th className="text-left py-2">Mobile No.</th>
                      <th className="text-left py-2">Email</th>
                      <th className="text-left py-2">Role</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const isEditing = editingMemberId === member.id;
                      const isSavingThisRow = updatingMemberId === member.id;
                      return (
                        <tr key={member.id} className="border-b">
                          <td className="py-2">
                            {isEditing ? (
                              <Input
                                value={editFormData.name}
                                onChange={(e) => updateEditField('name', e.target.value)}
                                required
                              />
                            ) : (
                              member.name || ''
                            )}
                          </td>
                          <td className="py-2">
                            {isEditing ? (
                              <Input
                                value={editFormData.phone}
                                onChange={(e) => updateEditField('phone', e.target.value)}
                                required
                              />
                            ) : (
                              member.phone || ''
                            )}
                          </td>
                          <td className="py-2">
                            {isEditing ? (
                              <Input
                                type="email"
                                value={editFormData.email}
                                onChange={(e) => updateEditField('email', e.target.value)}
                              />
                            ) : (
                              member.email || ''
                            )}
                          </td>
                          <td className="py-2 capitalize">
                            {isEditing ? (
                              <select
                                value={editFormData.user_type}
                                onChange={(e) => updateEditField('user_type', e.target.value)}
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                              >
                                <option value="staff">Staff (view only)</option>
                                <option value="manager">Manager (limited operations)</option>
                              </select>
                            ) : (
                              member.user_type
                            )}
                          </td>
                          <td className="py-2">
                            {isEditing ? (
                              <select
                                value={editFormData.is_active ? 'active' : 'inactive'}
                                onChange={(e) => updateEditField('is_active', e.target.value === 'active')}
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            ) : (
                              member.is_active ? 'Active' : 'Inactive'
                            )}
                          </td>
                          <td className="py-2">
                            {isEditing ? (
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  className="bg-orange hover:bg-orange-dark"
                                  disabled={isSavingThisRow}
                                  onClick={() => handleSaveEdit(member.id)}
                                >
                                  {isSavingThisRow ? 'Saving...' : 'Save'}
                                </Button>
                                <Button type="button" variant="outline" onClick={cancelEditing} disabled={isSavingThisRow}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button type="button" variant="outline" onClick={() => startEditing(member)}>
                                Edit
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamMembersPage;
