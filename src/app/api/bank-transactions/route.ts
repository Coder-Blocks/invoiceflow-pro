import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import Papa from 'papaparse';

const bankTransactionSchema = z.object({
    date: z.string().datetime(),
    description: z.string(),
    amount: z.number(),
    reference: z.string().optional(),
});

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const matched = searchParams.get('matched');

    const where: any = {
        organizationId: session.user.activeOrgId,
    };

    if (matched === 'true') {
        where.reconciliationMatches = { some: {} };
    } else if (matched === 'false') {
        where.reconciliationMatches = { none: {} };
    }

    const [transactions, total] = await Promise.all([
        prisma.bankTransaction.findMany({
            where,
            include: {
                reconciliationMatches: {
                    include: {
                        payment: { include: { invoice: true, customer: true } },
                        invoice: { include: { customer: true } },
                    },
                },
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit,
        }),
        prisma.bankTransaction.count({ where }),
    ]);

    return NextResponse.json({
        transactions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return new NextResponse('No file uploaded', { status: 400 });
        }

        const text = await file.text();
        const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });

        const transactions = [];
        for (const row of data as any[]) {
            const dateStr = row.Date || row.date;
            const description = row.Description || row.description;
            const amountStr = row.Amount || row.amount;
            const reference = row.Reference || row.reference;

            if (!dateStr || !description || !amountStr) continue;

            const date = new Date(dateStr);
            const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
            if (isNaN(date.getTime()) || isNaN(amount)) continue;

            transactions.push({
                organizationId: session.user.activeOrgId,
                date,
                description,
                amount,
                reference: reference || null,
            });
        }

        const created = await prisma.bankTransaction.createMany({
            data: transactions,
            skipDuplicates: true,
        });

        await triggerAutoMatching(session.user.activeOrgId);

        return NextResponse.json({ imported: created.count });
    } catch (error) {
        console.error('CSV import error:', error);
        return new NextResponse('Failed to process CSV', { status: 500 });
    }
}

async function triggerAutoMatching(orgId: string) {
    const unmatchedTxns = await prisma.bankTransaction.findMany({
        where: {
            organizationId: orgId,
            reconciliationMatches: { none: {} },
        },
    });

    const payments = await prisma.payment.findMany({
        where: {
            organizationId: orgId,
            reconciliationMatches: { none: {} },
        },
        include: { invoice: true },
    });

    const invoices = await prisma.invoice.findMany({
        where: {
            organizationId: orgId,
            status: { in: ['SENT', 'VIEWED', 'PARTIAL_PAID', 'PAID', 'OVERDUE'] },
        },
        include: { payments: true },
    });

    for (const txn of unmatchedTxns) {
        const matches: any[] = [];

        for (const payment of payments) {
            if (Math.abs(payment.amount - Math.abs(txn.amount)) < 0.01) {
                const daysDiff = Math.abs(
                    (new Date(txn.date).getTime() - new Date(payment.paymentDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                if (daysDiff <= 7) {
                    matches.push({
                        type: 'payment',
                        id: payment.id,
                        confidence: 1.0 - daysDiff * 0.1,
                        invoiceNumber: payment.invoice?.invoiceNumber,
                    });
                }
            }
        }

        if (matches.length === 0) {
            for (const invoice of invoices) {
                const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
                const balanceDue = invoice.total - paidAmount;
                if (Math.abs(balanceDue - Math.abs(txn.amount)) < 0.01) {
                    matches.push({
                        type: 'invoice',
                        id: invoice.id,
                        confidence: 0.9,
                        invoiceNumber: invoice.invoiceNumber,
                    });
                }
            }
        }

        for (const match of matches) {
            await prisma.reconciliationMatch.create({
                data: {
                    organizationId: orgId,
                    bankTransactionId: txn.id,
                    paymentId: match.type === 'payment' ? match.id : null,
                    invoiceId: match.type === 'invoice' ? match.id : null,
                    confidence: match.confidence,
                    status: 'PENDING',
                },
            });
        }
    }
}