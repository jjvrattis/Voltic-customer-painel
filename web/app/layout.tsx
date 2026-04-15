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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${inter.variable} ${rajdhani.variable} font-sans min-h-screen antialiased`}
        style={{ background: '#06040F', color: '#fff' }}
      >
        {children}
      </body>
    </html>
  );
}

