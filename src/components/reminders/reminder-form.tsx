'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const reminderSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    subject: z.string().min(1, 'Subject is required'),
    body: z.string().min(1, 'Email body is required'),
    triggerDays: z.coerce.number().int(),
    isActive: z.boolean().default(true),
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

interface ReminderFormProps {
    initialData?: any;
}

export function ReminderForm({ initialData }: ReminderFormProps) {
    const router = useRouter();
    const form = useForm<ReminderFormValues>({
        resolver: zodResolver(reminderSchema),
        defaultValues: {
            name: initialData?.name || '',
            subject: initialData?.subject || 'Payment Reminder for Invoice {{invoiceNumber}}',
            body: initialData?.body || `Dear {{customerName}},\n\nThis is a reminder that invoice {{invoiceNumber}} for ${{ total }} is due on {{dueDate}}.\n\nPlease make payment at your earliest convenience.\n\nThank you,\n{{organizationName}}`,
            triggerDays: initialData?.triggerDays ?? -3,
            isActive: initialData?.isActive ?? true,
        },
    });

    const onSubmit = async (data: ReminderFormValues) => {
        const url = initialData ? `/api/reminders/${initialData.id}` : '/api/reminders';
        const method = initialData ? 'PATCH' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (res.ok) {
            toast.success(initialData ? 'Reminder updated' : 'Reminder created');
            router.push('/dashboard/settings/reminders');
            router.refresh();
        } else {
            toast.error('Something went wrong');
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Reminder Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Friendly Reminder 3 Days Before" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email Subject</FormLabel>
                            <FormControl>
                                <Input placeholder="Payment Reminder: Invoice {{invoiceNumber}}" {...field} />
                            </FormControl>
                            <FormDescription>
                                Use {'{{'}invoiceNumber{'}}'}, {'{{'}customerName{'}}'}, etc.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="body"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email Body</FormLabel>
                            <FormControl>
                                <Textarea rows={8} placeholder="Write your reminder message..." {...field} />
                            </FormControl>
                            <FormDescription>
                                Available variables: {'{{'}customerName{'}}'}, {'{{'}invoiceNumber{'}}'}, {'{{'}dueDate{'}}'}, {'{{'}total{'}}'}, {'{{'}organizationName{'}}'}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="triggerDays"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Send Timing</FormLabel>
                            <Select
                                onValueChange={(v) => field.onChange(parseInt(v))}
                                defaultValue={field.value.toString()}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select when to send" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="-7">7 days before due date</SelectItem>
                                    <SelectItem value="-3">3 days before due date</SelectItem>
                                    <SelectItem value="-1">1 day before due date</SelectItem>
                                    <SelectItem value="0">On due date</SelectItem>
                                    <SelectItem value="1">1 day after due date</SelectItem>
                                    <SelectItem value="3">3 days after due date</SelectItem>
                                    <SelectItem value="7">7 days after due date</SelectItem>
                                    <SelectItem value="14">14 days after due date</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Active</FormLabel>
                                <FormDescription>
                                    Enable or disable this reminder.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit">{initialData ? 'Save Changes' : 'Create Reminder'}</Button>
                </div>
            </form>
        </Form>
    );
}