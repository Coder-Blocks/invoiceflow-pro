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
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export function RemindersList() {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReminders();
    }, []);

    const fetchReminders = async () => {
        const res = await fetch('/api/reminders');
        const data = await res.json();
        setReminders(data);
        setLoading(false);
    };

    const toggleActive = async (id: string, current: boolean) => {
        const res = await fetch(`/api/reminders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !current }),
        });
        if (res.ok) {
            toast.success(`Reminder ${!current ? 'activated' : 'deactivated'}`);
            fetchReminders();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success('Reminder deleted');
            fetchReminders();
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reminders.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                                No reminders configured.
                            </TableCell>
                        </TableRow>
                    ) : (
                        reminders.map((reminder: any) => (
                            <TableRow key={reminder.id}>
                                <TableCell className="font-medium">{reminder.name}</TableCell>
                                <TableCell>{reminder.subject}</TableCell>
                                <TableCell>
                                    {reminder.triggerDays === 0
                                        ? 'On due date'
                                        : reminder.triggerDays < 0
                                            ? `${Math.abs(reminder.triggerDays)} days before due`
                                            : `${reminder.triggerDays} days after due`}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={reminder.isActive}
                                            onCheckedChange={() => toggleActive(reminder.id, reminder.isActive)}
                                        />
                                        <Badge variant={reminder.isActive ? 'success' : 'secondary'}>
                                            {reminder.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/dashboard/settings/reminders/${reminder.id}/edit`}>
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(reminder.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}