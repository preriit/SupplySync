import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignUpPage from './SignUpPage';
import api from '../utils/api';

const mockToast = jest.fn();

jest.mock('../utils/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('SignUpPage smoke tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows schema validation errors and blocks submit on invalid form', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Business name is required')).toBeInTheDocument();
    expect(screen.getByText('Owner name is required')).toBeInTheDocument();
    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();

    expect(api.post).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Validation Error',
      })
    );
  });
});
