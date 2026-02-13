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

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <Sidebar role={String(session.role || 'EMPLOYEE')} />

            {/* Main Content Area */}
            <main className="flex-1 md:ml-[260px] h-full overflow-y-auto w-full">
                {children}
            </main>
        </div>
    );
}
