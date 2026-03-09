import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google';
import PWAProvider from '@/components/PWAProvider';

const bricolage = Bricolage_Grotesque({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-display',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-mono',
});

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#10b981' },
        { media: '(prefers-color-scheme: dark)', color: '#0ea5a2' }
    ],
};

export const metadata: Metadata = {
    title: 'Gapura Operations Dashboard',
    applicationName: 'Gapura IRRS',
    description: 'Gapura Operations Dashboard - Sistem Pelaporan & Monitoring Operasional Bandara',
    manifest: '/manifest.webmanifest',
    icons: {
        icon: [
            { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
        shortcut: '/logo.png',
        apple: [
            { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        ],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Gapura IRRS',
    },
    formatDetection: {
        telephone: false,
    },
    openGraph: {
        type: 'website',
        siteName: 'Gapura IRRS',
        title: 'Gapura Operations Dashboard',
        description: 'Sistem Pelaporan & Monitoring Operasional Bandara',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Gapura Operations Dashboard',
        description: 'Sistem Pelaporan & Monitoring Operasional Bandara',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="id" className={`${bricolage.variable} ${jetbrainsMono.variable}`}>
            <body className={bricolage.className}>
                <PWAProvider>
                    {children}
                </PWAProvider>
            </body>
        </html>
    );
}
