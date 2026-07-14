import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Refund Policy — PokiSpokey",
  description: "PokiSpokey refund policy and money-back guarantee.",
};

const sections = [
  { id: "merchant",      title: "Merchant of Record" },
  { id: "guarantee",     title: "30-Day Guarantee" },
  { id: "how-to-refund", title: "How to Request" },
  { id: "subscriptions", title: "Subscriptions & Cancellation" },
  { id: "statutory",     title: "Statutory Rights" },
  { id: "exceptions",    title: "Exceptions" },
  { id: "contact",       title: "Contact" },
];

export default function RefundPage() {
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
              Refund Policy
            </h1>
            <p className="text-sm text-muted-foreground">Last updated: July 14, 2026</p>
          </div>

          <div className="space-y-14 text-[15px] leading-relaxed text-muted-foreground">

            <section id="merchant" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Merchant of Record</h2>
              <p>
                All payments for PokiSpokey are processed by{' '}
                <a href="https://www.paddle.com" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">Paddle.com</a>,
                our authorized online reseller and Merchant of Record. Paddle handles all payments, refunds, and customer billing inquiries on our behalf. Refund requests are processed directly by Paddle — not by PokiSpokey.
              </p>
            </section>

            <section id="guarantee" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">30-Day Money-Back Guarantee</h2>
              <p>
                We offer a <span className="text-foreground font-medium">30-day unconditional money-back guarantee</span> on all paid plans. If you are not satisfied for any reason, request a refund within 30 days of your initial purchase and you will receive a full refund — no questions asked.
              </p>
            </section>

            <section id="how-to-refund" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">How to Request a Refund</h2>
              <p className="mb-3">Because Paddle is the Merchant of Record, refunds are requested through Paddle — not through our support email. To request a refund:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Open your purchase confirmation email from Paddle</li>
                <li>Click <span className="text-foreground font-medium">"View receipt"</span> or <span className="text-foreground font-medium">"Manage subscription"</span></li>
                <li>Select <span className="text-foreground font-medium">"Request refund"</span> from the Paddle buyer portal</li>
              </ol>
              <p className="mt-3">
                Alternatively, visit{' '}
                <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">paddle.net</a>{' '}
                and locate your order. Refunds are typically processed within 5–10 business days to your original payment method.
              </p>
            </section>

            <section id="subscriptions" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Subscriptions & Cancellation</h2>
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-foreground mb-1">Cancellation</p>
                  <p>
                    You may cancel your subscription at any time from your account settings under <span className="text-foreground font-medium">Manage Plan → Cancel Subscription</span>. Cancellation takes effect at the end of your current billing period — you keep full access until then and will not be charged again after that.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Initial purchase</p>
                  <p>Refunds may be requested within 30 days of your initial subscription payment.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Renewal charges</p>
                  <p>For subsequent auto-renewal charges, please contact Paddle within 14 days of the renewal date. Paddle may issue a discretionary refund at their sole judgment.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Free trial to paid conversion</p>
                  <p>If your subscription began with a free trial, a fresh 30-day refund window opens when the trial ends and the first charge is made.</p>
                </div>
              </div>
            </section>

            <section id="statutory" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Statutory Rights</h2>
              <p className="mb-3">
                Your statutory consumer rights in your country of residence always apply and are not limited by this policy. The following statutory withdrawal rights apply to the first payment of a new subscription:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left py-2 pr-6 font-medium text-foreground">Region</th>
                      <th className="text-left py-2 font-medium text-foreground">Statutory withdrawal period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    <tr><td className="py-2 pr-6">EU / EEA / UK / Switzerland</td><td className="py-2">14 days</td></tr>
                    <tr><td className="py-2 pr-6">Turkey / Israel</td><td className="py-2">14 days</td></tr>
                    <tr><td className="py-2 pr-6">South Korea / Brazil / China</td><td className="py-2">7 days</td></tr>
                    <tr><td className="py-2 pr-6">Canada</td><td className="py-2">7 days</td></tr>
                    <tr><td className="py-2 pr-6">Singapore</td><td className="py-2">5 days</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3">
                These rights are enforced by Paddle as Merchant of Record. If you believe your statutory rights apply, contact Paddle directly at{' '}
                <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">paddle.net</a>.
              </p>
            </section>

            <section id="exceptions" className="scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground mb-3">Exceptions</h2>
              <p className="mb-3">Refunds will not be issued where there is evidence of:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Fraud or misrepresentation</li>
                <li>Refund abuse (e.g. repeatedly purchasing and refunding)</li>
                <li>Violation of our <a href="/terms" className="text-orange-500 hover:underline">Terms of Service</a></li>
              </ul>
              <p className="mt-3">
                If your product has a technical defect that prevents access to advertised features, you are entitled to contact Paddle for a refund regardless of the time window.
              </p>
            </section>

            <section id="contact" className="scroll-mt-20 pb-16">
              <h2 className="text-base font-semibold text-foreground mb-3">Contact</h2>
              <ul className="space-y-2">
                <li>
                  <span className="text-foreground font-medium">Billing & refund requests:</span>{' '}
                  <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">paddle.net</a>
                </li>
                <li>
                  <span className="text-foreground font-medium">Product support:</span>{' '}
                  <a href="mailto:support@pokispokey.com" className="text-orange-500 hover:underline">support@pokispokey.com</a>
                </li>
              </ul>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
