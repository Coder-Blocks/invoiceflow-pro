'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export function AuditLogsTable({ logs }: { logs: any[] }) {
    const getActionBadge = (action: string) => {
        const variants: Record<string, string> = {
            CREATE: 'success',
            UPDATE: 'default',
            DELETE: 'destructive',
            INVITE: 'warning',
            ACCEPT_INVITATION: 'success',
            CONFIRM_MATCH: 'success',
            REJECT_MATCH: 'destructive',
            SUBSCRIPTION_CREATED: 'success',
        };
        return variants[action] || 'secondary';
    };

    const formatDetails = (details: any) => {
        if (!details) return '—';
        if (typeof details === 'string') return details;
        if (details.changes) {
            return Object.entries(details.changes)
                .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                .join(', ');
        }
        return JSON.stringify(details);
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {logs.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                            No audit logs yet.
                        </TableCell>
                    </TableRow>
                ) : (
                    logs.map((log) => (
                        <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                            <TableCell>{log.user?.name || log.user?.email || 'System'}</TableCell>
                            <TableCell>
                                <Badge variant={getActionBadge(log.action) as any}>{log.action}</Badge>
                            </TableCell>
                            <TableCell>{log.entity}</TableCell>
                            <TableCell className="max-w-xs truncate">
                                {formatDetails(log.details)}
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}