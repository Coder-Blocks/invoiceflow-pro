import { Suspense } from 'react';
import { RemindersList } from '@/components/reminders/reminders-list';
import { RemindersSkeleton } from '@/components/reminders/reminders-skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function RemindersPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Payment Reminders</h2>
                    <p className="text-muted-foreground">
                        Automate payment reminders for your customers.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/settings/reminders/new">
                        <Plus className="mr-2 h-4 w-4" /> Add Reminder
                    </Link>
                </Button>
            </div>

            <Suspense fallback={<RemindersSkeleton />}>
                <RemindersList />
            </Suspense>
        </div>
    );
}