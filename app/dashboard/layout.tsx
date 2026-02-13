// Sidebar moved to (main)/layout.tsx
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
        redirect('/auth/login');
    }

    // Parent layout is now just a container/auth guard.
    // Child layouts (like (main)/layout.tsx) handle Sidebars and specific frames.
    // This allows pages like chart-detail to be full-width easily.
    return (
        <div className="min-h-screen bg-slate-50 w-full overflow-x-hidden">
            {children}
        </div>
    );
}
