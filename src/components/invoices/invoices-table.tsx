'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, MoreHorizontal, Eye, Download, Send, Copy } from 'lucide-react';
import Link from 'next/link';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from 'sonner';

const statusVariants: Record<string, string> = {
    DRAFT: 'secondary',
    SENT: 'default',
    VIEWED: 'default',
    PARTIAL_PAID: 'warning',
    PAID: 'success',
    OVERDUE: 'destructive',
    CANCELLED: 'outline',
};

export function InvoicesTable() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [invoices, setInvoices] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [status, setStatus] = useState(searchParams.get('status') || 'ALL');
    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        fetchInvoices();
    }, [debouncedSearch, status, pagination.page]);

    const fetchInvoices = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (status && status !== 'ALL') params.set('status', status);
        params.set('page', pagination.page.toString());
        params.set('limit', pagination.limit.toString());

        const res = await fetch(`/api/invoices?${params}`);
        const data = await res.json();
        setInvoices(data.invoices);
        setPagination(data.pagination);
        setLoading(false);
    };

    const handleStatusChange = (value: string) => {
        setStatus(value || 'ALL');
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleMarkAsSent = async (id: string) => {
        const res = await fetch(`/api/invoices/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'SENT', sentAt: new Date() }),
        });
        if (res.ok) {
            toast.success('Invoice marked as sent');
            fetchInvoices();
        }
    };

    const handleDownloadPDF = (id: string) => {
        window.open(`/api/invoices/${id}/pdf`, '_blank');
    };

    if (loading && invoices.length === 0) {
        return <div className="py-10 text-center">Loading invoices...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search invoices..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All statuses</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="SENT">Sent</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="OVERDUE">Overdue</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Issue Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10">
                                    No invoices found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            invoices.map((invoice: any) => (
                                <TableRow key={invoice.id}>
                                    <TableCell>
                                        <Link
                                            href={`/dashboard/invoices/${invoice.id}`}
                                            className="font-medium hover:underline"
                                        >
                                            {invoice.invoiceNumber}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{invoice.customer?.name || '—'}</TableCell>
                                    <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                                    <TableCell>{formatCurrency(invoice.total)}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariants[invoice.status] as any}>
                                            {invoice.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/invoices/${invoice.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" /> View
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDownloadPDF(invoice.id)}>
                                                    <Download className="mr-2 h-4 w-4" /> Download PDF
                                                </DropdownMenuItem>
                                                {invoice.status === 'DRAFT' && (
                                                    <DropdownMenuItem onClick={() => handleMarkAsSent(invoice.id)}>
                                                        <Send className="mr-2 h-4 w-4" /> Mark as Sent
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem>
                                                    <Copy className="mr-2 h-4 w-4" /> Duplicate
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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