import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueRecurring = await prisma.recurringInvoice.findMany({
        where: {
            status: 'ACTIVE',
            nextRunDate: { lte: today },
            OR: [
                { endDate: null },
                { endDate: { gte: today } },
            ],
        },
        include: {
            customer: true,
            organization: true,
        },
    });

    const results = [];

    for (const recurring of dueRecurring) {
        try {
            const invoiceData = recurring.invoiceData as any;
            const items = invoiceData.items;

            const subtotal = items.reduce((sum: number, item: any) =>
                sum + (item.quantity * item.unitPrice), 0);
            const taxTotal = items.reduce((sum: number, item: any) =>
                sum + (item.quantity * item.unitPrice * item.taxRate / 100), 0);
            const discountTotal = items.reduce((sum: number, item: any) =>
                sum + (item.discount || 0), 0);
            const total = subtotal + taxTotal - discountTotal;

            const org = recurring.organization;
            const prefix = org.invoicePrefix || 'INV';
            const year = new Date().getFullYear();
            const count = await prisma.invoice.count({
                where: { organizationId: recurring.organizationId },
            });
            const invoiceNumber = `${prefix}-${year}${String(count + 1).padStart(4, '0')}`;

            const invoice = await prisma.invoice.create({
                data: {
                    organizationId: recurring.organizationId,
                    customerId: recurring.customerId,
                    invoiceNumber,
                    issueDate: new Date(),
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    currency: invoiceData.currency || 'USD',
                    status: 'DRAFT',
                    subtotal,
                    taxTotal,
                    discountTotal,
                    total,
                    notes: invoiceData.notes,
                    terms: invoiceData.terms,
                    footer: invoiceData.footer,
                    items: {
                        create: items.map((item: any) => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            taxRate: item.taxRate,
                            discount: item.discount,
                            amount: item.quantity * item.unitPrice * (1 + item.taxRate / 100) - (item.discount || 0),
                        })),
                    },
                },
            });

            let nextRunDate = new Date(recurring.nextRunDate);
            switch (recurring.frequency) {
                case 'DAILY':
                    nextRunDate.setDate(nextRunDate.getDate() + recurring.interval);
                    break;
                case 'WEEKLY':
                    nextRunDate.setDate(nextRunDate.getDate() + (7 * recurring.interval));
                    break;
                case 'MONTHLY':
                    nextRunDate.setMonth(nextRunDate.getMonth() + recurring.interval);
                    break;
                case 'YEARLY':
                    nextRunDate.setFullYear(nextRunDate.getFullYear() + recurring.interval);
                    break;
            }

            const shouldComplete = recurring.endDate && nextRunDate > new Date(recurring.endDate);

            await prisma.recurringInvoice.update({
                where: { id: recurring.id },
                data: {
                    lastRunDate: new Date(),
                    nextRunDate: nextRunDate,
                    status: shouldComplete ? 'COMPLETED' : 'ACTIVE',
                },
            });

            results.push({
                recurringId: recurring.id,
                status: 'success',
                invoiceId: invoice.id
            });
        } catch (error) {
            console.error(`Failed to generate invoice for recurring ${recurring.id}:`, error);
            results.push({ recurringId: recurring.id, status: 'failed' });
        }
    }

    return NextResponse.json({ processed: results.length, results });
}