import React, { useEffect, useState } from 'react';
import DealerNav from '../components/DealerNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import api from '../utils/api';

const TeamMembersPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState([]);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    user_type: 'staff',
  });

  const fetchMembers = async () => {
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
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        phone: formData.phone?.trim() || null,
      };
      await api.post('/dealer/team-members', payload);
      toast({
        title: 'Team member added',
        description: 'New team member is linked to your merchant',
      });
      setFormData({
        username: '',
        email: '',
        phone: '',
        password: '',
        user_type: 'staff',
      });
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
                <Label htmlFor="tm_username">Username</Label>
                <Input
                  id="tm_username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tm_email">Email</Label>
                <Input
                  id="tm_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tm_phone">Phone (optional)</Label>
                <Input
                  id="tm_phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tm_password">Password</Label>
                <Input
                  id="tm_password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tm_type">Role</Label>
                <select
                  id="tm_type"
                  value={formData.user_type}
                  onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Username</th>
                      <th className="text-left py-2">Email</th>
                      <th className="text-left py-2">Role</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b">
                        <td className="py-2">{member.username}</td>
                        <td className="py-2">{member.email}</td>
                        <td className="py-2 capitalize">{member.user_type}</td>
                        <td className="py-2">{member.is_active ? 'Active' : 'Inactive'}</td>
                      </tr>
                    ))}
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
