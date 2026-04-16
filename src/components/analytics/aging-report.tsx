'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAnalytics } from '@/hooks/use-analytics';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#7f1d1d'];

export function AgingReport() {
    const { data, loading } = useAnalytics();
    const [agingData, setAgingData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        if (data?.aging) {
            const items = [
                { name: 'Current', value: data.aging.current },
                { name: '1-30 Days', value: data.aging.days1_30 },
                { name: '31-60 Days', value: data.aging.days31_60 },
                { name: '61-90 Days', value: data.aging.days61_90 },
                { name: '90+ Days', value: data.aging.days90plus },
            ].filter(item => item.value > 0);
            setAgingData(items);
            setTotal(items.reduce((sum, item) => sum + item.value, 0));
        }
    }, [data]);

    if (loading) {
        return <div className="h-[400px] flex items-center justify-center">Loading...</div>;
    }

    if (total === 0) {
        return <p className="text-center text-muted-foreground py-8">No outstanding invoices.</p>;
    }

    return (
        <div className="space-y-6">
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={agingData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                            {agingData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Age</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {agingData.map((item, index) => (
                        <TableRow key={item.name}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                            <TableCell className="text-right">{((item.value / total) * 100).toFixed(1)}%</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}