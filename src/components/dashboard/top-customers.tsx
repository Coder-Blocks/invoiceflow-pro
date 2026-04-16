'use client';

import { useEffect, useState } from 'react';
import { useAnalytics } from '@/hooks/use-analytics';
import { formatCurrency } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

export function TopCustomers() {
    const { data, loading } = useAnalytics();
    const [customers, setCustomers] = useState<any[]>([]);

    useEffect(() => {
        if (data?.topCustomers) {
            setCustomers(data.topCustomers);
        }
    }, [data]);

    if (loading) {
        return <div className="py-4 text-center">Loading...</div>;
    }

    if (customers.length === 0) {
        return <p className="text-center text-muted-foreground py-4">No customer data yet.</p>;
    }

    return (
        <div className="space-y-4">
            {customers.map((customer, index) => (
                <div key={index} className="flex items-center">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{customer.name}</p>
                    </div>
                    <div className="ml-auto font-medium">{formatCurrency(customer.revenue)}</div>
                </div>
            ))}
        </div>
    );
}