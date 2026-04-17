'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

export type AuditLog = {
    id: string;
    createdAt: string | Date;
    user?: {
        name?: string | null;
        email?: string | null;
    } | null;
    action?: string | null;
    entity?: string | null;
    details?: unknown;
};

function formatDetails(details: unknown): string {
    if (!details) return '—';
    if (typeof details === 'string') return details;

    try {
        return JSON.stringify(details);
    } catch {
        return '—';
    }
}

export function AuditLogsTable({ logs }: { logs: AuditLog[] }) {
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
                        <TableCell colSpan={5} className="py-8 text-center">
                            No audit logs yet.
                        </TableCell>
                    </TableRow>
                ) : (
                    logs.map((log) => (
                        <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap">
                                {formatDate(log.createdAt)}
                            </TableCell>
                            <TableCell>{log.user?.name || log.user?.email || 'System'}</TableCell>
                            <TableCell>{log.action || '—'}</TableCell>
                            <TableCell>{log.entity || '—'}</TableCell>
                            <TableCell className="max-w-[420px] truncate" title={formatDetails(log.details)}>
                                {formatDetails(log.details)}
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}