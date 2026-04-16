'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DollarSign, CreditCard } from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';
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

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface InvoiceDetailsProps {
    invoice: any;
    paidAmount: number;
    balanceDue: number;
}

export function InvoiceDetails({
    invoice,
    paidAmount,
    balanceDue,
}: InvoiceDetailsProps) {
    const [razorpayLoading, setRazorpayLoading] = useState(false);

    const handleRazorpayPayment = async () => {
        if (!invoice.customer?.email) {
            toast.error('Customer email is required for Razorpay payment');
            return;
        }

        setRazorpayLoading(true);
        try {
            const orderRes = await fetch('/api/payments/razorpay/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: invoice.id,
                    amount: balanceDue,
                    currency: invoice.currency,
                }),
            });

            if (!orderRes.ok) throw new Error('Failed to create order');
            const orderData = await orderRes.json();

            const options = {
                key: orderData.key,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'InvoiceFlow Pro',
                description: `Payment for ${invoice.invoiceNumber}`,
                order_id: orderData.orderId,
                handler: async (response: any) => {
                    const verifyRes = await fetch('/api/payments/razorpay/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            invoiceId: invoice.id,
                            amount: balanceDue,
                        }),
                    });

                    if (verifyRes.ok) {
                        toast.success('Payment successful!');
                        window.location.reload();
                    } else {
                        toast.error('Payment verification failed');
                    }
                },
                prefill: {
                    name: invoice.customer?.name,
                    email: invoice.customer?.email,
                    contact: invoice.customer?.phone,
                },
                theme: {
                    color: '#3B82F6',
                },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (error) {
            toast.error('Payment initiation failed');
        } finally {
            setRazorpayLoading(false);
        }
    };

    return (
        <>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Badge
                                variant={statusVariants[invoice.status] as any}
                                className="text-lg px-4 py-1"
                            >
                                {invoice.status}
                            </Badge>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(invoice.total, invoice.currency)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'
                                    }`}
                            >
                                {formatCurrency(balanceDue, invoice.currency)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>From</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            <p className="font-medium">{invoice.organization.name}</p>
                            <p className="text-sm text-muted-foreground">
                                {invoice.organization.email}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {invoice.organization.address}
                            </p>
                            {invoice.organization.taxId && (
                                <p className="text-sm text-muted-foreground">
                                    Tax ID: {invoice.organization.taxId}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Bill To</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            <p className="font-medium">{invoice.customer?.name || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">
                                {invoice.customer?.email}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {invoice.customer?.phone}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Tax</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoice.items.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(item.unitPrice, invoice.currency)}
                                        </TableCell>
                                        <TableCell className="text-right">{item.taxRate}%</TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(item.amount, invoice.currency)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="flex justify-end mt-4">
                            <div className="w-64 space-y-2">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax:</span>
                                    <span>{formatCurrency(invoice.taxTotal, invoice.currency)}</span>
                                </div>
                                {invoice.discountTotal > 0 && (
                                    <div className="flex justify-between">
                                        <span>Discount:</span>
                                        <span>
                                            {formatCurrency(invoice.discountTotal, invoice.currency)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-lg border-t pt-2">
                                    <span>Total:</span>
                                    <span>{formatCurrency(invoice.total, invoice.currency)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Paid:</span>
                                    <span>{formatCurrency(paidAmount, invoice.currency)}</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                    <span>Balance Due:</span>
                                    <span
                                        className={
                                            balanceDue > 0 ? 'text-red-600' : 'text-green-600'
                                        }
                                    >
                                        {formatCurrency(balanceDue, invoice.currency)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {invoice.notes && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap">{invoice.notes}</p>
                        </CardContent>
                    </Card>
                )}
                {invoice.terms && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Terms</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap">{invoice.terms}</p>
                        </CardContent>
                    </Card>
                )}

                {invoice.payments && invoice.payments.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Reference</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoice.payments.map((payment: any) => (
                                        <TableRow key={payment.id}>
                                            <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                                            <TableCell>
                                                {formatCurrency(payment.amount, invoice.currency)}
                                            </TableCell>
                                            <TableCell>{payment.paymentMethod || '—'}</TableCell>
                                            <TableCell>{payment.reference || '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                <div className="flex justify-end gap-2">
                    <Button asChild>
                        <Link href={`/dashboard/payments/new?invoiceId=${invoice.id}`}>
                            <DollarSign className="mr-2 h-4 w-4" /> Record Payment
                        </Link>
                    </Button>
                    {balanceDue > 0 && invoice.currency === 'INR' && (
                        <Button onClick={handleRazorpayPayment} disabled={razorpayLoading}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            {razorpayLoading
                                ? 'Processing...'
                                : `Pay with Razorpay (${formatCurrency(
                                    balanceDue,
                                    invoice.currency
                                )})`}
                        </Button>
                    )}
                </div>
            </div>
        </>
    );
}