'use client';

import React from 'react';
import Link from 'next/link';
import { Smartphone, CheckCircle, Shield, ArrowRight, KeyRound, Building2 } from 'lucide-react';

export default function OptInProofPage() {
  return (
    <div className="min-h-screen bg-off text-ink py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <Shield className="w-4 h-4" /> 10DLC Compliance &amp; Opt-In Verification
          </div>
          <h1 className="text-4xl font-display font-bold text-ink tracking-tight">
            QuickCheck SMS Opt-In &amp; Messaging Workflows
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Official carrier compliance documentation for QuickCheck brand messaging, covering transactional waitlist notifications (Customer Care) and portal authentication (2FA / OTP).
          </p>
        </div>

        {/* Brand & Entity Details */}
        <div className="bg-panel rounded-2xl p-6 sm:p-8 border border-border shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-ink flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" /> Brand &amp; Entity Identification
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-off rounded-xl border border-border">
              <span className="text-muted block mb-1">Registered Brand Name:</span>
              <span className="font-bold text-base text-ink">QuickCheck</span>
            </div>
            <div className="p-4 bg-off rounded-xl border border-border">
              <span className="text-muted block mb-1">Legal Business Entity:</span>
              <span className="font-bold text-base text-ink">KOHLI GARAGE INC. (DBA QuickCheck)</span>
            </div>
            <div className="p-4 bg-off rounded-xl border border-border">
              <span className="text-muted block mb-1">Service Category:</span>
              <span className="font-semibold text-ink">Restaurant Waitlist &amp; SaaS Authentication Platform</span>
            </div>
            <div className="p-4 bg-off rounded-xl border border-border">
              <span className="text-muted block mb-1">10DLC Campaign Type:</span>
              <span className="font-semibold text-ink">Mixed (Customer Care &amp; 2FA / Authentication)</span>
            </div>
          </div>

          {/* Perceived Sender Clarification Box */}
          <div className="p-5 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
            <h3 className="font-bold text-sm text-primary flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Perceived &amp; Sole Permitted Sender Clarification
            </h3>
            <p className="text-sm text-ink/80 leading-relaxed">
              <strong>QuickCheck</strong> (operated by KOHLI GARAGE INC.) is the sole direct sender and recognized brand for all outbound SMS notifications across this campaign. QuickCheck operates a centralized digital waitlist and queue service (analogous to OpenTable or Yelp Waitlist). Dining guests interact directly with the QuickCheck kiosk hardware to join the waitlist and explicitly consent to receive queue updates directly from QuickCheck. Participating restaurants are client locations hosted on the QuickCheck network; restaurant names are included solely as situational location context for the diner (e.g., &quot;at Bistro Grill&quot;). Messages are never sent on behalf of third parties; all messages originate exclusively from QuickCheck.
            </p>
          </div>
        </div>

        {/* USE CASE 1: Customer Care (Waitlist Notifications) */}
        <div className="bg-panel rounded-2xl p-6 sm:p-8 border border-border shadow-sm space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" /> Use Case 1: Dining Guest Waitlist Alerts (Customer Care)
            </h2>
            <span className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-md font-semibold">Sub-Use Case: Customer Care</span>
          </div>

          <div className="space-y-4 text-sm leading-relaxed text-ink/90">
            <h3 className="font-semibold text-base text-ink">How Guests Opt In at the Restaurant Kiosk:</h3>
            <ol className="space-y-3 list-decimal pl-5">
              <li>
                <strong>Kiosk Interaction:</strong> Dining guests arrive at a partner restaurant and interact with the physical QuickCheck tablet kiosk at the host stand.
              </li>
              <li>
                <strong>Information Entry:</strong> The guest selects their party size, enters their name, and enters their mobile phone number.
              </li>
              <li>
                <strong>Prominent Consent &amp; Privacy Disclosures:</strong> Immediately beneath the mobile phone number input and above the submission button, the guest is presented with the explicit transactional SMS consent disclosure including frequency, opt-out keywords, carrier disclaimer, the mandatory <strong>no-share privacy statement</strong>, and links to the Privacy Policy and Terms.
              </li>
              <li>
                <strong>Confirmation &amp; SMS Dispatch:</strong> Upon clicking &quot;Join Waitlist&quot;, an immediate transactional confirmation text is dispatched to the guest&apos;s phone.
              </li>
            </ol>
          </div>

          {/* Visual Mockup: Kiosk Form */}
          <div className="max-w-md mx-auto bg-white rounded-2xl border-2 border-border p-6 shadow-md space-y-5">
            <div className="text-center border-b pb-4">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-2 font-bold text-lg">
                QC
              </div>
              <h3 className="font-bold text-lg text-ink">Bistro Grill - Guest Check-In</h3>
              <p className="text-xs text-muted">Powered by QuickCheck</p>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Your Name</label>
                <div className="w-full h-11 px-3 bg-off rounded-lg border border-border flex items-center text-ink text-sm">
                  Alex Morgan
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Mobile Phone Number</label>
                <div className="flex gap-2">
                  <div className="h-11 px-3 bg-off rounded-lg border border-border flex items-center text-sm font-mono">
                    +1
                  </div>
                  <div className="flex-1 h-11 px-3 bg-off rounded-lg border border-border flex items-center text-ink text-sm font-mono">
                    (555) 234-5678
                  </div>
                </div>
              </div>

              {/* Exact Disclosure */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-ink/80 space-y-1.5 leading-relaxed">
                <p className="font-semibold text-amber-900">SMS Consent &amp; Privacy Disclosure:</p>
                <p>
                  &quot;By providing your mobile number, you agree to receive transactional SMS waitlist notifications from <strong>QuickCheck</strong> regarding your waitlist status at this restaurant. Message frequency varies based on visit (approx. 2-4 msgs/visit). Msg &amp; data rates may apply. Reply <strong>STOP</strong> to cancel or <strong>HELP</strong> for help. Consent is not a condition of service. <strong>Your mobile information will not be sold or shared with third parties or affiliates for promotional or marketing purposes.</strong> View <Link href="/privacy" className="text-primary underline">Privacy Policy</Link> &amp; <Link href="/terms" className="text-primary underline">Terms</Link>.&quot;
                </p>
              </div>

              <div className="w-full h-12 bg-primary text-white font-bold rounded-xl flex items-center justify-center text-sm shadow-sm">
                Join Waitlist <ArrowRight className="w-4 h-4 ml-1.5" />
              </div>
            </div>
          </div>
        </div>

        {/* USE CASE 2: 2FA / OTP Authentication */}
        <div className="bg-panel rounded-2xl p-6 sm:p-8 border border-border shadow-sm space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Use Case 2: Portal Authentication &amp; Verification (2FA / OTP)
            </h2>
            <span className="text-xs px-2.5 py-1 bg-success/10 text-success rounded-md font-semibold">Sub-Use Case: 2FA</span>
          </div>

          <div className="space-y-4 text-sm leading-relaxed text-ink/90">
            <h3 className="font-semibold text-base text-ink">How Users Opt In to 2FA / OTP Messages:</h3>
            <ol className="space-y-3 list-decimal pl-5">
              <li>
                <strong>Portal Sign-In:</strong> Restaurant managers, staff, and authorized administrators navigate to the QuickCheck Portal login page (<Link href="/auth" className="text-primary underline">https://www.quickcheckin.ca/auth</Link>).
              </li>
              <li>
                <strong>Phone Number Submission:</strong> The user enters their registered mobile phone number to log into or verify their account.
              </li>
              <li>
                <strong>OTP Consent Disclosure:</strong> Directly beneath the phone input, the user is presented with the explicit notification: <em>&quot;You will receive a 6-digit verification code via SMS from QuickCheck to authenticate your session. Msg &amp; data rates may apply. Reply STOP to cancel.&quot;</em>
              </li>
              <li>
                <strong>Code Delivery:</strong> The user receives an automated SMS containing a 6-digit verification code to enter on the screen.
              </li>
            </ol>
          </div>

          {/* Visual Mockup: Login / OTP Form */}
          <div className="max-w-md mx-auto bg-white rounded-2xl border-2 border-border p-6 shadow-md space-y-5">
            <div className="text-center border-b pb-4">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-2 font-bold text-lg">
                QC
              </div>
              <h3 className="font-bold text-lg text-ink">QuickCheck Portal Login</h3>
              <p className="text-xs text-muted">Two-Factor Authentication (2FA)</p>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Registered Mobile Phone</label>
                <div className="flex gap-2">
                  <div className="h-11 px-3 bg-off rounded-lg border border-border flex items-center text-sm font-mono">
                    +1
                  </div>
                  <div className="flex-1 h-11 px-3 bg-off rounded-lg border border-border flex items-center text-ink text-sm font-mono">
                    (555) 890-1234
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-ink/80 space-y-1 leading-relaxed">
                <p className="font-semibold text-blue-900">2FA / OTP Notice:</p>
                <p>
                  You will receive a 6-digit verification code via SMS from <strong>QuickCheck</strong> to verify your account. Standard message and data rates may apply. Reply <strong>STOP</strong> to cancel.
                </p>
              </div>

              <div className="w-full h-12 bg-primary text-white font-bold rounded-xl flex items-center justify-center text-sm shadow-sm">
                Send Verification Code <ArrowRight className="w-4 h-4 ml-1.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Sample Messages & Disclosures */}
        <div className="bg-panel rounded-2xl p-6 sm:p-8 border border-border shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-ink">Standard Outgoing Messages by Use Case</h2>
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-off rounded-xl border border-border">
              <span className="font-bold text-xs uppercase tracking-wider text-primary block mb-1">Sample 1: Waitlist Confirmation (Customer Care):</span>
              <p className="font-mono text-ink">QuickCheck: Hi Alex! You&apos;re on the waitlist at Bistro Grill for a party of 2. Estimated wait time: 25 minutes. Reply STOP to opt out, HELP for help.</p>
            </div>
            <div className="p-4 bg-off rounded-xl border border-border">
              <span className="font-bold text-xs uppercase tracking-wider text-primary block mb-1">Sample 2: Table Ready Notification (Customer Care):</span>
              <p className="font-mono text-ink">QuickCheck: Hi Alex! Your table for 2 at Bistro Grill is ready. Please arrive within 15 minutes. Reply Y to confirm or N to cancel. Reply STOP to opt out.</p>
            </div>
            <div className="p-4 bg-off rounded-xl border border-border">
              <span className="font-bold text-xs uppercase tracking-wider text-primary block mb-1">Sample 3: Table Released Notice (Customer Care):</span>
              <p className="font-mono text-ink">QuickCheck: Hi Alex, your table at Bistro Grill has been released because we did not see you arrive within the confirmed window. Reply STOP to opt out.</p>
            </div>
            <div className="p-4 bg-off rounded-xl border border-border">
              <span className="font-bold text-xs uppercase tracking-wider text-success block mb-1">Sample 4: One-Time Password / 2FA Verification (2FA):</span>
              <p className="font-mono text-ink">QuickCheck: Your verification code is 482910. Enter it on the screen to proceed. This code expires in 10 minutes. Reply STOP to cancel.</p>
            </div>
          </div>
        </div>

        {/* Compliance Links */}
        <div className="text-center pt-4 space-x-6 text-sm text-muted">
          <Link href="/privacy" className="text-primary underline hover:text-primary-600">Privacy Policy</Link>
          <span>•</span>
          <Link href="/terms" className="text-primary underline hover:text-primary-600">Terms of Service</Link>
          <span>•</span>
          <Link href="/contact" className="text-primary underline hover:text-primary-600">Contact Support</Link>
        </div>
      </div>
    </div>
  );
}
