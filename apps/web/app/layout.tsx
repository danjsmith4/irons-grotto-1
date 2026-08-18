import '@radix-ui/themes/styles.css';
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';
import { Theme } from '@radix-ui/themes';
import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { ToastContainer } from 'react-toastify';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import Providers from './providers';

if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
  await import('../mocks');
}

// Type system: Inter for body, Space Grotesk for display/headings,
// JetBrains Mono for tabular data (stats, leaderboard numbers).
// Exposed as CSS variables and consumed by Radix in globals.css.
const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Irons Grotto - Old School RuneScape Clan',
  // Favicon / touch icons come from the App Router file conventions:
  // app/favicon.ico, app/icon.png, app/apple-icon.png (all generated from the logo).
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`}
        suppressHydrationWarning
      >
        <Analytics />
        <SpeedInsights />
        <Theme
          accentColor="grass"
          appearance="dark"
          id="theme-root"
          panelBackground="solid"
          radius="small"
          className="dark-theme"
        >
          <Providers>{children}</Providers>
          <ToastContainer
            theme="dark"
            pauseOnHover
            pauseOnFocusLoss
            bodyClassName="rt-Text rt-r-size-2"
            autoClose={8000}
            position="top-center"
          />
        </Theme>
      </body>
    </html>
  );
}
