import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/context/StoreContext';
import { Navigation } from '@/components/Navigation';
import { UndoToast } from '@/components/UndoToast';
import { SellModal } from '@/components/SellModal';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Tindahan Tracker | Subaybayan ang Inventory, Benta, at Kita',
  description:
    'Simple at madaling gamiting web app para sa may-ari ng tindahan upang subaybayan ang stock, benta, totoong kita, at humingi ng payo sa AI.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tl">
      <body className={`${inter.className} min-h-screen bg-[#f4f6fa] text-slate-900 antialiased relative selection:bg-emerald-500 selection:text-white`}>
        <StoreProvider>
          <div className="flex min-h-screen flex-col md:flex-row relative z-10">
            <Navigation />
            <main className="flex-1 pb-28 md:pb-10 md:pl-72 transition-all min-h-screen">
              <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 pt-4 sm:pt-6">
                {children}
              </div>
            </main>
          </div>
          <SellModal />
          <UndoToast />
        </StoreProvider>
      </body>
    </html>
  );
}
