import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('@supplysync/core', () => {
  const actual = jest.requireActual('@supplysync/core');
  return {
    ...actual,
    createWebAuthHelpers: () => ({
      isAuthenticated: () => false,
      requireRole: () => false,
    }),
  };
});

jest.mock('./pages/DealerDashboard', () => () => <div>Dealer Dashboard</div>);
jest.mock('./pages/SubCategoriesList', () => () => <div>SubCategories List</div>);
jest.mock('./pages/AddSubCategory', () => () => <div>AddSubCategory</div>);
jest.mock('./pages/ProductsList', () => () => <div>ProductsList</div>);
jest.mock('./pages/AddProduct', () => () => <div>AddProduct</div>);
jest.mock('./pages/ProductDetail', () => () => <div>ProductDetail</div>);
jest.mock('./pages/StockAlertsPage', () => () => <div>StockAlertsPage</div>);
jest.mock('./pages/DealerComingSoon', () => () => <div>DealerComingSoon</div>);
jest.mock('./pages/TeamMembersPage', () => () => <div>TeamMembersPage</div>);
jest.mock('./pages/DealerProfile', () => () => <div>DealerProfile</div>);
jest.mock('./pages/AdminLogin', () => () => <div>AdminLogin</div>);
jest.mock('./pages/AdminDashboard', () => () => <div>AdminDashboard</div>);
jest.mock('./pages/AdminUsers', () => () => <div>AdminUsers</div>);
jest.mock('./pages/AdminMerchants', () => () => <div>AdminMerchants</div>);
jest.mock('./pages/AdminReferenceData', () => () => <div>AdminReferenceData</div>);
jest.mock('./pages/AdminAnalytics', () => () => <div>AdminAnalytics</div>);

describe('Protected route smoke tests', () => {
  it('redirects unauthenticated dealer route access to login page', () => {
    window.history.pushState({}, 'Test page', '/dealer/dashboard');
    render(<App />);
    expect(screen.getByText('Welcome back!')).toBeInTheDocument();
  });
});
