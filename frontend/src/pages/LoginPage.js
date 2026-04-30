import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { createSessionManager, webStorage } from '@supplysync/core';
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
  const dealerSessionManager = createSessionManager(webStorage);

  useEffect(() => {
    if (otpCooldown <= 0) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpCooldown]);

  const completeLogin = async (response) => {
    const { access_token, user } = response.data;

    await dealerSessionManager.setSession({
      token: access_token,
      user,
      scope: 'dealer',
    });

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
      await completeLogin(response);
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
      await completeLogin(response);
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
    <div className="min-h-screen bg-[#F6F7FB] p-4 md:p-8">
      <div className="mx-auto max-w-[1280px] min-h-[calc(100vh-2rem)] rounded-2xl border border-app-border bg-white overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between p-10 bg-[#FAFBFD] border-r border-app-border">
          <div>
            <h1 className="text-4xl font-display font-bold text-orange mb-10">{t('common:app_name')}</h1>
            <h2 className="text-5xl font-display font-bold text-slate leading-tight">
              Smart inventory.
              <br />
              Stronger business.
            </h2>
            <p className="text-slate-light mt-4 text-lg">
              Real-time control over your stock, anytime, anywhere.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm text-slate-light">
            <div><p className="font-semibold text-slate">Track Stock</p><p>in Real Time</p></div>
            <div><p className="font-semibold text-slate">Reduce Losses</p><p>& Save More</p></div>
            <div><p className="font-semibold text-slate">Make Smarter</p><p>Decisions</p></div>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-lg border-app-border rounded-2xl shadow-panel">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display">
              Welcome back!
            </CardTitle>
            <CardDescription>
              Login to your account
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

              <div className="grid grid-cols-2 gap-2 border-b border-app-border pb-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setLoginMethod('password');
                    setOtpRequested(false);
                    setOtp('');
                    setOtpCooldown(0);
                    setError('');
                    setInfoMessage('');
                  }}
                  disabled={loading}
                  className={`rounded-none ${loginMethod === 'password' ? 'text-orange border-b-2 border-orange' : 'text-slate-light'}`}
                >
                  Password
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setLoginMethod('otp');
                    setPassword('');
                    setError('');
                    setInfoMessage('');
                  }}
                  disabled={loading}
                  className={`rounded-none ${loginMethod === 'otp' ? 'text-orange border-b-2 border-orange' : 'text-slate-light'}`}
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
                className="w-full bg-orange hover:bg-orange-dark rounded-md"
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
    </div>
  );
};

export default LoginPage;
