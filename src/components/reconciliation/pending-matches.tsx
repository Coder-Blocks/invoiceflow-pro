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
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export function PendingMatches() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMatches();
    }, []);

    const fetchMatches = async () => {
        setLoading(true);
        // Fetch bank transactions with pending matches
        const res = await fetch('/api/bank-transactions?matched=false');
        const data = await res.json();
        const pending = data.transactions
            .flatMap((t: any) => t.reconciliationMatches || [])
            .filter((m: any) => m.status === 'PENDING');
        setMatches(pending);
        setLoading(false);
    };

    const handleAction = async (id: string, status: 'CONFIRMED' | 'REJECTED') => {
        const res = await fetch(`/api/reconciliation-matches/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        if (res.ok) {
            toast.success(status === 'CONFIRMED' ? 'Match confirmed' : 'Match rejected');
            fetchMatches();
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
                        <TableHead>Bank Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Suggested Match</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {matches.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                                No pending matches.
                            </TableCell>
                        </TableRow>
                    ) : (
                        matches.map((match: any) => (
                            <TableRow key={match.id}>
                                <TableCell>{formatDate(match.bankTransaction?.date)}</TableCell>
                                <TableCell>{match.bankTransaction?.description}</TableCell>
                                <TableCell>{formatCurrency(match.bankTransaction?.amount)}</TableCell>
                                <TableCell>
                                    {match.payment?.invoice?.invoiceNumber || match.invoice?.invoiceNumber || '—'}
                                    {match.payment?.customer?.name && ` (${match.payment.customer.name})`}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={match.confidence > 0.8 ? 'success' : 'warning'}>
                                        {Math.round(match.confidence * 100)}%
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Button size="sm" variant="outline" onClick={() => handleAction(match.id, 'CONFIRMED')}>
                                            <CheckCircle className="mr-1 h-3 w-3" /> Confirm
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleAction(match.id, 'REJECTED')}>
                                            <XCircle className="mr-1 h-3 w-3" /> Reject
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}