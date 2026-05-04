import type { Metadata } from 'next';
import { Inter, Rajdhani } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Voltic — Painel Operacional',
  description: 'Painel de operações de last-mile delivery · São Paulo',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Voltic',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <meta name="theme-color" content="#06040F" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');`
        }} />
      </head>
      <body
        className={`${inter.variable} ${rajdhani.variable} font-sans min-h-screen antialiased`}
        style={{ background: '#06040F', color: '#fff' }}
      >
        {children}
      </body>
    </html>
  );
}

