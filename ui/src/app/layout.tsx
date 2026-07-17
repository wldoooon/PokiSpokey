import type { Metadata } from "next";
import { Inter, Rubik_Wet_Paint, Carter_One } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import TechnicalLattice from "@/components/TechnicalLattice";
import AuthSync from "@/components/AuthSync"
import { YouTubeErrorSuppressor } from "@/components/YouTubeErrorSuppressor";
import { CookieBanner } from "@/components/CookieBanner";
import FooterWrapper from "@/components/FooterWrapper";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"] });
export const rubikWetPaint = Rubik_Wet_Paint({ subsets: ["latin"], weight: "400", variable: "--font-rubik-wet-paint" });
export const carterOne = Carter_One({ subsets: ["latin"], weight: "400", variable: "--font-carter-one" });

export const metadata: Metadata = {
  title: {
    default: "PokiSpokey - Learn Languages from Real Content",
    template: "%s | PokiSpokey",
  },
  description:
    "Master languages with real-world video clips from movies, podcasts, and more.",
  metadataBase: new URL("https://pokispokey.com"),
  openGraph: {
    title: "PokiSpokey - Learn Languages from Real Content",
    description:
      "Master languages with real-world video clips from movies, podcasts, and more.",
    url: "https://pokispokey.com",
    siteName: "PokiSpokey",
    images: [{ url: "/main_logo.png", width: 512, height: 512, alt: "PokiSpokey" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "PokiSpokey - Learn Languages from Real Content",
    description:
      "Master languages with real-world video clips from movies, podcasts, and more.",
    images: ["/main_logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth overflow-x-hidden w-full" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://s.ytimg.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://s.ytimg.com" />
      </head>
      <body
        className={`${inter.className} ${rubikWetPaint.variable} ${carterOne.variable} w-full min-h-screen bg-background`}
        suppressHydrationWarning
      >
        <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />
        <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" />
        <Script id="paddle-init" strategy="afterInteractive">{`function initPaddle(){if(!window.Paddle)return;${process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox' ? 'window.Paddle.Environment.set("sandbox");' : ''}window.Paddle.Initialize({token:"${process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN}"});}if(window.Paddle){initPaddle();}else{document.querySelector('script[src*="paddle.js"]').addEventListener('load',initPaddle);}`}</Script>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthSync />
            <YouTubeErrorSuppressor />
            <CookieBanner />
            <ToastProvider position="bottom-right">
              {children}
            </ToastProvider>
          </QueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
