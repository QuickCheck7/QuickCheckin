'use client';

import React from 'react';
import Link from 'next/link';
import { Smartphone, CheckCircle, Shield, ArrowRight } from 'lucide-react';

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
            QuickCheck SMS Opt-In Workflow
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Documentation of our customer check-in workflow, transactional SMS consent mechanism, and carrier compliance standards.
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
              <span className="font-semibold text-ink">Restaurant Digital Waitlist &amp; Guest Notification System</span>
            </div>
            <div className="p-4 bg-off rounded-xl border border-border">
              <span className="text-muted block mb-1">Campaign Type:</span>
              <span className="font-semibold text-ink">Mixed / Customer Care (Transactional)</span>
            </div>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            QuickCheck is a software-as-a-service (SaaS) platform operated by KOHLI GARAGE INC. Participating restaurants utilize QuickCheck hardware kiosks and digital guest check-in links. QuickCheck acts as the direct sender of automated transactional SMS messages to dining guests regarding their table status.
          </p>
        </div>

        {/* Opt-In Workflow Description */}
        <div className="bg-panel rounded-2xl p-6 sm:p-8 border border-border shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-ink">How Guests Opt In to SMS Notifications</h2>
          <ol className="space-y-4 text-sm leading-relaxed text-ink/90 list-decimal pl-5">
            <li>
              <strong>Physical or Digital Check-In:</strong> Dining guests arrive at a partner restaurant and interact with the QuickCheck host stand kiosk tablet (or scan the restaurant&apos;s waitlist QR code on their personal smartphone).
            </li>
            <li>
              <strong>Party Information &amp; Phone Entry:</strong> The guest selects their party size, enters their name, and enters their mobile phone number.
            </li>
            <li>
              <strong>Prominent Consent Disclaimer:</strong> Immediately beneath the mobile phone number input and above the submission button, the guest is presented with the explicit transactional SMS consent disclosure.
            </li>
            <li>
              <strong>Submission &amp; Confirmation:</strong> The guest clicks &quot;Continue&quot; and confirms their details on the summary screen. Upon clicking &quot;Join Waitlist&quot;, the transactional confirmation text is sent.
            </li>
          </ol>
        </div>

        {/* Visual Mockup of the Opt-In Form */}
        <div className="bg-panel rounded-2xl p-6 sm:p-8 border border-border shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" /> Visual Opt-In Form &amp; Disclosure Mockup
            </h2>
            <span className="text-xs px-2.5 py-1 bg-success/10 text-success rounded-md font-medium">Live Kiosk Interface</span>
          </div>

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
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-ink/80 space-y-1 leading-relaxed">
                <p className="font-semibold text-amber-900">SMS Consent Disclosure:</p>
                <p>
                  &quot;By providing your mobile number, you agree to receive transactional SMS waitlist notifications from <strong>QuickCheck</strong> on behalf of this restaurant. Message frequency varies based on visit (approx. 2-4 msgs/visit). Msg &amp; data rates may apply. Reply <strong>STOP</strong> to cancel or <strong>HELP</strong> for help. Consent is not a condition of service.&quot;
                </p>
              </div>

              <div className="w-full h-12 bg-primary text-white font-bold rounded-xl flex items-center justify-center text-sm shadow-sm">
                Join Waitlist <ArrowRight className="w-4 h-4 ml-1.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Sample Messages & Disclosures */}
        <div className="bg-panel rounded-2xl p-6 sm:p-8 border border-border shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-ink">Standard Outgoing Messages &amp; Brand Attribution</h2>
          <div className="space-y-3 text-sm">
            <div className="p-4 bg-off rounded-xl border border-border">
              <span className="font-bold text-xs uppercase tracking-wider text-muted block mb-1">Waitlist Confirmation:</span>
              <p className="font-mono text-ink">QuickCheck: Hi Alex! You&apos;re on the waitlist at Bistro Grill for a party of 2. Estimated wait time: 25 minutes. Reply STOP to opt out, HELP for help.</p>
            </div>
            <div className="p-4 bg-off rounded-xl border border-border">
              <span className="font-bold text-xs uppercase tracking-wider text-muted block mb-1">Table Ready Notification:</span>
              <p className="font-mono text-ink">QuickCheck: Hi Alex! Your table for 2 at Bistro Grill is ready. Please arrive within 15 minutes. Reply Y to confirm or N to cancel. Reply STOP to opt out.</p>
            </div>
            <div className="p-4 bg-off rounded-xl border border-border">
              <span className="font-bold text-xs uppercase tracking-wider text-muted block mb-1">Follow-up Reminder:</span>
              <p className="font-mono text-ink">QuickCheck: Hi Alex, we&apos;re still holding your table at Bistro Grill. Please arrive within the next 7 minutes. Reply Y to confirm or N to cancel. Reply STOP to opt out.</p>
            </div>
            <div className="p-4 bg-off rounded-xl border border-border">
              <span className="font-bold text-xs uppercase tracking-wider text-muted block mb-1">Table Released Notice:</span>
              <p className="font-mono text-ink">QuickCheck: Hi Alex, your table at Bistro Grill has been released because we did not see you arrive within the confirmed window. Reply STOP to opt out.</p>
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
