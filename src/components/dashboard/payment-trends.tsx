'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useAnalytics } from '@/hooks/use-analytics';
import { useSearchParams } from 'next/navigation';

export function PaymentTrends() {
    const searchParams = useSearchParams();
    const period = searchParams.get('period') || 'month';
    const { data, loading } = useAnalytics(period);
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        if (data?.paymentTrends) {
            setChartData(data.paymentTrends);
        }
    }, [data]);

    if (loading) {
        return <div className="h-[200px] flex items-center justify-center">Loading...</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
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
                <Bar dataKey="value" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}