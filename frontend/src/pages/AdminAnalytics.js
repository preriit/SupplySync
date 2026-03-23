import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import ComingSoonCard from '../components/ComingSoonCard';
import { BarChart3, LayoutDashboard } from 'lucide-react';

const AdminAnalytics = () => {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div className="min-h-[80vh] flex items-center justify-center">
        <ComingSoonCard
          variant="admin"
          icon={BarChart3}
          title="Analytics"
          blurb="This section is coming soon with trends, KPIs, and actionable insights."
          note="We're calibrating the charts so the numbers don't lie."
          badgeText="Coming soon, but not quietly."
          actions={[
            {
              label: 'Back to Dashboard',
              onClick: () => navigate('/admin/dashboard'),
              icon: LayoutDashboard,
              className: 'bg-orange hover:bg-orange-dark',
            },
            {
              label: 'Open Reference Data',
              onClick: () => navigate('/admin/reference-data'),
              variant: 'outline',
              className: 'border-slate-600 text-slate-200 hover:bg-slate-700',
              trailingArrow: true,
            },
          ]}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
