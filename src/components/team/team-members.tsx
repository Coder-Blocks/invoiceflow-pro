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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { getInitials } from '@/lib/utils';
import { MoreHorizontal, Shield, UserCog, User } from 'lucide-react';
import { toast } from 'sonner';

const roleIcons: Record<string, any> = {
    OWNER: Shield,
    ADMIN: UserCog,
    ACCOUNTANT: UserCog,
    STAFF: User,
};

const roleColors: Record<string, string> = {
    OWNER: 'bg-purple-500',
    ADMIN: 'bg-blue-500',
    ACCOUNTANT: 'bg-green-500',
    STAFF: 'bg-gray-500',
};

interface TeamMembersProps {
    canManage: boolean;
    currentUserId: string;
}

export function TeamMembers({ canManage, currentUserId }: TeamMembersProps) {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        const res = await fetch('/api/team');
        const data = await res.json();
        setMembers(data);
        setLoading(false);
    };

    const handleRoleChange = async (memberId: string, newRole: string) => {
        const res = await fetch(`/api/team/${memberId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
        });
        if (res.ok) {
            toast.success('Role updated');
            fetchMembers();
        } else {
            toast.error('Failed to update role');
        }
    };

    const handleRemove = async (memberId: string) => {
        if (!confirm('Remove this member from the team?')) return;
        const res = await fetch(`/api/team/${memberId}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success('Member removed');
            fetchMembers();
        } else {
            toast.error('Failed to remove member');
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
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        {canManage && <TableHead className="w-[100px]">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {members.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={canManage ? 4 : 3} className="text-center py-8">
                                No team members found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        members.map((member: any) => {
                            const RoleIcon = roleIcons[member.role] || User;
                            const isCurrentUser = member.userId === currentUserId;
                            return (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={member.user.image} />
                                                <AvatarFallback>{getInitials(member.user.name || member.user.email)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{member.user.name || '—'}</p>
                                                {isCurrentUser && (
                                                    <span className="text-xs text-muted-foreground">You</span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{member.user.email}</TableCell>
                                    <TableCell>
                                        {canManage && member.role !== 'OWNER' ? (
                                            <Select
                                                defaultValue={member.role}
                                                onValueChange={(value) => handleRoleChange(member.id, value)}
                                            >
                                                <SelectTrigger className="w-[130px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                                    <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                                                    <SelectItem value="STAFF">Staff</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Badge className={`${roleColors[member.role]} text-white gap-1`}>
                                                <RoleIcon className="h-3 w-3" />
                                                {member.role}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    {canManage && (
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" disabled={member.role === 'OWNER' && !isCurrentUser}>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="text-red-600"
                                                        onClick={() => handleRemove(member.id)}
                                                        disabled={member.role === 'OWNER'}
                                                    >
                                                        Remove
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}