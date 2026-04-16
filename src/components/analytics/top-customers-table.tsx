'use client';

import { useEffect, useState } from 'react';
import { useAnalytics } from '@/hooks/use-analytics';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import Link from 'next/link';

export function TopCustomersTable({ showAll = false }: { showAll?: boolean }) {
    const { data, loading } = useAnalytics();
    const [customers, setCustomers] = useState<any[]>([]);

    useEffect(() => {
        if (data?.topCustomers) {
            setCustomers(showAll ? data.topCustomers : data.topCustomers.slice(0, 5));
        }
    }, [data, showAll]);

    if (loading) {
        return <div className="py-8 text-center">Loading...</div>;
    }

    if (customers.length === 0) {
        return <p className="text-center text-muted-foreground py-8">No customer data yet.</p>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {customers.map((customer) => {
                    const totalRevenue = customers.reduce((sum, c) => sum + c.revenue, 0);
                    const percentage = totalRevenue > 0 ? (customer.revenue / totalRevenue) * 100 : 0;
                    return (
                        <TableRow key={customer.name}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                                    </Avatar>
                                    <Link href={`/dashboard/customers/${customer.id}`} className="font-medium hover:underline">
                                        {customer.name}
                                    </Link>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(customer.revenue)}</TableCell>
                            <TableCell className="text-right">{percentage.toFixed(1)}%</TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}