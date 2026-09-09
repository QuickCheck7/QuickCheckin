'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const CA_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
  'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
  'Quebec', 'Saskatchewan', 'Yukon'
];

function SignupForm() {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    restaurantName: '',
    country: 'CA',
    state: '',
    city: '',
    address: '',
    postalCode: '',
    businessNumber: '',
    email: '',
    phone: '',
    seatCapacity: 50
  });

  const [loading, setLoading] = useState(false);
  const [verifyingBusinessNumber, setVerifyingBusinessNumber] = useState(false);
  const [businessNumberAvailable, setBusinessNumberAvailable] = useState<boolean | null>(null);
  const [hasUsedTrial, setHasUsedTrial] = useState<boolean>(false);

  const plan = formData.seatCapacity > 50 ? 'Large' : 'Small';
  const price = plan === 'Small' ? 299 : 499;
  const currency = formData.country === 'CA' ? 'CAD' : 'USD';

  const verifyBusinessNumber = async (number: string, country: string) => {
    if (!number || number.replace(/[^0-9]/g, '').length !== 9) {
      setBusinessNumberAvailable(null);
      setHasUsedTrial(false);
      return;
    }

    setVerifyingBusinessNumber(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-business-number?number=${encodeURIComponent(number)}&country=${country}`
      );
      const data = await response.json();
      
      if (response.ok) {
        setBusinessNumberAvailable(true);
        setHasUsedTrial(data.hasUsedTrial || false);
      } else {
        setBusinessNumberAvailable(false);
        setHasUsedTrial(false);
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Business number verification error:', error);
    } finally {
      setVerifyingBusinessNumber(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.businessNumber) {
        verifyBusinessNumber(formData.businessNumber, formData.country);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.businessNumber, formData.country]);

  const handleNext = () => {
    // Validate current step
    if (currentStep === 1) {
      if (!formData.restaurantName || !formData.country || !formData.state || !formData.city || !formData.address || !formData.postalCode) {
        toast.error('Please fill in all required fields');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.businessNumber || !formData.email || !formData.phone || !formData.seatCapacity) {
        toast.error('Please fill in all required fields');
        return;
      }
      if (businessNumberAvailable === false) {
        toast.error('Invalid Business Number');
        return;
      }
    }
    setCurrentStep(prev => Math.min(3, prev + 1));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!stripe || !elements) {
      toast.error('Stripe is not loaded. Please refresh the page.');
      return;
    }

    setLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: formData.restaurantName,
          email: formData.email,
          phone: formData.phone,
          address: {
            city: formData.city,
            state: formData.state,
            country: formData.country
          }
        }
      });

      if (error) {
        toast.error(error.message || 'Payment method creation failed');
        setLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          paymentMethodId: paymentMethod.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Show specific error from backend (e.g. Payment Lock message)
        const errorMsg = data.message || 'Signup failed';
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }

      toast.success(data.message);
      router.push(`/auth/verify-otp?restaurantId=${data.restaurantId}&phone=${encodeURIComponent(formData.phone)}`);

    } catch (error: any) {
      console.error('Signup error:', error);
      const errorMsg = error.message || 'Signup failed. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'seatCapacity' ? parseInt(value) || 0 : value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-off p-4 relative overflow-hidden">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-2 bg-panel rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden"
      >
        {/* Left Side - Form */}
        <div className="flex flex-col justify-center p-8 md:p-12 lg:p-16">
          {/* Header */}
          <div className="mb-8">
            <Link href="/" className="flex items-center gap-3 mb-6 hover:opacity-80 transition-opacity">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Image src="/QuickCheck.svg" alt="QuickCheck" width={32} height={32} />
              </div>
              <h1 className="text-2xl font-display font-bold text-ink tracking-tight">
                QuickCheck
              </h1>
            </Link>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-ink mb-3">
              Start Your Free Trial
            </h2>
            <p className="text-muted text-lg">
              30 days free • No credit card charge until trial ends
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8 flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step < currentStep ? 'bg-primary border-primary text-white' :
                    step === currentStep ? 'border-primary text-primary' :
                      'border-border text-muted'
                  }`}>
                  {step < currentStep ? <Check size={20} /> : step}
                </div>
                {step < 3 && (
                  <div className={`h-0.5 flex-1 mx-2 ${step < currentStep ? 'bg-primary' : 'bg-border'
                    }`} />
                )}
              </div>
            ))}
          </div>

          {/* Form Steps */}
          <form onSubmit={handleSubmit} className="w-full max-w-sm">
            <AnimatePresence mode="wait">
              {/* Step 1: Restaurant Info */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Restaurant Name *</label>
                    <input
                      type="text"
                      name="restaurantName"
                      required
                      value={formData.restaurantName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-off text-ink"
                      placeholder="My Restaurant"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Country *</label>
                    <select
                      name="country"
                      required
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-off text-ink"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                      {formData.country === 'US' ? 'State' : 'Province'} *
                    </label>
                    <select
                      name="state"
                      required
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-off text-ink"
                    >
                      <option value="">Select {formData.country === 'US' ? 'state' : 'province'}</option>
                      {(formData.country === 'US' ? US_STATES : CA_PROVINCES).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">City *</label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-off text-ink"
                      placeholder="Toronto"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Address *</label>
                    <input
                      type="text"
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-off text-ink"
                      placeholder="123 Main St"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                      {formData.country === 'US' ? 'ZIP Code' : 'Postal Code'} *
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      required
                      value={formData.postalCode}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-off text-ink"
                      placeholder={formData.country === 'US' ? '12345' : 'M5V 2H1'}
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Business Details */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                      {formData.country === 'US' ? 'EIN' : 'Business Number'} *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="businessNumber"
                        required
                        value={formData.businessNumber}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-off text-ink ${businessNumberAvailable === false ? 'border-red-500' :
                            businessNumberAvailable === true ? 'border-green-500' : 'border-border'
                          }`}
                        placeholder={formData.country === 'US' ? '12-3456789' : '123456789RC0001'}
                      />
                      {verifyingBusinessNumber && (
                        <div className="absolute right-3 top-3.5">
                          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                        </div>
                      )}
                      {businessNumberAvailable === true && (
                        <div className="absolute right-3 top-3.5 text-green-500"><Check size={20} /></div>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-1">9 digits</p>
                    {hasUsedTrial && (
                      <p className="text-sm text-yellow-600 mt-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                        This number is already in use. A small verification will be done before you can access the free trial.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Email *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-off text-ink"
                      placeholder="manager@restaurant.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-off text-ink"
                      placeholder="+1 (555) 123-4567"
                    />
                    <p className="text-xs text-muted mt-1">You'll receive an OTP via SMS</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Seat Capacity *</label>
                    <div className="space-y-3">
                      <label
                        className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.seatCapacity <= 50
                            ? 'border-primary bg-primary/5 ring-2 ring-primary'
                            : 'border-border hover:border-primary/50'
                          }`}
                      >
                        <input
                          type="radio"
                          name="seatCapacity"
                          value="30"
                          checked={formData.seatCapacity <= 50}
                          onChange={() => setFormData(prev => ({ ...prev, seatCapacity: 50 }))}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-ink">50 seats or less</p>
                          <p className="text-sm text-muted">Small Plan - $299 {currency}/month</p>
                        </div>
                        {formData.seatCapacity <= 50 && (
                          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <Check size={14} className="text-white" />
                          </div>
                        )}
                      </label>

                      <label
                        className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.seatCapacity > 50
                            ? 'border-primary bg-primary/5 ring-2 ring-primary'
                            : 'border-border hover:border-primary/50'
                          }`}
                      >
                        <input
                          type="radio"
                          name="seatCapacity"
                          value="50"
                          checked={formData.seatCapacity > 50}
                          onChange={() => setFormData(prev => ({ ...prev, seatCapacity: 51 }))}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-ink">51 seats or more</p>
                          <p className="text-sm text-muted">Large Plan - $499 {currency}/month</p>
                        </div>
                        {formData.seatCapacity > 50 && (
                          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <Check size={14} className="text-white" />
                          </div>
                        )}
                      </label>
                    </div>
                    <div className="mt-3 p-3 bg-primary/10 rounded-lg">
                      <p className="text-sm font-semibold text-primary">{plan} Plan - ${price} {currency}/month</p>
                      <p className="text-xs text-muted mt-1">30 days FREE trial included</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Payment */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="mb-4 p-4 bg-sage/10 rounded-xl border border-sage">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="text-sm text-muted">Your Plan</p>
                        <p className="text-xl font-bold text-ink">{plan} Plan</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-ink">${price}</p>
                        <p className="text-sm text-muted">{currency}/month</p>
                      </div>
                    </div>
                    <p className="text-xs text-green-600 font-medium">✓ 30 days FREE trial</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                      Payment Method (Credit or Debit Card) *
                    </label>
                    <div className="p-4 border border-border rounded-xl bg-off">
                      <CardElement
                        options={{
                          style: {
                            base: {
                              fontSize: '16px',
                              color: '#1f2937',
                              fontFamily: 'system-ui, sans-serif',
                              '::placeholder': { color: '#9ca3af' }
                            },
                            invalid: { color: '#ef4444' }
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted mt-2">
                      Your card will not be charged during the 30-day trial
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 text-red-600 text-sm">
                      <div className="shrink-0">⚠️</div>
                      <div>{error}</div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !stripe}
                    className="w-full bg-primary text-white py-3 px-6 rounded-xl font-semibold hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition"
                  >
                    {loading ? 'Creating Account...' : 'Start Free Trial'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            {currentStep < 3 && (
              <div className="mt-6 flex gap-3">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-6 border border-border rounded-xl text-ink hover:bg-off transition"
                  >
                    <ChevronLeft size={20} />
                    Previous
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3 px-6 rounded-xl font-semibold hover:bg-primary/90 transition"
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </form>

          <div className="mt-6 pt-6 border-t border-border/50 text-center text-xs text-muted">
            Already have an account?{' '}
            <a href="/auth" className="text-primary hover:underline">Log in here</a>
          </div>
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

export default function SignupPage() {
  return (
    <Elements stripe={stripePromise}>
      <SignupForm />
    </Elements>
  );
}
