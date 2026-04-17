'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Suspense } from 'react';

const paymentSchema = z.object({
    invoiceId: z.string().optional(),
    customerId: z.string().optional(),
    amount: z.coerce.number().positive('Amount must be positive'),
    paymentDate: z.string().min(1, 'Payment date is required'),
    paymentMethod: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
    invoices?: any[];
    customers?: any[];
}

function PaymentFormInner({ invoices = [], customers = [] }: PaymentFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const invoiceIdParam = searchParams.get('invoiceId');
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            invoiceId: invoiceIdParam || 'NONE',
            customerId: '',
            amount: 0,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: '',
            reference: '',
            notes: '',
        },
    });

    const onSubmit = async (data: PaymentFormValues) => {
        setIsLoading(true);
        const payload = { ...data, invoiceId: data.invoiceId === 'NONE' ? undefined : data.invoiceId };
        try {
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                toast.success('Payment recorded');
                router.push(payload.invoiceId ? `/dashboard/invoices/${payload.invoiceId}` : '/dashboard/payments');
                router.refresh();
            } else {
                const error = await res.text();
                toast.error(error || 'Failed to record payment');
            }
        } catch (error) {
            toast.error('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
                <FormField
                    control={form.control}
                    name="invoiceId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Invoice (optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an invoice" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="NONE">No invoice</SelectItem>
                                    {invoices.map((inv: any) => (
                                        <SelectItem key={inv.id} value={inv.id}>
                                            {inv.invoiceNumber} — {inv.customer?.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Customer (optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a customer" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="">No customer</SelectItem>
                                    {customers.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount *</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="paymentDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Payment Date *</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Payment Method</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select method" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                        <SelectItem value="CASH">Cash</SelectItem>
                                        <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                                        <SelectItem value="UPI">UPI</SelectItem>
                                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="reference"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Reference / Transaction ID</FormLabel>
                                <FormControl>
                                    <Input placeholder="UTR123456..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Optional notes..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Record Payment'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

export function PaymentForm(props: PaymentFormProps) {
    return (
        <Suspense fallback={<div className="p-4 text-muted-foreground">Loading form...</div>}>
            <PaymentFormInner {...props} />
        </Suspense>
    );
}