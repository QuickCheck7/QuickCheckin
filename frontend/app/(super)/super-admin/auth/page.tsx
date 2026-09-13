'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowRight, Home, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { setSuperAdminAuth, isSuperAdminAuthenticated } from '@/lib/super-admin-auth';

type LoginErrors = { email?: string; password?: string; form?: string };
type ResetErrors = { email?: string; otp?: string; newPassword?: string; form?: string };

type LoginSuccess = {
  message: string;
  token: string;
  superAdmin?: { id?: string; email?: string; phone?: string };
};

type ApiMessage = { message?: string };

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '') || '';

export default function SuperAdminAuth() {
  const router = useRouter();

  // Sign-in
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Forgot/Reset (OTP)
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetErrors, setResetErrors] = useState<ResetErrors>({});
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperAdminAuthenticated()) {
      router.replace('/super-admin/restaurants');
    }
  }, [router]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setInterval(() => setOtpCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [otpCooldown]);

  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const validateLogin = () => {
    const e: LoginErrors = {};
    if (!email.trim()) e.email = 'Please enter your email address';
    else if (!isEmail(email)) e.email = 'Please enter a valid email address';
    if (!password.trim()) e.password = 'Please enter your password';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  async function safeFetchJson<T = unknown>(path: string, init?: RequestInit) {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      // include credentials if your API sets secure cookies later
      credentials: 'include',
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // non-JSON response
    }
    if (!res.ok) {
      const msg = (data as ApiMessage)?.message || 'Request failed';
      throw new Error(msg);
    }
    return data as T;
  }

  const handleLogin = async () => {
    if (!validateLogin()) return;
    if (isLoading) return;
    setIsLoading(true);
    setErrors({});

    try {
      const data = await safeFetchJson<LoginSuccess>('/api/super-admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data?.token) {
        setSuperAdminAuth(data.token, data.superAdmin);
      }

      router.push('/super-admin/restaurants');
    } catch (err: any) {
      setErrors({
        form: err?.message || 'Login failed. Please try again.',
        password: 'Invalid email or password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  const requestOtp = async () => {
    setResetErrors({});
    setResetSuccessMsg(null);

    if (!resetEmail.trim()) return setResetErrors({ email: 'Please enter your email address' });
    if (!isEmail(resetEmail)) return setResetErrors({ email: 'Please enter a valid email address' });
    if (isSendingOtp || otpCooldown > 0) return;

    setIsSendingOtp(true);
    try {
      const data = await safeFetchJson<ApiMessage>('/api/super-admin/request-password-reset-otp', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail }),
      });
      setOtpSent(true);
      setResetSuccessMsg(data?.message || 'OTP sent.');
      setOtpCooldown(60); // 60s cooldown
    } catch (err: any) {
      setResetErrors({ form: err?.message || 'Failed to send OTP. Please try again.' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const resetWithOtp = async () => {
    setResetErrors({});
    setResetSuccessMsg(null);

    const e: ResetErrors = {};
    if (!resetEmail.trim()) e.email = 'Email is required';
    else if (!isEmail(resetEmail)) e.email = 'Enter a valid email';
    if (!otp.trim()) e.otp = 'OTP is required';
    if (!newPassword.trim()) e.newPassword = 'New password is required';
    else if (newPassword.length < 6) e.newPassword = 'Password must be at least 6 characters';

    if (Object.keys(e).length) return setResetErrors(e);

    setIsResetting(true);
    try {
      const data = await safeFetchJson<ApiMessage>('/api/super-admin/reset-password-with-otp', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail, otp, newPassword }),
      });
      setResetSuccessMsg(data?.message || 'Password reset successfully.');

      // Prefill login email & close panel shortly after
      setEmail(resetEmail);
      setTimeout(() => {
        setShowForgot(false);
        setOtp('');
        setNewPassword('');
        setResetEmail('');
        setOtpSent(false);
        setResetSuccessMsg(null);
      }, 1000);
    } catch (err: any) {
      setResetErrors({ form: err?.message || 'Failed to reset password. Please verify the OTP.' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-off to-sage/10 text-ink flex flex-col">
      {/* Top Bar */}
      <header className="w-full">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center gap-2">
            <Image src="/quickcheck.svg" alt="QuickCheck Logo" width={32} height={32} />
            <span className="text-2xl font-display font-extrabold">QuickCheck</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <Card className="w-full bg-panel border border-border shadow-soft">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <CardTitle className="text-2xl font-display">Super Admin Access</CardTitle>
              <CardDescription className="text-muted">
                Enter your credentials to access the admin panel
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Notice */}
              <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-amber-900 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm leading-relaxed">
                  <span className="font-semibold">Authorized Use Only:</span> This portal is strictly for
                  <span className="font-semibold"> QuickCheck Officials</span>. Do not attempt to log in if you do not truly represent them.
                  Unauthorized access may be monitored and reported.
                </p>
              </div>

              {/* Global error */}
              {errors.form && (
                <div className="rounded-md border border-error/30 bg-red-50 px-3 py-2 text-sm text-error" role="alert">
                  {errors.form}
                </div>
              )}

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-base font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@quickcheckin.ca"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="h-12 text-lg border-border focus-visible:ring-2 focus-visible:ring-primary mt-2"
                  autoComplete="username"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && <p id="email-error" className="text-error text-sm mt-2">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password" className="text-base font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="h-12 text-lg border-border focus-visible:ring-2 focus-visible:ring-primary mt-2"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                {errors.password && <p id="password-error" className="text-error text-sm mt-2">{errors.password}</p>}

                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgot((s) => !s);
                      setResetErrors({});
                      setResetSuccessMsg(null);
                    }}
                    className="text-sm text-primary hover:text-primary-600"
                  >
                    {showForgot ? 'Close password help' : 'Forgot password?'}
                  </button>
                </div>
              </div>

              {/* Forgot / Reset */}
              {showForgot && (
                <div className="rounded-lg border border-border bg-off p-4 space-y-4">
                  <p className="text-sm text-muted">
                    Enter your email to receive an OTP on your registered phone number, then use it to set a new password.
                  </p>

                  {/* Reset alerts */}
                  {resetErrors.form && (
                    <div className="rounded-md border border-error/30 bg-red-50 px-3 py-2 text-sm text-error" role="alert">
                      {resetErrors.form}
                    </div>
                  )}
                  {resetSuccessMsg && (
                    <div className="rounded-md border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
                      {resetSuccessMsg}
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <Label htmlFor="reset-email" className="text-sm font-medium">Email Address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="admin@quickcheckin.ca"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
                      autoComplete="email"
                      aria-invalid={!!resetErrors.email}
                      aria-describedby={resetErrors.email ? 'reset-email-error' : undefined}
                    />
                    {resetErrors.email && <p id="reset-email-error" className="text-error text-sm mt-2">{resetErrors.email}</p>}

                    <div className="mt-3">
                      <Button
                        type="button"
                        onClick={requestOtp}
                        disabled={isSendingOtp || otpCooldown > 0}
                        variant="outline"
                        className="w-full"
                      >
                        {isSendingOtp ? (
                          <>
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-ink/20 border-t-ink mr-2" />
                            Sending OTP...
                          </>
                        ) : otpCooldown > 0 ? (
                          <>Resend OTP in {otpCooldown}s</>
                        ) : (
                          <>Send OTP</>
                        )}
                      </Button>
                    </div>
                  </div>

                  {otpSent && (
                    <>
                      <div>
                        <Label htmlFor="otp" className="text-sm font-medium">OTP</Label>
                        <Input
                          id="otp"
                          type="text"
                          inputMode="numeric"
                          placeholder="Enter the OTP you received"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
                          aria-invalid={!!resetErrors.otp}
                          aria-describedby={resetErrors.otp ? 'otp-error' : undefined}
                        />
                        {resetErrors.otp && <p id="otp-error" className="text-error text-sm mt-2">{resetErrors.otp}</p>}
                      </div>

                      <div>
                        <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="Create a new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
                          aria-invalid={!!resetErrors.newPassword}
                          aria-describedby={resetErrors.newPassword ? 'newpass-error' : undefined}
                        />
                        {resetErrors.newPassword && <p id="newpass-error" className="text-error text-sm mt-2">{resetErrors.newPassword}</p>}
                      </div>

                      <Button
                        type="button"
                        onClick={resetWithOtp}
                        disabled={isResetting}
                        className="w-full bg-primary hover:bg-primary-600 text-white"
                      >
                        {isResetting ? (
                          <>
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                            Resetting...
                          </>
                        ) : (
                          <>Reset Password</>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Sign In */}
              <Button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full h-12 text-lg bg-primary hover:bg-primary-600 text-white"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full">
        <div className="mx-auto max-w-6xl px-4 pb-8">
          <div className="flex justify-center">
            <Link href="/" className="inline-flex items-center text-primary hover:text-primary-600">
              <Home className="h-5 w-5 mr-2" aria-hidden="true" />
              Back to Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
