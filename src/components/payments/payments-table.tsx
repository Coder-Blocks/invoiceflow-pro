'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function PaymentsTable() {
    const searchParams = useSearchParams();
    const [payments, setPayments] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });
    const [loading, setLoading] = useState(true);

    const fetchPayments = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', pagination.page.toString());
        params.set('limit', pagination.limit.toString());
        const invoiceId = searchParams.get('invoiceId');
        if (invoiceId) params.set('invoiceId', invoiceId);
        const customerId = searchParams.get('customerId');
        if (customerId) params.set('customerId', customerId);

        const res = await fetch(`/api/payments?${params}`);
        const data = await res.json();
        setPayments(data.payments);
        setPagination(data.pagination);
        setLoading(false);
    };

    useEffect(() => {
        fetchPayments();
    }, [pagination.page, searchParams]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this payment?')) return;
        const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success('Payment deleted');
            fetchPayments();
        } else {
            toast.error('Failed to delete payment');
        }
    };

    if (loading && payments.length === 0) {
        return <div className="py-10 text-center">Loading payments...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Invoice</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10">
                                    No payments recorded.
                                </TableCell>
                            </TableRow>
                        ) : (
                            payments.map((payment: any) => (
                                <TableRow key={payment.id}>
                                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                                    <TableCell>{payment.invoice?.invoiceNumber || '—'}</TableCell>
                                    <TableCell>{payment.customer?.name || '—'}</TableCell>
                                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                    <TableCell>{payment.paymentMethod || '—'}</TableCell>
                                    <TableCell>{payment.reference || '—'}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(payment.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
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
                                onClick={e => {
                                    e.preventDefault();
                                    setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }));
                                }}
                            />
                        </PaginationItem>
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                            <PaginationItem key={page}>
                                <PaginationLink
                                    href="#"
                                    isActive={page === pagination.page}
                                    onClick={e => {
                                        e.preventDefault();
                                        setPagination(prev => ({ ...prev, page }));
                                    }}
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        ))}
                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                onClick={e => {
                                    e.preventDefault();
                                    setPagination(prev => ({
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