import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Overview } from '@/components/dashboard/overview';
import { RecentInvoices } from '@/components/dashboard/recent-invoices';
import { TopCustomers } from '@/components/dashboard/top-customers';
import { AgingChart } from '@/components/dashboard/aging-chart';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { DollarSign, Users, FileText, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function DashboardPage() {
    const session = await auth();
    if (!session?.user?.activeOrgId) return null;

    // Fetch real-time stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [paidThisMonth, outstandingTotal, customersCount, invoicesCount, overdueCount] = await Promise.all([
        prisma.invoice.aggregate({
            where: {
                organizationId: session.user.activeOrgId,
                status: 'PAID',
                paidAt: { gte: startOfMonth },
            },
            _sum: { total: true },
        }),
        prisma.invoice.aggregate({
            where: {
                organizationId: session.user.activeOrgId,
                status: { in: ['SENT', 'VIEWED', 'PARTIAL_PAID', 'OVERDUE'] },
            },
            _sum: { total: true },
        }),
        prisma.customer.count({
            where: { organizationId: session.user.activeOrgId, archived: false },
        }),
        prisma.invoice.count({
            where: { organizationId: session.user.activeOrgId },
        }),
        prisma.invoice.count({
            where: {
                organizationId: session.user.activeOrgId,
                status: 'OVERDUE',
            },
        }),
    ]);

    // Calculate outstanding amount (total - payments)
    const outstandingInvoices = await prisma.invoice.findMany({
        where: {
            organizationId: session.user.activeOrgId,
            status: { in: ['SENT', 'VIEWED', 'PARTIAL_PAID', 'OVERDUE'] },
        },
        include: { payments: true },
    });
    const outstandingAmount = outstandingInvoices.reduce((sum, inv) => {
        const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
        return sum + (inv.total - paid);
    }, 0);

    // మార్చాల్సిన భాగం మాత్రమే:
    const stats = [
        {
            title: 'Revenue (MTD)',
            value: paidThisMonth._sum.total || 0,
            iconName: 'DollarSign',
            description: 'Paid this month',
            format: 'currency' as const,
        },
        {
            title: 'Outstanding',
            value: outstandingAmount,
            iconName: 'Clock',
            description: `${overdueCount} invoices overdue`,
            format: 'currency' as const,
        },
        {
            title: 'Customers',
            value: customersCount,
            iconName: 'Users',
            description: 'Active customers',
            format: 'number' as const,
        },
        {
            title: 'Invoices',
            value: invoicesCount,
            iconName: 'FileText',
            description: 'Total invoices',
            format: 'number' as const,
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Welcome back! Here's your business at a glance.</p>
            </div>

            <StatsCards stats={stats} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                        <CardDescription>Monthly revenue vs outstanding for the last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <Suspense fallback={<div className="h-[350px] flex items-center justify-center">Loading chart...</div>}>
                            <Overview />
                        </Suspense>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Invoices</CardTitle>
                        <CardDescription>Latest 5 invoices</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RecentInvoices />
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Top Customers</CardTitle>
                        <CardDescription>By revenue (all time)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TopCustomers />
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Aging Summary</CardTitle>
                        <CardDescription>Outstanding by age</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AgingChart />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}