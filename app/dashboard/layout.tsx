import Sidebar from '@/components/Sidebar';
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
            <Sidebar role={session.role as 'admin' | 'user'} />
            <main className="md:ml-72 min-h-screen">
                <div className="pt-16 px-4 pb-6 md:pt-8 md:px-8 md:pb-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
