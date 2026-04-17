'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const invoiceItemSchema = z.object({
    description: z.string().min(1, 'Description required'),
    quantity: z.number().min(1, 'Quantity required'),
    unitPrice: z.number().min(0, 'Price required'),
    taxRate: z.number().min(0).default(0),
    discount: z.number().min(0).default(0),
});

const invoiceSchema = z.object({
    customerId: z.string().optional(),
    poNumber: z.string().optional(),
    issueDate: z.string().min(1, 'Issue date is required'),
    dueDate: z.string().min(1, 'Due date is required'),
    currency: z.string().default('INR'),
    items: z.array(invoiceItemSchema).min(1, 'At least one item required'),
    notes: z.string().optional(),
    terms: z.string().optional(),
    footer: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
    initialData?: any;
    customers: any[];
}

export function InvoiceForm({ initialData, customers }: InvoiceFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [orgSettings, setOrgSettings] = useState<any>(null);

    useEffect(() => {
        const fetchOrg = async () => {
            try {
                const res = await fetch('/api/organization');
                if (res.ok) {
                    const org = await res.json();
                    setOrgSettings(org);
                }
            } catch (error) {
                console.error('Failed to fetch organization settings', error);
            }
        };
        fetchOrg();
    }, []);

    const defaultTaxRate = orgSettings?.settings?.defaultTaxRate || 0;
    const defaultCurrency = orgSettings?.currency || 'INR';

    const form = useForm<InvoiceFormValues>({
        resolver: zodResolver(invoiceSchema),
        defaultValues: {
            customerId: initialData?.customerId || '',
            poNumber: initialData?.poNumber || '',
            issueDate: initialData?.issueDate
                ? new Date(initialData.issueDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
            dueDate: initialData?.dueDate
                ? new Date(initialData.dueDate).toISOString().split('T')[0]
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            currency: initialData?.currency || defaultCurrency,
            items: initialData?.items || [
                { description: '', quantity: 1, unitPrice: 0, taxRate: defaultTaxRate, discount: 0 },
            ],
            notes: initialData?.notes || orgSettings?.settings?.defaultNotes || '',
            terms: initialData?.terms || orgSettings?.settings?.defaultTerms || '',
            footer: initialData?.footer || orgSettings?.settings?.defaultFooter || '',
        },
    });

    useEffect(() => {
        if (orgSettings && !initialData) {
            form.setValue('currency', defaultCurrency);
            form.setValue('notes', orgSettings?.settings?.defaultNotes || '');
            form.setValue('terms', orgSettings?.settings?.defaultTerms || '');
            form.setValue('footer', orgSettings?.settings?.defaultFooter || '');
            // Update default tax rate for existing items
            const items = form.getValues('items');
            items.forEach((_, index) => {
                form.setValue(`items.${index}.taxRate`, defaultTaxRate);
            });
        }
    }, [orgSettings, initialData, form, defaultCurrency, defaultTaxRate]);

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    const watchItems = form.watch('items');
    const watchCurrency = form.watch('currency');
    const subtotal = watchItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxTotal = watchItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate) / 100, 0);
    const discountTotal = watchItems.reduce((sum, item) => sum + item.discount, 0);
    const total = subtotal + taxTotal - discountTotal;

    const onSubmit = async (data: InvoiceFormValues) => {
        setIsLoading(true);
        const url = initialData ? `/api/invoices/${initialData.id}` : '/api/invoices';
        const method = initialData ? 'PATCH' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                toast.success(initialData ? 'Invoice updated' : 'Invoice created');
                router.push('/dashboard/invoices');
                router.refresh();
            } else {
                const error = await res.text();
                toast.error(error || 'Something went wrong');
            }
        } catch (error) {
            toast.error('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* 表单内容保持不变，与之前提供的相同 */}
                {/* ... 省略具体 JSX 以节省篇幅，请使用之前完整的 InvoiceForm 代码，但确保以上逻辑已更新 ... */}
            </form>
        </Form>
    );
}