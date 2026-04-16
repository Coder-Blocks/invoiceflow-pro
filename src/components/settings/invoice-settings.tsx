'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const invoiceSchema = z.object({
    invoicePrefix: z.string().default('INV'),
    defaultNotes: z.string().optional().nullable(),
    defaultTerms: z.string().optional().nullable(),
    defaultFooter: z.string().optional().nullable(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceSettingsProps {
    organization: any;
    canManage: boolean;
    settings: any;
}

export function InvoiceSettings({ organization, canManage, settings }: InvoiceSettingsProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<InvoiceFormValues>({
        resolver: zodResolver(invoiceSchema),
        defaultValues: {
            invoicePrefix: organization.invoicePrefix || 'INV',
            defaultNotes: settings?.defaultNotes || '',
            defaultTerms: settings?.defaultTerms || '',
            defaultFooter: settings?.defaultFooter || '',
        },
    });

    const onSubmit = async (data: InvoiceFormValues) => {
        setIsLoading(true);
        const res = await fetch('/api/organization', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            toast.success('Invoice settings updated');
        } else {
            toast.error('Failed to update settings');
        }
        setIsLoading(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Invoice Defaults</CardTitle>
                <CardDescription>
                    Configure default invoice settings and templates.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="invoicePrefix"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Invoice Number Prefix</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="INV"
                                            {...field}
                                            disabled={!canManage}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="defaultNotes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Default Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Thank you for your business!"
                                            {...field}
                                            value={field.value || ''}
                                            disabled={!canManage}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="defaultTerms"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Default Terms</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Payment due within 30 days."
                                            {...field}
                                            value={field.value || ''}
                                            disabled={!canManage}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="defaultFooter"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Default Footer</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Powered by InvoiceFlow Pro"
                                            {...field}
                                            value={field.value || ''}
                                            disabled={!canManage}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {canManage && (
                            <div className="flex justify-end">
                                <Button type="submit" disabled={isLoading}>
                                    Save Changes
                                </Button>
                            </div>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}