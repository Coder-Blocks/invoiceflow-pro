'use client';

import { useEffect, useState } from 'react';
import { useAnalytics } from '@/hooks/use-analytics';
import { formatCurrency } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#7f1d1d'];

export function AgingChart() {
    const { data, loading } = useAnalytics();
    const [agingData, setAgingData] = useState<any[]>([]);

    useEffect(() => {
        if (data?.aging) {
            setAgingData([
                { name: 'Current', value: data.aging.current },
                { name: '1-30 Days', value: data.aging.days1_30 },
                { name: '31-60 Days', value: data.aging.days31_60 },
                { name: '61-90 Days', value: data.aging.days61_90 },
                { name: '90+ Days', value: data.aging.days90plus },
            ].filter(item => item.value > 0));
        }
    }, [data]);

    if (loading) {
        return <div className="h-[250px] flex items-center justify-center">Loading...</div>;
    }

    const total = agingData.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        return <p className="text-center text-muted-foreground py-4">No outstanding invoices.</p>;
    }

    return (
        <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                <Pie
                    data={agingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                    {agingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
        </ResponsiveContainer>
    );
}