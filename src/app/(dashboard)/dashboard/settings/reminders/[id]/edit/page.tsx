import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ReminderForm } from '@/components/reminders/reminder-form';

export default async function EditReminderPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.activeOrgId) return notFound();
    const { id } = await params;

    const reminder = await prisma.reminder.findUnique({ where: { id, organizationId: session.user.activeOrgId } });
    if (!reminder) return notFound();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Edit Reminder</h2>
                <p className="text-muted-foreground">Modify your reminder settings.</p>
            </div>
            <ReminderForm initialData={reminder} />
        </div>
    );
}