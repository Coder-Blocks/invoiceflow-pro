'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useAnalytics } from '@/hooks/use-analytics';

export function Overview() {
    const { data, loading } = useAnalytics();
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        if (data) {
            const combined = data.invoiceTrends.map((item: any) => {
                const payment = data.paymentTrends.find((p: any) => p.month === item.month);
                return {
                    name: item.month,
                    Revenue: payment?.value || 0,
                    Invoiced: item.value,
                };
            });
            setChartData(combined);
        }
    }, [data]);

    if (loading) {
        return <div className="h-[350px] flex items-center justify-center">Loading...</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                    contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Bar dataKey="Invoiced" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Revenue" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}