import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Privacy Policy — PokiSpokey",
  description: "How PokiSpokey collects, uses, and protects your data.",
};

const sections = [
  { id: "introduction",  title: "Introduction" },
  { id: "data-collected", title: "Data We Collect" },
  { id: "how-we-use",   title: "How We Use It" },
  { id: "sharing",      title: "Data Sharing" },
  { id: "retention",    title: "Retention" },
  { id: "security",     title: "Security" },
  { id: "rights",       title: "Your Rights" },
  { id: "gdpr",         title: "GDPR (EU Users)" },
  { id: "ccpa",         title: "CCPA (California)" },
  { id: "cookies",      title: "Cookies" },
  { id: "changes",      title: "Policy Changes" },
  { id: "contact",      title: "Contact" },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="lg:flex lg:gap-20">

        {/* Sticky TOC */}
        <aside className="hidden lg:block w-44 shrink-0">
          <div className="sticky top-20">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              On this page
            </p>
            <nav className="flex flex-col gap-0.5">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1 border-l-2 border-transparent hover:border-orange-500 pl-3"
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="mb-12 pb-8 border-b border-border/40">
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground">Last updated: July 14, 2026</p>
          </div>

          <div className="space-y-14 text-[15px] leading-relaxed text-muted-foreground">

            <section id="introduction" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Introduction</h2>
              <p>
                PokiSpokey ("we", "us") is committed to protecting your privacy. This policy explains what personal data we collect when you use our language learning platform, how we use it, who we share it with, and what rights you have. By using the Service you agree to the practices described here.
              </p>
            </section>

            <section id="data-collected" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Data We Collect</h2>
              <div className="space-y-5">
                <div>
                  <p className="font-medium text-foreground mb-1">Account data</p>
                  <p>Email address, display name, and profile picture if you sign in with Google. Passwords are stored as one-way hashes — we never see your plain-text password.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Usage data</p>
                  <p>Search queries, language preferences, and monthly search and AI credit counts. This data powers your usage meter and enforces plan limits.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Technical data</p>
                  <p>IP address (for security and rate limiting), browser type, and device type. Used for diagnostics and abuse prevention only.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Billing data</p>
                  <p>
                    Payments are processed by <span className="text-foreground font-medium">Paddle.com</span>, our Merchant of Record. We store only your subscription status and a customer reference ID — no card details, billing addresses, or payment information ever touch our servers. Paddle collects and processes your payment data directly under their own{' '}
                    <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">Privacy Policy</a>.
                  </p>
                </div>
              </div>
            </section>

            <section id="how-we-use" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">How We Use It</h2>
              <p className="mb-3">We use your data strictly to operate and improve the Service. We do not sell your personal data.</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Authenticate you and manage your account</li>
                <li>Deliver search, video playback, and AI features</li>
                <li>Enforce plan limits and track usage</li>
                <li>Send transactional emails (verification codes, billing receipts)</li>
                <li>Detect and prevent abuse and unauthorized access</li>
                <li>Improve the Service using anonymized, aggregated data</li>
              </ul>
              <p className="mt-3">Our legal basis for processing under GDPR is performance of a contract (providing the Service you signed up for) and legitimate interests (security and abuse prevention).</p>
            </section>

            <section id="sharing" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Data Sharing</h2>
              <p className="mb-3">We share data only with the services required to operate PokiSpokey:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <span className="text-foreground font-medium">Paddle.com</span> — payment processing and order fulfillment. Paddle acts as our Merchant of Record and processes buyer data (name, email, billing address, payment details) directly under their own{' '}
                  <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">Privacy Policy</a>.
                  Per our Data Sharing Addendum with Paddle, they may share with us: your name, email address, and purchase history for subscription management purposes.
                </li>
                <li><span className="text-foreground font-medium">Groq</span> — AI inference; your message is sent to generate a response</li>
                <li><span className="text-foreground font-medium">YouTube</span> — video playback via the official IFrame API</li>
                <li><span className="text-foreground font-medium">Vercel</span> — frontend hosting</li>
                <li><span className="text-foreground font-medium">Resend</span> — transactional email delivery</li>
              </ul>
              <p className="mt-3">We do not share your data with advertisers or data brokers.</p>
            </section>

            <section id="retention" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Retention</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Account data is kept until you request deletion</li>
                <li>Usage counters reset monthly; aggregate totals are retained for analytics</li>
                <li>AI conversation logs are kept for up to 90 days for abuse monitoring, then permanently deleted</li>
                <li>Billing history is retained for a minimum of 5 years for financial and legal compliance</li>
              </ul>
            </section>

            <section id="security" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Security</h2>
              <p>All data is transmitted over TLS/HTTPS. Passwords are hashed before storage. We use short-lived authentication tokens with automatic rotation, rate limiting, and IP-based abuse detection. PokiSpokey is PCI-DSS compliant by virtue of using Paddle as Merchant of Record — we do not store, process, or transmit any cardholder data. In the event of a confirmed data breach, we will notify affected users promptly.</p>
            </section>

            <section id="rights" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Your Rights</h2>
              <p className="mb-3">Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Access a copy of your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your account and all associated data</li>
                <li>Export your data in a portable format</li>
                <li>Object to or restrict certain types of processing</li>
                <li>Withdraw consent at any time (where processing is based on consent)</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, email{' '}
                <a href="mailto:support@pokispokey.com" className="text-orange-500 hover:underline">support@pokispokey.com</a>. We respond within 30 days. For rights relating to payment data held by Paddle, please contact Paddle directly via{' '}
                <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">paddle.com/legal/privacy</a>.
              </p>
            </section>

            <section id="gdpr" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">GDPR (EU &amp; EEA Users)</h2>
              <p className="mb-3">If you are located in the European Union or European Economic Area, the following applies:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><span className="text-foreground font-medium">Legal basis for processing:</span> Contract performance (providing the Service), legitimate interests (security, abuse prevention, analytics), and legal obligation (billing record retention).</li>
                <li><span className="text-foreground font-medium">Data transfers:</span> Some service providers (e.g., Groq, Vercel) are based in the United States. Data transfers are covered by Standard Contractual Clauses or equivalent safeguards.</li>
                <li><span className="text-foreground font-medium">Right to lodge a complaint:</span> You have the right to complain to your local data protection authority if you believe we have violated your rights.</li>
                <li><span className="text-foreground font-medium">Data controller:</span> PokiSpokey (contact: support@pokispokey.com). Paddle.com is an independent data controller for payment data they collect.</li>
              </ul>
            </section>

            <section id="ccpa" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">CCPA (California Residents)</h2>
              <p className="mb-3">If you are a California resident, the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA) grant you the following rights:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><span className="text-foreground font-medium">Right to know:</span> You may request a copy of the personal information we have collected about you in the past 12 months.</li>
                <li><span className="text-foreground font-medium">Right to delete:</span> You may request that we delete your personal information, subject to certain exceptions.</li>
                <li><span className="text-foreground font-medium">Right to correct:</span> You may request that we correct inaccurate personal information.</li>
                <li><span className="text-foreground font-medium">Right to opt-out of sale:</span> We do not sell your personal information to third parties.</li>
                <li><span className="text-foreground font-medium">Right to non-discrimination:</span> We will not discriminate against you for exercising any of these rights.</li>
              </ul>
              <p className="mt-3">
                To exercise these rights, email{' '}
                <a href="mailto:support@pokispokey.com" className="text-orange-500 hover:underline">support@pokispokey.com</a>{' '}
                with the subject line "CCPA Request". We will respond within 45 days.
              </p>
            </section>

            <section id="cookies" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Cookies</h2>
              <p>We use only strictly necessary cookies for authentication. We do not use tracking, advertising, or analytics cookies. Disabling cookies in your browser will prevent login from functioning.</p>
            </section>

            <section id="changes" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Policy Changes</h2>
              <p>We may update this policy. The "Last updated" date at the top reflects the most recent revision. We will notify registered users of material changes via email or an in-app notice before they take effect.</p>
            </section>

            <section id="contact" className="scroll-mt-20 pb-16">
              <h2 className="text-base font-semibold text-foreground mb-3">Contact</h2>
              <p>
                Questions or requests? Email us at{' '}
                <a href="mailto:support@pokispokey.com" className="text-orange-500 hover:underline">support@pokispokey.com</a>.
              </p>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
