'use client';

import { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MoreHorizontal, Pause, Play, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const statusVariants: Record<string, string> = {
    ACTIVE: 'success',
    PAUSED: 'warning',
    COMPLETED: 'default',
    CANCELLED: 'destructive',
};

const frequencyLabels: Record<string, string> = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    MONTHLY: 'Monthly',
    YEARLY: 'Yearly',
};

export function RecurringTable() {
    const [recurring, setRecurring] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecurring();
    }, []);

    const fetchRecurring = async () => {
        const res = await fetch('/api/recurring-invoices');
        const data = await res.json();
        setRecurring(data);
        setLoading(false);
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        const res = await fetch(`/api/recurring-invoices/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
            toast.success(`Recurring invoice ${newStatus === 'ACTIVE' ? 'resumed' : 'paused'}`);
            fetchRecurring();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This will not delete already generated invoices.')) return;
        const res = await fetch(`/api/recurring-invoices/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success('Recurring invoice deleted');
            fetchRecurring();
        }
    };

    if (loading) {
        return <div className="py-10 text-center">Loading...</div>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Next Run</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recurring.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                                No recurring invoices set up.
                            </TableCell>
                        </TableRow>
                    ) : (
                        recurring.map((item: any) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                    <Link href={`/dashboard/customers/${item.customerId}`} className="hover:underline">
                                        {item.customer?.name}
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    Every {item.interval > 1 ? item.interval : ''} {frequencyLabels[item.frequency]}
                                    {item.interval > 1 && item.frequency === 'WEEKLY' ? 'weeks' :
                                        item.interval > 1 && item.frequency === 'MONTHLY' ? 'months' :
                                            item.interval > 1 && item.frequency === 'YEARLY' ? 'years' : ''}
                                </TableCell>
                                <TableCell>{formatDate(item.nextRunDate)}</TableCell>
                                <TableCell>{item.endDate ? formatDate(item.endDate) : '—'}</TableCell>
                                <TableCell>
                                    <Badge variant={statusVariants[item.status] as any}>{item.status}</Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/dashboard/recurring/${item.id}/edit`}>Edit</Link>
                                            </DropdownMenuItem>
                                            {item.status === 'ACTIVE' ? (
                                                <DropdownMenuItem onClick={() => toggleStatus(item.id, item.status)}>
                                                    <Pause className="mr-2 h-4 w-4" /> Pause
                                                </DropdownMenuItem>
                                            ) : item.status === 'PAUSED' ? (
                                                <DropdownMenuItem onClick={() => toggleStatus(item.id, item.status)}>
                                                    <Play className="mr-2 h-4 w-4" /> Resume
                                                </DropdownMenuItem>
                                            ) : null}
                                            <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-red-600">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}