// Sidebar moved to (main)/layout.tsx
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';

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

    return (
        <div className="min-h-screen bg-slate-50">
            {children}
        </div>
    );
}
