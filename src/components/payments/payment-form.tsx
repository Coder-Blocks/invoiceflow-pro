'use client';

import { useState, useEffect } from 'react';
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
import { formatCurrency } from '@/lib/utils';

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

export function PaymentForm({ invoices = [], customers = [] }: PaymentFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const invoiceIdParam = searchParams.get('invoiceId');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
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

    useEffect(() => {
        const inv = invoices.find(i => i.id === form.watch('invoiceId'));
        setSelectedInvoice(inv);
        if (inv) {
            const balanceDue = inv.total - (inv.payments?.reduce((s: number, p: any) => s + p.amount, 0) || 0);
            if (balanceDue > 0) form.setValue('amount', balanceDue);
            form.setValue('customerId', inv.customerId);
        } else {
            form.setValue('amount', 0);
            form.setValue('customerId', '');
        }
    }, [form.watch('invoiceId'), invoices, form]);

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

    const watchInvoiceId = form.watch('invoiceId');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
                <FormField
                    control={form.control}
                    name="invoiceId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Invoice (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an invoice" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="NONE">No invoice (direct payment)</SelectItem>
                                    {invoices.map((inv: any) => {
                                        const paid = inv.payments?.reduce((s: number, p: any) => s + p.amount, 0) || 0;
                                        const balance = inv.total - paid;
                                        return (
                                            <SelectItem key={inv.id} value={inv.id} disabled={balance <= 0}>
                                                {inv.invoiceNumber} - {inv.customer?.name} ({formatCurrency(balance)} due)
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {watchInvoiceId === 'NONE' && (
                    <FormField
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Customer</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a customer" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {customers.map((cust: any) => (
                                            <SelectItem key={cust.id} value={cust.id}>{cust.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" min="0.01" {...field} />
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
                                <FormLabel>Payment Date</FormLabel>
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
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select method" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                        <SelectItem value="Check">Check</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
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
                                <FormLabel>Reference (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Check #, Transaction ID" {...field} />
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
                                <Textarea placeholder="Additional notes..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        Record Payment
                    </Button>
                </div>
            </form>
        </Form>
    );
}