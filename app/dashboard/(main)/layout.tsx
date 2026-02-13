
import Sidebar from '@/components/Sidebar';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';

export default async function MainDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Re-verify session here or trust the parent layout (though parent layout context doesn't pass down easily in SC)
    // For safety and type access to role, we can re-verify or just pass children if we trust root layout.
    // However, Sidebar needs 'role'.
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
        redirect('/auth/login');
    }

    return (
        <div className="flex min-h-screen">
             <Sidebar role={session.role as 'admin' | 'user'} />
            <main className="flex-1 md:ml-72 min-h-screen">
                <div className="pt-16 px-4 pb-6 md:pt-8 md:px-8 md:pb-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
