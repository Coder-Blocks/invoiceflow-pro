'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
    issueDate: z.string(),
    dueDate: z.string(),
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
    const [orgCurrency, setOrgCurrency] = useState('INR');

    useEffect(() => {
        const fetchOrg = async () => {
            try {
                const res = await fetch('/api/organization');
                if (res.ok) {
                    const org = await res.json();
                    setOrgCurrency(org.currency || 'INR');
                }
            } catch (error) {
                console.error('Failed to fetch organization currency', error);
            }
        };
        fetchOrg();
    }, []);

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
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0],
            currency: initialData?.currency || orgCurrency,
            items: initialData?.items || [
                { description: '', quantity: 1, unitPrice: 0, taxRate: 0, discount: 0 },
            ],
            notes: initialData?.notes || '',
            terms: initialData?.terms || '',
            footer: initialData?.footer || '',
        },
    });

    useEffect(() => {
        if (orgCurrency && !initialData) {
            form.setValue('currency', orgCurrency);
        }
    }, [orgCurrency, initialData, form]);

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    const watchItems = form.watch('items');
    const watchCurrency = form.watch('currency');
    const subtotal = watchItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
    );
    const taxTotal = watchItems.reduce(
        (sum, item) =>
            sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
        0
    );
    const discountTotal = watchItems.reduce(
        (sum, item) => sum + item.discount,
        0
    );
    const total = subtotal + taxTotal - discountTotal;

    const onSubmit = async (data: InvoiceFormValues) => {
        setIsLoading(true);
        const url = initialData
            ? `/api/invoices/${initialData.id}`
            : '/api/invoices';
        const method = initialData ? 'PATCH' : 'POST';

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
        setIsLoading(false);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="customerId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Customer</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a customer" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {customers.map((customer: any) => (
                                                <SelectItem key={customer.id} value={customer.id}>
                                                    {customer.name}
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
                            name="poNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>PO Number (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="PO-12345" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="issueDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Issue Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Due Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="INR">INR (₹)</SelectItem>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Line Items */}
                <div>
                    <h3 className="text-lg font-medium mb-4">Line Items</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-24">Qty</TableHead>
                                <TableHead className="w-32">Unit Price</TableHead>
                                <TableHead className="w-24">Tax %</TableHead>
                                <TableHead className="w-24">Discount</TableHead>
                                <TableHead className="w-32">Amount</TableHead>
                                <TableHead className="w-16"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => {
                                const item = watchItems[index];
                                const amount =
                                    item.quantity * item.unitPrice +
                                    (item.quantity * item.unitPrice * item.taxRate) / 100 -
                                    item.discount;
                                return (
                                    <TableRow key={field.id}>
                                        <TableCell>
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.description`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input placeholder="Item description" {...field} />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.quantity`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                step="1"
                                                                {...field}
                                                                onChange={(e) =>
                                                                    field.onChange(parseFloat(e.target.value) || 0)
                                                                }
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.unitPrice`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                {...field}
                                                                onChange={(e) =>
                                                                    field.onChange(parseFloat(e.target.value) || 0)
                                                                }
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.taxRate`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.1"
                                                                {...field}
                                                                onChange={(e) =>
                                                                    field.onChange(parseFloat(e.target.value) || 0)
                                                                }
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.discount`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                {...field}
                                                                onChange={(e) =>
                                                                    field.onChange(parseFloat(e.target.value) || 0)
                                                                }
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(amount, watchCurrency)}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                                disabled={fields.length === 1}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() =>
                            append({
                                description: '',
                                quantity: 1,
                                unitPrice: 0,
                                taxRate: 0,
                                discount: 0,
                            })
                        }
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                    <div className="flex justify-end mt-4">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(subtotal, watchCurrency)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax:</span>
                                <span>{formatCurrency(taxTotal, watchCurrency)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Discount:</span>
                                <span>{formatCurrency(discountTotal, watchCurrency)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2">
                                <span>Total:</span>
                                <span>{formatCurrency(total, watchCurrency)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Additional notes..." {...field} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="terms"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Terms</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Payment terms..." {...field} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {initialData ? 'Save Changes' : 'Create Invoice'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}