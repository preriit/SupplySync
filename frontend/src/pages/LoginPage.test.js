import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import api from '../utils/api';

const mockNavigate = jest.fn();

jest.mock('../utils/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage smoke tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.post.mockResolvedValue({
      data: {
        access_token: 'token-1',
        user: { id: 1, user_type: 'dealer', username: 'Dealer One' },
      },
    });
  });

  it('submits login with payload mapped from identifier', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/auth:email_or_mobile/i), 'dealer@example.com');
    await user.type(screen.getByLabelText(/auth:password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /auth:login/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'dealer@example.com',
        phone: undefined,
        password: 'password123',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dealer/dashboard');
  });
});
