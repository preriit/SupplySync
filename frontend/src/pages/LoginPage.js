import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const resolveLoginErrorMessage = (err, fallbackMessage) => {
  const detail = err?.response?.data?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  // FastAPI/Pydantic validation errors often return `detail` as an array of objects.
  if (Array.isArray(detail)) {
    const firstDetail = detail.find((item) => typeof item?.msg === 'string');
    const firstMessage = firstDetail?.msg;
    if (firstMessage) {
      if (
        firstMessage.toLowerCase().includes('field required') &&
        ['email', 'phone', 'password', 'otp'].includes(firstDetail?.loc?.[firstDetail.loc.length - 1])
      ) {
        if (firstDetail?.loc?.[firstDetail.loc.length - 1] === 'otp') {
          return 'Please enter OTP.';
        }
        return 'Please enter email/mobile and password.';
      }
      if (firstMessage.toLowerCase().includes('either email or phone is required')) {
        return 'Please enter email or mobile number.';
      }
      return firstMessage;
    }
  }

  return fallbackMessage;
};

const LoginPage = () => {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loginMethod, setLoginMethod] = useState('password');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [infoMessage, setInfoMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (otpCooldown <= 0) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpCooldown]);

  const completeLogin = (response) => {
    const { access_token, user } = response.data;

    // Save token and user info
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(user));

    // Redirect based on user type
    if (['dealer', 'manager', 'staff'].includes(user.user_type)) {
      navigate('/dealer/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handlePasswordLogin = async () => {
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const trimmedIdentifier = identifier.trim();
      const isPhoneIdentifier = !trimmedIdentifier.includes('@');

      const response = await api.post('/auth/login', {
        // Phase 1: send one identity field based on user input type.
        email: isPhoneIdentifier ? undefined : trimmedIdentifier,
        phone: isPhoneIdentifier ? trimmedIdentifier : undefined,
        password,
      });
      completeLogin(response);
    } catch (err) {
      setError(resolveLoginErrorMessage(err, t('auth:errors.invalid_credentials')));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login/request-otp', {
        phone: identifier.trim(),
      });
      setOtpRequested(true);
      setOtpCooldown(Number(response.data?.cooldown_seconds) || 30);
      setInfoMessage(
        response.data?.dev_only_otp
          ? `OTP sent. Dev OTP: ${response.data.dev_only_otp}`
          : 'OTP sent to your mobile number.'
      );
    } catch (err) {
      setError(resolveLoginErrorMessage(err, 'Unable to send OTP. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login/verify-otp', {
        phone: identifier.trim(),
        otp: otp.trim(),
      });
      completeLogin(response);
    } catch (err) {
      setError(resolveLoginErrorMessage(err, 'Invalid or expired OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loginMethod === 'password') {
      await handlePasswordLogin();
      return;
    }
    if (!otpRequested) {
      await handleRequestOtp();
      return;
    }
    await handleVerifyOtp();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-grey-50">
      <div className="w-full max-w-md px-4">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-orange mb-2">
            {t('common:app_name')}
          </h1>
          <p className="text-slate-light">
            {t('common:welcome')}
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-display">
              {t('auth:login')}
            </CardTitle>
            <CardDescription>
              {loginMethod === 'password'
                ? 'Enter your credentials to access your account'
                : 'Use mobile OTP to access your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {infoMessage && (
                <Alert>
                  <AlertDescription>{infoMessage}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={loginMethod === 'password' ? 'default' : 'outline'}
                  onClick={() => {
                    setLoginMethod('password');
                    setOtpRequested(false);
                    setOtp('');
                    setOtpCooldown(0);
                    setError('');
                    setInfoMessage('');
                  }}
                  disabled={loading}
                >
                  Password
                </Button>
                <Button
                  type="button"
                  variant={loginMethod === 'otp' ? 'default' : 'outline'}
                  onClick={() => {
                    setLoginMethod('otp');
                    setPassword('');
                    setError('');
                    setInfoMessage('');
                  }}
                  disabled={loading}
                >
                  OTP
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="identifier">
                  {loginMethod === 'password' ? t('auth:email_or_mobile') : 'Mobile No.'}
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder={loginMethod === 'password' ? 'dealer@example.com / 9876543210' : '9876543210'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {loginMethod === 'password' ? (
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth:password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <div className="text-right">
                    <Link to="/forgot-password" className="text-sm text-orange hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                </div>
              ) : (
                otpRequested && (
                  <div className="space-y-2">
                    <Label htmlFor="otp">OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                )
              )}

              <Button 
                type="submit" 
                className="w-full bg-orange hover:bg-orange-dark"
                disabled={loading}
              >
                {loading
                  ? t('common:loading')
                  : loginMethod === 'password'
                    ? t('auth:login')
                    : otpRequested
                      ? 'Verify OTP'
                      : 'Send OTP'}
              </Button>
              {loginMethod === 'otp' && otpRequested && (
                <div className="text-center text-sm">
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading || otpCooldown > 0}
                    className="text-orange disabled:text-slate-400 disabled:cursor-not-allowed hover:underline"
                  >
                    {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              )}
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              {t('auth:no_account')}{' '}
              <a href="/signup" className="text-orange hover:underline">
                {t('auth:sign_up')}
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
