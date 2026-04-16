'use client';

import { useState } from 'react';
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
    FormDescription,
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
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const itemSchema = z.object({
    description: z.string().min(1),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    taxRate: z.number().min(0).default(0),
    discount: z.number().min(0).default(0),
});

const recurringSchema = z.object({
    customerId: z.string().min(1, 'Customer is required'),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    interval: z.number().int().positive().default(1),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional(),
    status: z.enum(['ACTIVE', 'PAUSED']).default('ACTIVE'),
    items: z.array(itemSchema).min(1, 'At least one item required'),
    currency: z.string().default('USD'),
    notes: z.string().optional(),
    terms: z.string().optional(),
    footer: z.string().optional(),
});

type RecurringFormValues = z.infer<typeof recurringSchema>;

interface RecurringFormProps {
    initialData?: any;
    customers: any[];
}

export function RecurringForm({ initialData, customers }: RecurringFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<RecurringFormValues>({
        resolver: zodResolver(recurringSchema),
        defaultValues: {
            customerId: initialData?.customerId || '',
            frequency: initialData?.frequency || 'MONTHLY',
            interval: initialData?.interval || 1,
            startDate: initialData?.startDate
                ? new Date(initialData.startDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
            endDate: initialData?.endDate
                ? new Date(initialData.endDate).toISOString().split('T')[0]
                : '',
            status: initialData?.status || 'ACTIVE',
            items: (initialData?.invoiceData as any)?.items || [{ description: '', quantity: 1, unitPrice: 0, taxRate: 0, discount: 0 }],
            currency: (initialData?.invoiceData as any)?.currency || 'USD',
            notes: (initialData?.invoiceData as any)?.notes || '',
            terms: (initialData?.invoiceData as any)?.terms || '',
            footer: (initialData?.invoiceData as any)?.footer || '',
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    const watchItems = form.watch('items');
    const subtotal = watchItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxTotal = watchItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate / 100), 0);
    const discountTotal = watchItems.reduce((sum, item) => sum + item.discount, 0);
    const total = subtotal + taxTotal - discountTotal;

    const onSubmit = async (data: RecurringFormValues) => {
        setIsLoading(true);

        const payload = {
            customerId: data.customerId,
            frequency: data.frequency,
            interval: data.interval,
            startDate: new Date(data.startDate).toISOString(),
            endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
            status: data.status,
            invoiceData: {
                items: data.items,
                currency: data.currency,
                notes: data.notes,
                terms: data.terms,
                footer: data.footer,
            },
        };

        const url = initialData ? `/api/recurring-invoices/${initialData.id}` : '/api/recurring-invoices';
        const method = initialData ? 'PATCH' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            toast.success(initialData ? 'Recurring invoice updated' : 'Recurring invoice created');
            router.push('/dashboard/recurring');
            router.refresh();
        } else {
            toast.error('Something went wrong');
        }
        setIsLoading(false);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Customer</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="frequency"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Frequency</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="DAILY">Daily</SelectItem>
                                            <SelectItem value="WEEKLY">Weekly</SelectItem>
                                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                                            <SelectItem value="YEARLY">Yearly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="interval"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Interval</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="1"
                                            {...field}
                                            onChange={e => field.onChange(parseInt(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormDescription>Every {field.value} {form.watch('frequency').toLowerCase()}(s)</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Start Date</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>End Date (Optional)</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormDescription>Leave empty to run indefinitely</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div>
                                <FormLabel className="text-base">Active</FormLabel>
                                <FormDescription>
                                    When active, invoices will be generated automatically.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value === 'ACTIVE'}
                                    onCheckedChange={(checked) => field.onChange(checked ? 'ACTIVE' : 'PAUSED')}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

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
                                const amount = (item.quantity * item.unitPrice) +
                                    (item.quantity * item.unitPrice * item.taxRate / 100) - item.discount;
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
                                                                {...field}
                                                                onChange={e => field.onChange(parseFloat(e.target.value))}
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
                                                                onChange={e => field.onChange(parseFloat(e.target.value))}
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
                                                                onChange={e => field.onChange(parseFloat(e.target.value))}
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
                                                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(amount)}
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
                        onClick={() => append({ description: '', quantity: 1, unitPrice: 0, taxRate: 0, discount: 0 })}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                    <div className="flex justify-end mt-4">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax:</span>
                                <span>{formatCurrency(taxTotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Discount:</span>
                                <span>{formatCurrency(discountTotal)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2">
                                <span>Total:</span>
                                <span>{formatCurrency(total)}</span>
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
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {initialData ? 'Save Changes' : 'Create Recurring Invoice'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}