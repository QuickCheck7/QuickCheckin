'use client';

import { motion } from 'framer-motion';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-off">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-display font-bold text-ink mb-4">Terms of Service</h1>
          <p className="text-muted mb-8">Last updated: January 7, 2026</p>

          <div className="prose prose-lg max-w-none text-ink">
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">1. Agreement to Terms</h2>
              <p className="text-ink/80">
                By accessing or using QuickCheck's restaurant waitlist management service ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you may not use the Service.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">2. Description of Service</h2>
              <p className="text-ink/80 mb-4">
                QuickCheck provides a digital waitlist management system for restaurants, including:
              </p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li>Customer check-in kiosk</li>
                <li>Real-time waitlist management dashboard</li>
                <li>SMS notifications for table availability</li>
                <li>Table and capacity management</li>
                <li>Analytics and reporting tools</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">3. Account Registration</h2>
              <p className="text-ink/80 mb-4">
                To use the Service as a restaurant administrator, you must:
              </p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li>Provide accurate and complete business information</li>
                <li>Have authority to bind your business to these Terms</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>
              <p className="text-ink/80">
                You are responsible for all activities that occur under your account.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">4. Subscription and Payment</h2>
              
              <h3 className="text-xl font-medium text-ink mb-3">4.1 Subscription Plans</h3>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li><strong>Small Plan ($299/month):</strong> Restaurants with 50 seats or fewer</li>
                <li><strong>Large Plan ($499/month):</strong> Restaurants with 51 seats or more</li>
              </ul>

              <h3 className="text-xl font-medium text-ink mb-3">4.2 Free Trial</h3>
              <p className="text-ink/80 mb-4">
                New subscribers receive a 30-day free trial. No charges occur during the trial period. You may cancel at any time before the trial ends.
              </p>

              <h3 className="text-xl font-medium text-ink mb-3">4.3 Billing</h3>
              <p className="text-ink/80 mb-4">
                Subscriptions are billed monthly and processed automatically through Stripe. Prices are in CAD for Canadian customers and USD for U.S. customers.
              </p>

              <h3 className="text-xl font-medium text-ink mb-3">4.4 Cancellation</h3>
              <p className="text-ink/80">
                You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. No refunds are provided for partial months.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">5. Acceptable Use</h2>
              <p className="text-ink/80 mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li>Use the Service for illegal purposes</li>
                <li>Send spam or unsolicited messages</li>
                <li>Attempt unauthorized access</li>
                <li>Interfere with the Service</li>
                <li>Reverse engineer or copy the Service</li>
                <li>Use customer data beyond waitlist purposes</li>
                <li>Resell or sublicense the Service without consent</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">6. SMS Communications & Terms</h2>
              <p className="text-ink/80 mb-4">By providing your mobile phone number to the Service:</p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li><strong>Program Description:</strong> QuickCheck provides transactional SMS notifications related to restaurant waitlist status (waitlist check-in confirmation, estimated wait time updates, table ready alerts, follow-up reminders, and table release/cancellation notices).</li>
                <li><strong>Message Frequency:</strong> Message frequency varies depending on guest visits, typically 2 to 4 messages per waitlist check-in.</li>
                <li><strong>Message and Data Rates:</strong> Message and data rates may apply depending on your mobile carrier and plan.</li>
                <li><strong>Opt-Out:</strong> You may opt out of receiving SMS notifications at any time by replying <strong>STOP</strong>, <strong>CANCEL</strong>, or <strong>UNSUBSCRIBE</strong> to any message. You will receive a single confirmation message confirming your unsubscription.</li>
                <li><strong>Customer Support:</strong> For assistance with SMS notifications, reply <strong>HELP</strong> to any message or contact us at <a href="mailto:info@quickcheckin.ca" className="text-primary hover:underline">info@quickcheckin.ca</a>.</li>
                <li>Carriers (such as AT&T, T-Mobile, Verizon, Rogers, Bell, Telus) are not liable for delayed or undelivered messages.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">7. Intellectual Property</h2>
              <p className="text-ink/80">
                The Service, software, branding, and all related content are owned by QuickCheck and protected by intellectual property laws. Unauthorized use is prohibited.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">8. Data and Privacy</h2>
              <p className="text-ink/80">
                Your use of the Service is governed by our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>, which is incorporated into these Terms.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">9. Service Availability</h2>
              <p className="text-ink/80 mb-4">
                We strive to provide reliable service but do not guarantee uninterrupted availability. We are not liable for:
              </p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li>Scheduled maintenance</li>
                <li>Outages beyond our control</li>
                <li>Third-party service failures (SMS carriers, hosting providers, payment processors)</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">10. Limitation of Liability</h2>
              <p className="text-ink/80 mb-4">To the maximum extent permitted by law:</p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li>QuickCheck is not liable for indirect, incidental, special, or consequential damages</li>
                <li>Our total liability shall not exceed the fees paid by you in the 12 months prior to the claim</li>
                <li>We are not responsible for missed notifications due to incorrect phone numbers or carrier issues</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">11. Disclaimer of Warranties</h2>
              <p className="text-ink/80 font-medium">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">12. Indemnification</h2>
              <p className="text-ink/80 mb-4">
                You agree to indemnify and hold harmless QuickCheck from any claims or damages arising from:
              </p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of applicable laws</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">13. Termination</h2>
              <p className="text-ink/80 mb-4">
                We may suspend or terminate your account immediately for:
              </p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li>Breach of these Terms</li>
                <li>Non-payment</li>
                <li>Fraud or illegal activity</li>
                <li>Abuse of SMS functionality</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">14. Governing Law</h2>
              <p className="text-ink/80">
                These Terms are governed by the laws of the Province of Ontario, Canada, and any disputes shall be resolved exclusively in Ontario courts.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">15. Changes to Terms</h2>
              <p className="text-ink/80">
                We may update these Terms from time to time. Material changes will be communicated with at least 30 days' notice. Continued use constitutes acceptance.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">16. Severability</h2>
              <p className="text-ink/80">
                If any provision is found unenforceable, the remaining provisions will remain in full effect.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">17. Force Majeure</h2>
              <p className="text-ink/80">
                QuickCheck is not liable for delays or failures caused by events beyond our reasonable control, including internet outages, power failures, natural disasters, government actions, or third-party service disruptions.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">18. Contact Us</h2>
              <p className="text-ink/80 mt-4">
                <strong>QuickCheck Inc.</strong><br />
                Email: <a href="mailto:info@quickcheckin.ca" className="text-primary hover:underline">info@quickcheckin.ca</a><br />
                Website: <a href="https://quickcheckin.ca" className="text-primary hover:underline">quickcheckin.ca</a>
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
