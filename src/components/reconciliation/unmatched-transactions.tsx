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
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { MatchSuggestions } from './match-suggestions';

export function UnmatchedTransactions() {
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
            matched: 'false',
        });
        const res = await fetch(`/api/bank-transactions?${params}`);
        const data = await res.json();
        setTransactions(data.transactions);
        setPagination(data.pagination);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this transaction?')) return;
        const res = await fetch(`/api/bank-transactions/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success('Transaction deleted');
            fetchTransactions();
        }
    };

    if (loading && transactions.length === 0) {
        return <div className="py-10 text-center">Loading transactions...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    No unmatched transactions.
                                </TableCell>
                            </TableRow>
                        ) : (
                            transactions.map((txn: any) => (
                                <TableRow key={txn.id}>
                                    <TableCell>{formatDate(txn.date)}</TableCell>
                                    <TableCell>{txn.description}</TableCell>
                                    <TableCell className={txn.amount < 0 ? 'text-red-600' : ''}>
                                        {formatCurrency(txn.amount)}
                                    </TableCell>
                                    <TableCell>{txn.reference || '—'}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm">
                                                        <Search className="mr-1 h-3 w-3" /> Match
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-2xl">
                                                    <DialogHeader>
                                                        <DialogTitle>Match Transaction</DialogTitle>
                                                    </DialogHeader>
                                                    <MatchSuggestions
                                                        transaction={txn}
                                                        onMatch={() => {
                                                            fetchTransactions();
                                                        }}
                                                    />
                                                </DialogContent>
                                            </Dialog>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(txn.id)}>
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
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