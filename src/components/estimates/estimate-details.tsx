'use client';

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
import { formatCurrency, formatDate } from '@/lib/utils';

type BadgeVariant = "secondary" | "default" | "success" | "destructive" | "outline" | "warning";
const statusVariants: Record<string, BadgeVariant> = {
    DRAFT: 'secondary',
    SENT: 'default',
    VIEWED: 'default',
    ACCEPTED: 'success',
    REJECTED: 'destructive',
    EXPIRED: 'outline',
    CONVERTED: 'success',
};

export function EstimateDetails({ estimate }: any) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant={statusVariants[estimate.status]} className="text-lg px-4 py-1">
                            {estimate.status}
                        </Badge>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(estimate.total)}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>From</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <p className="font-medium">{estimate.organization.name}</p>
                        <p className="text-sm text-muted-foreground">{estimate.organization.email}</p>
                        <p className="text-sm text-muted-foreground">{estimate.organization.address}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Bill To</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <p className="font-medium">{estimate.customer?.name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">{estimate.customer?.email}</p>
                        <p className="text-sm text-muted-foreground">{estimate.customer?.phone}</p>
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
                            {estimate.items.map((item: any) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                    <TableCell className="text-right">{item.taxRate}%</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="flex justify-end mt-4">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(estimate.subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax:</span>
                                <span>{formatCurrency(estimate.taxTotal)}</span>
                            </div>
                            {estimate.discountTotal > 0 && (
                                <div className="flex justify-between">
                                    <span>Discount:</span>
                                    <span>{formatCurrency(estimate.discountTotal)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg border-t pt-2">
                                <span>Total:</span>
                                <span>{formatCurrency(estimate.total)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {estimate.notes && (
                <Card>
                    <CardHeader>
                        <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="whitespace-pre-wrap">{estimate.notes}</p>
                    </CardContent>
                </Card>
            )}
            {estimate.terms && (
                <Card>
                    <CardHeader>
                        <CardTitle>Terms</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="whitespace-pre-wrap">{estimate.terms}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}