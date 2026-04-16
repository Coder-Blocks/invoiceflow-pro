import { ReminderForm } from '@/components/reminders/reminder-form';

export default function NewReminderPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">New Reminder</h2>
                <p className="text-muted-foreground">Create an automated payment reminder.</p>
            </div>
            <ReminderForm />
        </div>
    );
}