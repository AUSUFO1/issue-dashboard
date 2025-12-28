import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
