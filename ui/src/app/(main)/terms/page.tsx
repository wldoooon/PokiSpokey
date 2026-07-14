import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Terms of Service — PokiSpokey",
  description: "PokiSpokey terms of service and usage conditions.",
};

const sections = [
  { id: "acceptance",    title: "Acceptance" },
  { id: "service",       title: "The Service" },
  { id: "accounts",      title: "Accounts" },
  { id: "billing",       title: "Plans & Billing" },
  { id: "merchant",      title: "Merchant of Record" },
  { id: "acceptable-use", title: "Acceptable Use" },
  { id: "ip",            title: "Intellectual Property" },
  { id: "ai-disclaimer", title: "AI Disclaimer" },
  { id: "liability",     title: "Liability" },
  { id: "termination",   title: "Termination" },
  { id: "contact",       title: "Contact" },
];

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="text-sm text-muted-foreground">Last updated: July 14, 2026</p>
          </div>

          <div className="space-y-14 text-[15px] leading-relaxed text-muted-foreground">

            <section id="acceptance" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Acceptance</h2>
              <p>
                By accessing or using PokiSpokey ("the Service"), you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the Service. We may update these Terms at any time — continued use after a change constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section id="service" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">The Service</h2>
              <p className="mb-3">PokiSpokey is an AI-powered language learning platform. Core features include:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><span className="text-foreground font-medium">Transcript search</span> — full-text search across real-world video transcripts in multiple languages</li>
                <li><span className="text-foreground font-medium">Contextual video playback</span> — watch the exact moment a word or phrase is used, with synchronized highlighting</li>
                <li><span className="text-foreground font-medium">AI Chat</span> — conversational AI for vocabulary, grammar, pronunciation, and translation questions</li>
                <li><span className="text-foreground font-medium">Browser extension</span> — optional Chrome extension for in-browser learning</li>
              </ul>
              <p className="mt-3">
                The Service is provided for personal language learning purposes. We do not guarantee uninterrupted availability. We may add, modify, or remove features at any time.
              </p>
            </section>

            <section id="accounts" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Accounts</h2>
              <p className="mb-3">You must be at least 13 years old to create an account. When registering, you agree to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Provide accurate and complete information</li>
                <li>Keep your credentials secure and not share them with anyone</li>
                <li>Accept responsibility for all activity that occurs under your account</li>
                <li>Not create multiple accounts to circumvent plan limits</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>
            </section>

            <section id="billing" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Plans & Billing</h2>
              <p className="mb-3">PokiSpokey offers the following plans:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><span className="text-foreground font-medium">Free</span> — 50 searches/month, 15,000 AI credits/month, no charge</li>
                <li><span className="text-foreground font-medium">Basic</span> — 300 searches/month, 800,000 AI credits/month</li>
                <li><span className="text-foreground font-medium">Pro</span> — unlimited searches, 5,000,000 AI credits/month</li>
                <li><span className="text-foreground font-medium">Max</span> — unlimited searches, 15,000,000 AI credits/month</li>
              </ul>
              <p className="mt-4 mb-3">Billing terms:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Payments are processed by <span className="text-foreground font-medium">Paddle.com</span>, our Merchant of Record. By subscribing you authorize Paddle to charge your payment method on a recurring basis.</li>
                <li>Subscriptions renew automatically at the end of each billing cycle (monthly or yearly) at the then-current price unless you cancel before the renewal date.</li>
                <li>You may cancel at any time through your account settings — access continues until the end of the current paid period.</li>
                <li>We offer a <span className="text-foreground font-medium">30-day money-back guarantee</span> on all paid subscriptions. See our <a href="/refund" className="text-orange-500 hover:underline">Refund Policy</a> for full details.</li>
                <li>We reserve the right to change pricing with 30 days' notice to existing subscribers.</li>
                <li>AI credits are consumable, reset monthly, and have no cash value — they cannot be transferred or exchanged.</li>
              </ul>
            </section>

            <section id="merchant" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Merchant of Record</h2>
              <p className="mb-3">
                Our order process is conducted by our online reseller <span className="text-foreground font-medium">Paddle.com</span>. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns.
              </p>
              <p>
                When you purchase a subscription, your payment details are collected directly by Paddle and are subject to{' '}
                <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">Paddle's Buyer Terms</a>{' '}
                and{' '}
                <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">Paddle's Privacy Policy</a>.
                PokiSpokey never stores or processes your card data.
              </p>
            </section>

            <section id="acceptable-use" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Acceptable Use</h2>
              <p className="mb-3">You must not:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Scrape, crawl, or programmatically harvest transcript data or search results</li>
                <li>Use bots or automated scripts to perform searches or consume AI credits</li>
                <li>Attempt to bypass plan limits, rate limits, or any security controls</li>
                <li>Create fake accounts to exploit the Free tier</li>
                <li>Use the AI Chat to generate illegal, harmful, or abusive content</li>
                <li>Reverse-engineer or extract proprietary components of the Service</li>
                <li>Interfere with or disrupt the availability or integrity of the Service</li>
              </ul>
              <p className="mt-3">Violations may result in immediate account suspension or termination without refund.</p>
            </section>

            <section id="ip" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Intellectual Property</h2>
              <p className="mb-3">
                The PokiSpokey platform — including its design, software, AI systems, and branding — is our exclusive intellectual property. You are granted a limited, non-exclusive, non-transferable license to use the Service for personal language learning purposes only.
              </p>
              <p>
                Video content is owned by the respective YouTube creators and is subject to YouTube's Terms of Service. PokiSpokey does not host or redistribute video files — playback is delivered through the YouTube IFrame API.
              </p>
            </section>

            <section id="ai-disclaimer" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">AI Disclaimer</h2>
              <p className="mb-3">
                AI Chat responses are provided for educational purposes only. We make no warranties regarding their accuracy or completeness. Do not rely solely on AI output for critical decisions.
              </p>
              <p>
                Conversations may be logged for abuse monitoring. We do not use your conversations to train external AI models.
              </p>
            </section>

            <section id="liability" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Liability</h2>
              <p className="mb-3">
                The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, or uninterrupted operation.
              </p>
              <p>
                To the maximum extent permitted by law, PokiSpokey shall not be liable for any indirect, incidental, or consequential damages. Our total aggregate liability shall not exceed the greater of (a) the amount you paid us in the twelve months preceding the claim, or (b) $10 USD.
              </p>
            </section>

            <section id="termination" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Termination</h2>
              <p className="mb-3">
                We may suspend or terminate your account for any breach of these Terms, or for any reason at our discretion. You may delete your account at any time through your account settings.
              </p>
              <p>Upon termination, all licenses granted under these Terms cease immediately.</p>
            </section>

            <section id="contact" className="scroll-mt-20 pb-16">
              <h2 className="text-base font-semibold text-foreground mb-3">Contact</h2>
              <p>
                Questions about these Terms? Email us at{' '}
                <a href="mailto:support@pokispokey.com" className="text-orange-500 hover:underline">support@pokispokey.com</a>.
              </p>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
