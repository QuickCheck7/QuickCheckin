'use client';

import { motion } from 'framer-motion';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-off">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-display font-bold text-ink mb-4">Privacy Policy</h1>
          <p className="text-muted mb-8">Last updated: January 7, 2026</p>

          <div className="prose prose-lg max-w-none text-ink">
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">1. Introduction</h2>
              <p className="text-ink/80 mb-4">
                QuickCheck ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your information when you use our restaurant waitlist management service.
              </p>
              <p className="text-ink/80">
                By using QuickCheck, you agree to the practices described in this Privacy Policy.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium text-ink mb-3">A. Restaurant Owners / Administrators</h3>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li><strong>Business Information:</strong> Restaurant name, address, city, business email, phone number, and business registration number</li>
                <li><strong>Account Information:</strong> Phone number used for authentication via SMS one-time password (OTP)</li>
                <li><strong>Payment Information:</strong> Payments are processed securely by Stripe. We do not store credit card details</li>
                <li><strong>Subscription Data:</strong> Plan type, billing history, and subscription status</li>
              </ul>

              <h3 className="text-xl font-medium text-ink mb-3">B. Restaurant Customers (Waitlist Guests)</h3>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li><strong>Personal Information:</strong> Name and phone number</li>
                <li><strong>Waitlist Data:</strong> Party size, check-in time, and waitlist status</li>
                <li><strong>SMS Communications:</strong> Messages sent to and from your phone related to waitlist updates</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">3. How We Use Your Information</h2>
              <p className="text-ink/80 mb-4">We use your information to:</p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li>Provide and operate the QuickCheck service</li>
                <li>Send SMS notifications related to waitlist and table availability</li>
                <li>Authenticate restaurant administrators using SMS OTP</li>
                <li>Process payments and manage subscriptions</li>
                <li>Improve our services and user experience</li>
                <li>Communicate important service-related updates</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">4. Data Retention</h2>
              <p className="text-ink/80 mb-4">
                <strong>Customer Waitlist Data:</strong> Guest waitlist records and SMS logs are automatically deleted within <strong>48 hours</strong>.
              </p>
              <p className="text-ink/80 mb-4">
                <strong>Restaurant Account Data:</strong> Retained while the account is active. After account deletion, data is removed within 30 days, unless legally required otherwise.
              </p>
              <p className="text-ink/80">
                We do not retain customer personal data beyond the stated retention period.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">5. Third-Party Services & SMS Privacy</h2>
              <p className="text-ink/80 mb-4">We use trusted third-party providers to operate our service:</p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li><strong>Telnyx</strong> – SMS messaging delivery</li>
                <li><strong>Stripe</strong> – Payment processing</li>
                <li><strong>MongoDB Atlas</strong> – Secure cloud database hosting</li>
              </ul>
              <p className="text-ink/80 mb-4">
                These providers follow industry-standard security practices, including PCI-DSS and SOC 2 compliance where applicable.
              </p>
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                <p className="text-ink/90 font-medium">
                  <strong>SMS Opt-In & Mobile Information Protection:</strong><br />
                  No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. All the above categories exclude text messaging originator opt-in data and consent; this information will not be shared with or sold to any third parties.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">6. Data Security</h2>
              <p className="text-ink/80 mb-4">
                We take reasonable technical and organizational measures to protect your data, including:
              </p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li>HTTPS encryption for data in transit</li>
                <li>Encrypted database storage</li>
                <li>JWT-based authentication with token expiration</li>
                <li>OTP-based phone verification</li>
                <li>No storage of credit card information on our servers</li>
              </ul>
              <p className="text-ink/80">
                While we take reasonable steps to protect your data, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">7. Your Rights</h2>
              <p className="text-ink/80 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li>Access your personal information</li>
                <li>Request corrections to inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt out of non-essential communications</li>
              </ul>
              <p className="text-ink/80">
                To exercise these rights, contact us at <a href="mailto:info@quickcheckin.ca" className="text-primary hover:underline">info@quickcheckin.ca</a>
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">8. Children's Privacy</h2>
              <p className="text-ink/80">
                QuickCheck is not intended for individuals under the age of 18. We do not knowingly collect personal information from children.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">9. Changes to This Policy</h2>
              <p className="text-ink/80">
                We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated "Last updated" date.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">10. Contact Us</h2>
              <p className="text-ink/80">
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <p className="text-ink/80 mt-4">
                <strong>QuickCheck Inc.</strong><br />
                Email: <a href="mailto:info@quickcheckin.ca" className="text-primary hover:underline">info@quickcheckin.ca</a><br />
                Website: <a href="https://quickcheckin.ca" className="text-primary hover:underline">quickcheckin.ca</a>
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-ink mb-4">Governing Law</h2>
              <p className="text-ink/80">
                This Privacy Policy is governed by the laws of Canada and the Province of Ontario.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
