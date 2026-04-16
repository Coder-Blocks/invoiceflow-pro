'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface MatchSuggestion {
    id?: string;
    paymentId?: string;
    invoiceId?: string;
    invoiceNumber?: string;
    customerName?: string;
    amount: number;
    date: string;
    confidence: number;
    type: 'payment' | 'invoice';
}

export function MatchSuggestions({ transaction, onMatch }: any) {
    const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

    useEffect(() => {
        fetchSuggestions();
    }, [transaction.id]);

    const fetchSuggestions = async () => {
        setLoading(true);
        // First check if there are existing pending matches for this transaction
        const resMatches = await fetch(`/api/bank-transactions?matched=false`);
        const data = await resMatches.json();
        const txnData = data.transactions.find((t: any) => t.id === transaction.id);
        if (txnData?.reconciliationMatches?.length > 0) {
            // Use existing suggestions
            const matches = txnData.reconciliationMatches.map((m: any) => ({
                id: m.id,
                paymentId: m.paymentId,
                invoiceId: m.invoiceId,
                invoiceNumber: m.invoice?.invoiceNumber || m.payment?.invoice?.invoiceNumber,
                customerName: m.invoice?.customer?.name || m.payment?.customer?.name,
                amount: m.payment?.amount || m.invoice?.total,
                date: m.payment?.paymentDate || m.invoice?.issueDate,
                confidence: m.confidence,
                type: m.paymentId ? 'payment' : 'invoice',
            }));
            setSuggestions(matches);
        } else {
            // Generate new suggestions on the fly
            await generateSuggestions();
        }
        setLoading(false);
    };

    const generateSuggestions = async () => {
        // Fetch payments within amount tolerance
        const resPayments = await fetch(`/api/payments?limit=100`);
        const paymentsData = await resPayments.json();
        const payments = paymentsData.payments || [];

        const resInvoices = await fetch(`/api/invoices?limit=100&status=SENT,VIEWED,PARTIAL_PAID`);
        const invoicesData = await resInvoices.json();
        const invoices = invoicesData.invoices || [];

        const matches: MatchSuggestion[] = [];

        // Match payments
        for (const payment of payments) {
            if (Math.abs(payment.amount - Math.abs(transaction.amount)) < 0.01) {
                const daysDiff = Math.abs(
                    (new Date(transaction.date).getTime() - new Date(payment.paymentDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                if (daysDiff <= 7) {
                    matches.push({
                        paymentId: payment.id,
                        invoiceNumber: payment.invoice?.invoiceNumber,
                        customerName: payment.customer?.name,
                        amount: payment.amount,
                        date: payment.paymentDate,
                        confidence: Math.max(0.5, 1.0 - daysDiff * 0.1),
                        type: 'payment',
                    });
                }
            }
        }

        // Match invoices directly
        for (const invoice of invoices) {
            const paid = invoice.payments?.reduce((s: number, p: any) => s + p.amount, 0) || 0;
            const balance = invoice.total - paid;
            if (Math.abs(balance - Math.abs(transaction.amount)) < 0.01) {
                matches.push({
                    invoiceId: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    customerName: invoice.customer?.name,
                    amount: balance,
                    date: invoice.issueDate,
                    confidence: 0.7,
                    type: 'invoice',
                });
            }
        }

        setSuggestions(matches);
    };

    const handleConfirm = async (match: MatchSuggestion) => {
        let matchId = match.id;
        if (!matchId) {
            // Create a new reconciliation match first
            const res = await fetch('/api/reconciliation-matches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bankTransactionId: transaction.id,
                    paymentId: match.paymentId,
                    invoiceId: match.invoiceId,
                    confidence: match.confidence,
                }),
            });
            const newMatch = await res.json();
            matchId = newMatch.id;
        }

        const res = await fetch(`/api/reconciliation-matches/${matchId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'CONFIRMED' }),
        });

        if (res.ok) {
            toast.success('Transaction matched successfully');
            onMatch();
        } else {
            toast.error('Failed to confirm match');
        }
    };

    const handleReject = async (matchId?: string) => {
        if (matchId) {
            await fetch(`/api/reconciliation-matches/${matchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'REJECTED' }),
            });
        }
        toast.success('Match rejected');
        onMatch();
    };

    if (loading) {
        return <div className="py-4 text-center">Finding matches...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                    Transaction: {formatDate(transaction.date)} - {transaction.description} ({formatCurrency(transaction.amount)})
                </h3>
                <Button variant="outline" size="sm" onClick={generateSuggestions}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
            </div>

            {suggestions.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No matching invoices or payments found.</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Confidence</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {suggestions.map((match, idx) => (
                            <TableRow key={match.id || idx}>
                                <TableCell className="font-medium">{match.invoiceNumber || '—'}</TableCell>
                                <TableCell>{match.customerName || '—'}</TableCell>
                                <TableCell>{formatCurrency(match.amount)}</TableCell>
                                <TableCell>{formatDate(match.date)}</TableCell>
                                <TableCell>
                                    <Badge variant={match.confidence > 0.8 ? 'success' : 'warning'}>
                                        {Math.round(match.confidence * 100)}%
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-green-600"
                                            onClick={() => handleConfirm(match)}
                                        >
                                            <CheckCircle className="mr-1 h-3 w-3" /> Confirm
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600"
                                            onClick={() => handleReject(match.id)}
                                        >
                                            <XCircle className="mr-1 h-3 w-3" /> Reject
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}