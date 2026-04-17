import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { AuditLogsTable } from '@/components/audit/audit-logs-table';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export default async function AuditLogsPage() {
    const session = await auth();

    if (!session?.user?.activeOrgId || !session.user?.id) {
        return notFound();
    }

    const membership = await prisma.organizationMember.findFirst({
        where: {
            organizationId: session.user.activeOrgId,
            userId: session.user.id,
        },
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        redirect('/dashboard');
    }

    const rawLogs = await prisma.auditLog.findMany({
        where: {
            organizationId: session.user.activeOrgId,
        },
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 100,
    });

    const logs = rawLogs.map((log) => ({
        id: log.id,
        createdAt: log.createdAt,
        user: log.user
            ? {
                name: log.user.name ?? null,
                email: log.user.email ?? null,
            }
            : null,
        action: log.action ?? null,
        entity: log.entity ?? null,
        details: log.details ?? null,
    }));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                <p className="text-muted-foreground">
                    Track all important actions in your organization.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <AuditLogsTable logs={logs} />
                </CardContent>
            </Card>
        </div>
    );
}