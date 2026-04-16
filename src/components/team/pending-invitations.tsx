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
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function PendingInvitations() {
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvitations();
    }, []);

    const fetchInvitations = async () => {
        const res = await fetch('/api/invitations');
        const data = await res.json();
        setInvitations(data);
        setLoading(false);
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Cancel this invitation?')) return;
        const res = await fetch(`/api/invitations/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success('Invitation cancelled');
            fetchInvitations();
        } else {
            toast.error('Failed to cancel invitation');
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
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invitations.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                                No pending invitations.
                            </TableCell>
                        </TableRow>
                    ) : (
                        invitations.map((inv: any) => (
                            <TableRow key={inv.id}>
                                <TableCell>{inv.email}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{inv.role}</Badge>
                                </TableCell>
                                <TableCell>{formatDate(inv.createdAt)}</TableCell>
                                <TableCell>{formatDate(inv.expires)}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => handleCancel(inv.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}