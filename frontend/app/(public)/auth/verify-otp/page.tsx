'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Lock, Loader2 } from 'lucide-react';

export default function VerifyOTPPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const restaurantId = searchParams.get('restaurantId');
  const phone = searchParams.get('phone');

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!restaurantId || !phone) {
      toast.error('Missing verification parameters');
      router.push('/signup');
    }
  }, [restaurantId, phone, router]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendOTP = async () => {
    if (resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, phone })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to resend OTP');
        return;
      }

      toast.success('New OTP sent to your phone!');
      setResendCooldown(60); // 60 second cooldown
      setOtp(''); // Clear old OTP input
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast.error('Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          phone,
          otp
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Invalid OTP');
        setLoading(false);
        return;
      }

      // Store session token
      localStorage.setItem('sessionToken', data.sessionToken);
      localStorage.setItem('restaurant', JSON.stringify(data.restaurant));

      toast.success('Account verified! Redirecting to dashboard...');
      
      setTimeout(() => {
        router.push('/admin');
      }, 1000);

    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast.error('Verification failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-off p-4 relative overflow-hidden">
      {/* Left Fade */}
      <div className="absolute left-0 top-0 bottom-0 w-32 md:w-48 bg-gradient-to-r from-off to-transparent z-10 pointer-events-none" />
      {/* Right Fade */}
      <div className="absolute right-0 top-0 bottom-0 w-32 md:w-48 bg-gradient-to-l from-off to-transparent z-10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-2 bg-panel rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden"
      >
        {/* Left Side - Form */}
        <div className="flex flex-col justify-center p-8 md:p-12 lg:p-16">
          {isPending ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-3xl font-display font-bold text-ink mb-4">
              Application Under Review
            </h2>
            <p className="text-muted text-lg mb-6 leading-relaxed">
              You will get your dashboard access online. You will be approved or rejected by the admin within 72 hours.
            </p>
            <Link href="/" className="inline-flex bg-primary text-white py-3 px-6 rounded-xl font-semibold hover:bg-primary/90 transition">
              Return Home
            </Link>
          </div>
        ) : (
          <>
          <div className="mb-8">
            <Link href="/" className="flex items-center gap-3 mb-6 hover:opacity-80 transition-opacity">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Image src="/QuickCheck.svg" alt="QuickCheck" width={32} height={32} />
              </div>
              <h1 className="text-2xl font-display font-bold text-ink tracking-tight">
                QuickCheck
              </h1>
            </Link>
            
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            
            <h2 className="text-3xl md:text-4xl font-display font-bold text-ink mb-3">
              Verify Your Phone
            </h2>
            <p className="text-muted text-lg">
              We sent a 6-digit code to<br />
              <span className="font-semibold text-ink">{phone}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full max-w-sm">
            <div className="mb-6">
              <label className="block text-sm font-medium text-ink mb-2">
                Enter OTP *
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                className="w-full px-4 py-3 text-center text-2xl font-bold border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-off text-ink tracking-widest"
                placeholder="000000"
                autoFocus
              />
              <p className="text-sm text-muted mt-2 text-center">
                Code expires in 10 minutes
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-primary text-white py-3 px-6 rounded-xl font-semibold hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/50 text-center text-sm text-muted">
            Didn't receive the code?{' '}
            <button 
              className="text-primary hover:underline font-medium disabled:text-muted disabled:no-underline"
              onClick={handleResendOTP}
              disabled={resendCooldown > 0 || resendLoading}
            >
              {resendLoading ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Sending...
                </span>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                'Resend OTP'
              )}
            </button>
          </div>
          </>
        )}
        </div>

        {/* Right Side - Image */}
        <div className="hidden md:block relative bg-sage/20">
          <img
            src="/Restaurant_Login_image.avif"
            alt="Restaurant Team"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      </motion.div>
    </div>
  );
}
