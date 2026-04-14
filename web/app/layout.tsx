import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Voltic — Painel Operacional',
  description: 'Painel de operações de last-mile delivery',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${inter.variable} font-sans bg-zinc-950 text-white min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
