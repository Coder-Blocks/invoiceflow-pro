import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const orgId = session.user.activeOrgId;
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month';
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');

    // Default date range: last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    const fromDate = dateFrom ? new Date(dateFrom) : sixMonthsAgo;
    const toDate = dateTo ? new Date(dateTo) : now;

    // 1. Revenue Summary
    const paidInvoices = await prisma.invoice.findMany({
        where: {
            organizationId: orgId,
            status: 'PAID',
            paidAt: { gte: fromDate, lte: toDate },
        },
        select: { total: true, paidAt: true },
    });

    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);

    // 2. Outstanding Invoices
    const outstandingInvoices = await prisma.invoice.findMany({
        where: {
            organizationId: orgId,
            status: { in: ['SENT', 'VIEWED', 'PARTIAL_PAID', 'OVERDUE'] },
        },
        include: { payments: true },
    });

    const totalOutstanding = outstandingInvoices.reduce((sum, inv) => {
        const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
        return sum + (inv.total - paid);
    }, 0);

    const overdueAmount = outstandingInvoices
        .filter(inv => new Date(inv.dueDate) < now && inv.status !== 'PAID')
        .reduce((sum, inv) => {
            const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
            return sum + (inv.total - paid);
        }, 0);

    // 3. Paid This Month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidThisMonth = await prisma.invoice.aggregate({
        where: {
            organizationId: orgId,
            status: 'PAID',
            paidAt: { gte: startOfMonth },
        },
        _sum: { total: true },
    });

    // 4. Customer Growth (by creation month)
    const customers = await prisma.customer.findMany({
        where: { organizationId: orgId, archived: false },
        select: { createdAt: true },
    });
    const customerGrowth = aggregateByMonth(customers.map(c => c.createdAt), fromDate, toDate);

    // 5. Invoice Trends (monthly invoice totals)
    const invoices = await prisma.invoice.findMany({
        where: { organizationId: orgId, createdAt: { gte: fromDate, lte: toDate } },
        select: { total: true, createdAt: true, status: true },
    });
    const invoiceTrends = aggregateByMonth(invoices.map(i => ({ date: i.createdAt, amount: i.total })), fromDate, toDate);

    // 6. Payment Trends
    const payments = await prisma.payment.findMany({
        where: { organizationId: orgId, paymentDate: { gte: fromDate, lte: toDate } },
        select: { amount: true, paymentDate: true },
    });
    const paymentTrends = aggregateByMonth(payments.map(p => ({ date: p.paymentDate, amount: p.amount })), fromDate, toDate);

    // 7. Top Customers (including IDs)
    const topCustomers = await prisma.customer.findMany({
        where: { organizationId: orgId, archived: false },
        select: {
            id: true,
            name: true,
            invoices: {
                where: { status: 'PAID' },
                select: { total: true },
            },
        },
        take: 10,
    });
    const topCustomersData = topCustomers.map(c => ({
        id: c.id,
        name: c.name,
        revenue: c.invoices.reduce((sum, i) => sum + i.total, 0),
    })).sort((a, b) => b.revenue - a.revenue);

    // 8. Aging Summary
    const aging = await calculateAging(orgId);

    return NextResponse.json({
        totalRevenue,
        totalOutstanding,
        overdueAmount,
        paidThisMonth: paidThisMonth._sum.total || 0,
        customerGrowth,
        invoiceTrends,
        paymentTrends,
        topCustomers: topCustomersData,
        aging,
    });
}

function aggregateByMonth(data: { date: Date; amount?: number }[], from: Date, to: Date) {
    const months: Record<string, number> = {};
    const current = new Date(from);
    while (current <= to) {
        const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        months[key] = 0;
        current.setMonth(current.getMonth() + 1);
    }
    data.forEach(item => {
        const key = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
        if (months.hasOwnProperty(key)) {
            months[key] += item.amount || 1;
        }
    });
    return Object.entries(months).map(([month, value]) => ({ month, value }));
}

async function calculateAging(orgId: string) {
    const invoices = await prisma.invoice.findMany({
        where: {
            organizationId: orgId,
            status: { in: ['SENT', 'VIEWED', 'PARTIAL_PAID', 'OVERDUE'] },
        },
        include: { payments: true },
    });

    const now = new Date();
    const aging = {
        current: 0,
        days1_30: 0,
        days31_60: 0,
        days61_90: 0,
        days90plus: 0,
    };

    invoices.forEach(inv => {
        const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
        const balance = inv.total - paid;
        if (balance <= 0) return;

        const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysOverdue < 0) {
            aging.current += balance;
        } else if (daysOverdue <= 30) {
            aging.days1_30 += balance;
        } else if (daysOverdue <= 60) {
            aging.days31_60 += balance;
        } else if (daysOverdue <= 90) {
            aging.days61_90 += balance;
        } else {
            aging.days90plus += balance;
        }
    });

    return aging;
}