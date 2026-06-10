import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'TASL Platform Dashboard',
  description: 'Dassault Rafale Lateral Shell PFM',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
