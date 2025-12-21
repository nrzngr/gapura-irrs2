import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-display',
    weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
    title: 'Gapura Operations Dashboard',
    description: 'Sistem Pelaporan & Monitoring Operasional Bandara',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="id" className={plusJakartaSans.variable}>
            <body className={plusJakartaSans.className}>{children}</body>
        </html>
    );
}
