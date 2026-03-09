
import Sidebar from '@/components/Sidebar';
import { MobileNavWrapper } from '@/components/MobileNavWrapper';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';

export default async function MainDashboardLayout({
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
        <div className="flex min-h-screen">
             <Sidebar role={session.role as string} />
            
            <main className="flex-1 min-h-screen overflow-x-hidden bg-[var(--surface-0)] flex flex-col pb-24 md:pb-0 md:pl-[240px] lg:pl-[260px]">
                {children}
            </main>

            <MobileNavWrapper role={session.role as string} />
        </div>
    );
}
