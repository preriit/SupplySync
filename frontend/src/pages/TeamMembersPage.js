import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [activeSection, setActiveSection] = useState('active');
  const [nameSortDirection, setNameSortDirection] = useState('asc');
  const [roleSortDirection, setRoleSortDirection] = useState('asc');
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editFormData, setEditFormData] = useState(INITIAL_EDIT_FORM);
  const [formData, setFormData] = useState(INITIAL_CREATE_FORM);
  const [createOtpRequested, setCreateOtpRequested] = useState(false);
  const [createRequestId, setCreateRequestId] = useState('');
  const [createOtp, setCreateOtp] = useState('');
  const [createPayload, setCreatePayload] = useState(null);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [createFlowMessage, setCreateFlowMessage] = useState('');
  const [createDevOtp, setCreateDevOtp] = useState('');
  const [editOtpRequestedForMember, setEditOtpRequestedForMember] = useState(null);
  const [editRequestId, setEditRequestId] = useState('');
  const [editOtp, setEditOtp] = useState('');
  const [editOtpCooldown, setEditOtpCooldown] = useState(0);
  const [editDevOtp, setEditDevOtp] = useState('');

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

  const memberCounts = useMemo(() => {
    const active = members.filter((member) => member.is_active).length;
    const inactive = members.filter((member) => !member.is_active).length;
    return { active, inactive, all: members.length };
  }, [members]);

  // Keep the operational list focused by default (active users first),
  // while still allowing quick access to inactive records for reactivation/history.
  const visibleMembers = useMemo(() => {
    if (activeSection === 'inactive') {
      return members.filter((member) => !member.is_active);
    }
    if (activeSection === 'all') {
      return members;
    }
    return members.filter((member) => member.is_active);
  }, [members, activeSection]);

  const sortedVisibleMembers = useMemo(() => {
    // Section filter runs first, then sorting applies to current view only.
    // Primary sort: role, Secondary sort: name (stable tie-breaker for readability).
    return [...visibleMembers].sort((a, b) => {
      const roleLeft = (a.user_type || '').trim().toLowerCase();
      const roleRight = (b.user_type || '').trim().toLowerCase();
      const roleComparison = roleLeft.localeCompare(roleRight);
      if (roleComparison !== 0) {
        return roleSortDirection === 'asc' ? roleComparison : -roleComparison;
      }

      const left = (a.name || '').trim().toLowerCase();
      const right = (b.name || '').trim().toLowerCase();
      const comparison = left.localeCompare(right);
      return nameSortDirection === 'asc' ? comparison : -comparison;
    });
  }, [visibleMembers, nameSortDirection, roleSortDirection]);

  const toggleNameSort = () => {
    setNameSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const toggleRoleSort = () => {
    setRoleSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateFlowMessage('');
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
    const payload = {
      ...formData,
      name: trimmedName,
      username: trimmedPhone,
      email: formData.email?.trim() || null,
      phone: trimmedPhone,
      // Keep generated password server-side compatible without exposing a manual password step.
      password: window.crypto?.randomUUID?.() || `${Date.now()}${Math.random().toString(36).slice(2)}`,
    };

    setSaving(true);
    try {
      if (!createOtpRequested) {
        const response = await api.post('/dealer/team-members/request-create', payload);
        setCreatePayload(payload);
        setCreateOtpRequested(true);
        setCreateRequestId(response.data?.request_id || '');
        setOtpCooldown(Number(response.data?.cooldown_seconds) || 30);
        setCreateDevOtp(response.data?.dev_only_otp || '');
        setCreateFlowMessage('OTP sent for approval. Enter OTP below to complete team-member creation.');
        toast({
          title: 'OTP sent',
          description: response.data?.dev_only_otp
            ? `Approval OTP sent. Dev OTP: ${response.data.dev_only_otp}`
            : 'Approval OTP sent to merchant mobile.',
        });
      } else {
        if (!createOtp.trim()) {
          toast({
            title: 'OTP is required',
            description: 'Please enter the approval OTP.',
            variant: 'destructive',
          });
          return;
        }
        await api.post('/dealer/team-members/confirm-create', {
          request_id: createRequestId,
          otp: createOtp.trim(),
        });
        toast({
          title: 'Team member added',
          description: 'New team member is linked to your merchant',
        });
        setFormData(INITIAL_CREATE_FORM);
        setCreateOtpRequested(false);
        setCreateRequestId('');
        setCreateOtp('');
        setCreatePayload(null);
        setOtpCooldown(0);
        setCreateFlowMessage('');
        setCreateDevOtp('');
        fetchMembers();
      }
    } catch (error) {
      const status = error?.response?.status;
      let message = getErrorMessage(error, 'Please verify details and try again');
      if (!createOtpRequested && status === 404) {
        message = 'Team-member OTP endpoint is not available. Restart backend to load latest code.';
      }
      setCreateFlowMessage(message);
      toast({
        title: createOtpRequested ? 'Failed to verify OTP' : 'Failed to send approval OTP',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (otpCooldown <= 0) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpCooldown]);

  const resendCreateOtp = async () => {
    if (!createPayload) {
      return;
    }
    setSaving(true);
    try {
      const response = await api.post('/dealer/team-members/request-create', createPayload);
      setCreateRequestId(response.data?.request_id || '');
      setOtpCooldown(Number(response.data?.cooldown_seconds) || 30);
      setCreateDevOtp(response.data?.dev_only_otp || '');
      setCreateFlowMessage('OTP resent for approval. Enter the latest OTP to continue.');
      toast({
        title: 'OTP resent',
        description: response.data?.dev_only_otp
          ? `Approval OTP resent. Dev OTP: ${response.data.dev_only_otp}`
          : 'Approval OTP sent to merchant mobile.',
      });
    } catch (error) {
      toast({
        title: 'Failed to resend OTP',
        description: getErrorMessage(error, 'Please try again shortly.'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (member) => {
    setUpdateError('');
    setEditingMemberId(member.id);
    setEditOtpRequestedForMember(null);
    setEditRequestId('');
    setEditOtp('');
    setEditOtpCooldown(0);
    setEditDevOtp('');
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
    setEditOtpRequestedForMember(null);
    setEditRequestId('');
    setEditOtp('');
    setEditOtpCooldown(0);
    setEditDevOtp('');
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
      const payload = {
        name: trimmedName,
        username: trimmedPhone,
        email: editFormData.email?.trim() || null,
        phone: trimmedPhone,
        user_type: trimmedRole,
        is_active: editFormData.is_active,
      };

      if (editOtpRequestedForMember !== memberId) {
        const response = await api.post('/dealer/team-members/request-update', {
          member_id: memberId,
          ...payload,
        });
        setEditOtpRequestedForMember(memberId);
        setEditRequestId(response.data?.request_id || '');
        setEditOtp('');
        setEditOtpCooldown(Number(response.data?.cooldown_seconds) || 30);
        setEditDevOtp(response.data?.dev_only_otp || '');
        toast({
          title: 'OTP sent',
          description: response.data?.dev_only_otp
            ? `Approval OTP sent. Dev OTP: ${response.data.dev_only_otp}`
            : 'Approval OTP sent to merchant mobile.',
        });
      } else {
        if (!editOtp.trim()) {
          const message = 'Please enter OTP before saving.';
          setUpdateError(message);
          toast({
            title: 'OTP is required',
            description: message,
            variant: 'destructive',
          });
          return;
        }
        await api.post('/dealer/team-members/confirm-update', {
          request_id: editRequestId,
          otp: editOtp.trim(),
        });
        toast({
          title: 'Team member updated',
          description: 'Changes saved successfully.',
        });
        cancelEditing();
        fetchMembers();
      }
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

  useEffect(() => {
    if (editOtpCooldown <= 0) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setEditOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [editOtpCooldown]);

  const resendEditOtp = async (memberId) => {
    const trimmedName = editFormData.name?.trim();
    const trimmedPhone = editFormData.phone?.trim();
    const trimmedRole = editFormData.user_type?.trim();
    if (!trimmedName || !trimmedPhone || !trimmedRole || editFormData.is_active == null) {
      return;
    }
    setUpdatingMemberId(memberId);
    try {
      const response = await api.post('/dealer/team-members/request-update', {
        member_id: memberId,
        name: trimmedName,
        username: trimmedPhone,
        email: editFormData.email?.trim() || null,
        phone: trimmedPhone,
        user_type: trimmedRole,
        is_active: editFormData.is_active,
      });
      setEditRequestId(response.data?.request_id || '');
      setEditOtpCooldown(Number(response.data?.cooldown_seconds) || 30);
      setEditDevOtp(response.data?.dev_only_otp || '');
      toast({
        title: 'OTP resent',
        description: response.data?.dev_only_otp
          ? `Approval OTP resent. Dev OTP: ${response.data.dev_only_otp}`
          : 'Approval OTP sent to merchant mobile.',
      });
    } catch (error) {
      const message = getErrorMessage(error, 'Please try again shortly.');
      setUpdateError(message);
      toast({
        title: 'Failed to resend OTP',
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
                  {saving ? (createOtpRequested ? 'Verifying...' : 'Sending OTP...') : (createOtpRequested ? 'Verify OTP & Add Team Member' : 'Add Team Member')}
                </Button>
                {createOtpRequested ? (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="tm_create_otp">Approval OTP *</Label>
                    <Input
                      id="tm_create_otp"
                      value={createOtp}
                      onChange={(e) => setCreateOtp(e.target.value)}
                      placeholder="Enter OTP sent to merchant mobile"
                      required
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-sm text-orange hover:underline disabled:text-slate-400 disabled:cursor-not-allowed"
                        onClick={resendCreateOtp}
                        disabled={saving || otpCooldown > 0}
                      >
                        {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP'}
                      </button>
                      <button
                        type="button"
                        className="text-sm text-slate-light hover:underline"
                        onClick={() => {
                          setCreateOtpRequested(false);
                          setCreateRequestId('');
                          setCreateOtp('');
                          setCreatePayload(null);
                          setOtpCooldown(0);
                          setCreateFlowMessage('');
                          setCreateDevOtp('');
                        }}
                      >
                        Cancel OTP flow
                      </button>
                    </div>
                    {createDevOtp ? (
                      <p className="text-sm text-orange font-medium">
                        Dev OTP: {createDevOtp}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {createFlowMessage ? (
                  <p className={`mt-2 text-sm ${createOtpRequested ? 'text-slate-light' : 'text-red-600'}`}>
                    {createFlowMessage}
                  </p>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Team ({memberCounts.all})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <Button
                type="button"
                variant={activeSection === 'active' ? 'default' : 'outline'}
                className={activeSection === 'active' ? 'bg-orange hover:bg-orange-dark' : ''}
                onClick={() => setActiveSection('active')}
              >
                Active ({memberCounts.active})
              </Button>
              <Button
                type="button"
                variant={activeSection === 'inactive' ? 'default' : 'outline'}
                className={activeSection === 'inactive' ? 'bg-orange hover:bg-orange-dark' : ''}
                onClick={() => setActiveSection('inactive')}
              >
                Inactive ({memberCounts.inactive})
              </Button>
              <Button
                type="button"
                variant={activeSection === 'all' ? 'default' : 'outline'}
                className={activeSection === 'all' ? 'bg-orange hover:bg-orange-dark' : ''}
                onClick={() => setActiveSection('all')}
              >
                All ({memberCounts.all})
              </Button>
            </div>
            {loading ? (
              <p className="text-slate-light">Loading...</p>
            ) : visibleMembers.length === 0 ? (
              <p className="text-slate-light">
                {activeSection === 'inactive'
                  ? 'No inactive team members found.'
                  : activeSection === 'active'
                    ? 'No active team members found.'
                    : 'No team members found yet.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                {updateError ? (
                  <p className="text-sm text-red-600 mb-3">{updateError}</p>
                ) : null}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-semibold hover:text-orange"
                          onClick={toggleNameSort}
                          title={`Sort name ${nameSortDirection === 'asc' ? 'descending' : 'ascending'}`}
                        >
                          Name
                          <span className="text-xs text-slate-light">
                            {nameSortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        </button>
                      </th>
                      <th className="text-left py-2">Mobile No.</th>
                      <th className="text-left py-2">Email</th>
                      <th className="text-left py-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-semibold hover:text-orange"
                          onClick={toggleRoleSort}
                          title={`Sort role ${roleSortDirection === 'asc' ? 'descending' : 'ascending'}`}
                        >
                          Role
                          <span className="text-xs text-slate-light">
                            {roleSortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        </button>
                      </th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedVisibleMembers.map((member) => {
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
                              <div className="flex flex-col gap-2">
                                {editOtpRequestedForMember === member.id ? (
                                  <>
                                    <Input
                                      value={editOtp}
                                      onChange={(e) => setEditOtp(e.target.value)}
                                      placeholder="Enter approval OTP"
                                    />
                                    {editDevOtp ? (
                                      <p className="text-xs text-orange font-medium">Dev OTP: {editDevOtp}</p>
                                    ) : null}
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        className="text-xs text-orange hover:underline disabled:text-slate-400 disabled:cursor-not-allowed"
                                        onClick={() => resendEditOtp(member.id)}
                                        disabled={isSavingThisRow || editOtpCooldown > 0}
                                      >
                                        {editOtpCooldown > 0 ? `Resend OTP in ${editOtpCooldown}s` : 'Resend OTP'}
                                      </button>
                                    </div>
                                  </>
                                ) : null}
                                <div className="flex gap-2">
                                <Button
                                  type="button"
                                  className="bg-orange hover:bg-orange-dark"
                                  disabled={isSavingThisRow}
                                  onClick={() => handleSaveEdit(member.id)}
                                >
                                  {isSavingThisRow
                                    ? 'Saving...'
                                    : editOtpRequestedForMember === member.id
                                      ? 'Verify OTP & Save'
                                      : 'Save'}
                                </Button>
                                <Button type="button" variant="outline" onClick={cancelEditing} disabled={isSavingThisRow}>
                                  Cancel
                                </Button>
                                </div>
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
