import '@/styles/main.scss';
// Statically bundled so it loads as a same-origin <link>, not sonner's
// runtime-injected <style> tag — the latter has no way to carry our
// per-request CSP nonce and gets blocked under the strict style-src used in
// production (see buildCsp in src/proxy.ts).
import 'sonner/dist/styles.css';
import type { Metadata } from 'next';
import { Roboto, Space_Grotesk } from 'next/font/google';
import { Providers } from './providers';

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Access to Credit System',
  description: 'Manage, filter, and process your lead and loan pipelines.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

// Force dynamic rendering so the per-request CSP nonce (set in src/proxy.ts)
// can be stamped onto Next's script tags.
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${roboto.variable} ${spaceGrotesk.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="font-body min-h-full flex flex-col antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
