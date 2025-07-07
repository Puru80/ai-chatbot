import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import Script from 'next/script'; // Import next/script

import './globals.css';
import { SessionProvider } from 'next-auth/react';
import React from "react";

export const metadata: Metadata = {
  metadataBase: new URL('https://chat.vercel.ai'),
  title: 'Askro',
  description: 'Chatbot with Multi LLM Support',
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});

const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence, the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
        <title>Askro AI</title>
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position="top-center" />
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
        <Script src="https://cdn.paddle.com/paddle/paddle.js" strategy="lazyOnload" />
        <Script id="paddle-init" strategy="lazyOnload">
          {`
            if (typeof Paddle !== 'undefined') {
              if (process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN) {
                Paddle.Initialize({
                  token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
                  environment: process.env.NEXT_PUBLIC_PADDLE_ENV === 'production' ? 'live' : 'sandbox',
                  eventCallback: function(data) {
                    // console.log('Paddle event:', data); // Optional: for debugging Paddle events
                  }
                });
              } else {
                console.error('Paddle client token is not defined. Paddle.js will not be initialized.');
              }
            } else {
              console.error('Paddle.js not loaded.');
            }
          `}
        </Script>
      </body>
    </html>
  );
}
