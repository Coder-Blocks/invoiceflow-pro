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

    // 自动填充逻辑保持不变
    // ...

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

    // JSX 保持不变
}