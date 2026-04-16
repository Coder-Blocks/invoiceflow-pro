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
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

export function MatchedTransactions() {
    const [transactions, setTransactions] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransactions();
    }, [pagination.page]);

    const fetchTransactions = async () => {
        setLoading(true);
        const params = new URLSearchParams({
            page: pagination.page.toString(),
            limit: pagination.limit.toString(),
            matched: 'true',
        });
        const res = await fetch(`/api/bank-transactions?${params}`);
        const data = await res.json();
        setTransactions(data.transactions);
        setPagination(data.pagination);
        setLoading(false);
    };

    if (loading && transactions.length === 0) {
        return <div className="py-10 text-center">Loading...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Bank Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Matched Invoice</TableHead>
                            <TableHead>Matched Payment</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    No matched transactions.
                                </TableCell>
                            </TableRow>
                        ) : (
                            transactions.map((txn: any) => {
                                const match = txn.reconciliationMatches?.find((m: any) => m.status === 'CONFIRMED');
                                return (
                                    <TableRow key={txn.id}>
                                        <TableCell>{formatDate(txn.date)}</TableCell>
                                        <TableCell>{txn.description}</TableCell>
                                        <TableCell>{formatCurrency(txn.amount)}</TableCell>
                                        <TableCell>
                                            {match?.invoice?.invoiceNumber || match?.payment?.invoice?.invoiceNumber || '—'}
                                        </TableCell>
                                        <TableCell>
                                            {match?.payment ? formatCurrency(match.payment.amount) : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="success" className="gap-1">
                                                <CheckCircle className="h-3 w-3" /> Matched
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination.totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }));
                                }}
                            />
                        </PaginationItem>
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                            <PaginationItem key={page}>
                                <PaginationLink
                                    href="#"
                                    isActive={page === pagination.page}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setPagination((prev) => ({ ...prev, page }));
                                    }}
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        ))}
                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setPagination((prev) => ({
                                        ...prev,
                                        page: Math.min(pagination.totalPages, prev.page + 1),
                                    }));
                                }}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}