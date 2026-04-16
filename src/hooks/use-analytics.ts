'use client';

import { useEffect, useState } from 'react';

export function useAnalytics(period: string = 'month') {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            const res = await fetch(`/api/analytics?period=${period}`);
            const json = await res.json();
            setData(json);
            setLoading(false);
        };
        fetchAnalytics();
    }, [period]);

    return { data, loading };
}