import React from 'react';
import { useNavigate } from 'react-router-dom';
import DealerNav from '../components/DealerNav';
import ComingSoonCard from '../components/ComingSoonCard';
import { Rocket, Package } from 'lucide-react';

const DealerComingSoon = ({ title, blurb }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-grey-50">
      <DealerNav />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <ComingSoonCard
          variant="dealer"
          icon={Rocket}
          title={title}
          blurb={blurb}
          note="We are brewing this feature with extra caffeine and clean queries."
          badgeText="Coming soon, but with style."
          actions={[
            {
              label: 'Go to Inventory',
              onClick: () => navigate('/dealer/inventory'),
              icon: Package,
              className: 'bg-orange hover:bg-orange-dark',
            },
            {
              label: 'Back to Dashboard',
              onClick: () => navigate('/dealer/dashboard'),
              variant: 'outline',
              className: 'border-orange text-orange hover:bg-orange-50',
              trailingArrow: true,
            },
          ]}
        />
      </div>
    </div>
  );
};

export default DealerComingSoon;
