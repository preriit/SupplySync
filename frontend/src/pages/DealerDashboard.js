import React from 'react';
import { useTranslation } from 'react-i18next';

const DealerDashboard = () => {
  const { t } = useTranslation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="min-h-screen bg-grey-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-bold text-slate mb-4">
          {t('common:welcome')}, {user.username}!
        </h1>
        <p className="text-slate-light">
          Dealer Dashboard - Coming soon
        </p>
      </div>
    </div>
  );
};

export default DealerDashboard;
