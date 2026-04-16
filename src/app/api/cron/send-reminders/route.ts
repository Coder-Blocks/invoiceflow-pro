import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { ReminderEmail } from '@/emails/reminder-email';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: Request) {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all active reminders
    const reminders = await prisma.reminder.findMany({
        where: { isActive: true },
        include: { organization: true },
    });

    const results = [];

    for (const reminder of reminders) {
        // Calculate target date based on triggerDays
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + reminder.triggerDays);

        // Find invoices due on the target date that haven't been paid
        const invoices = await prisma.invoice.findMany({
            where: {
                organizationId: reminder.organizationId,
                dueDate: {
                    gte: new Date(targetDate.setHours(0, 0, 0, 0)),
                    lt: new Date(targetDate.setHours(23, 59, 59, 999)),
                },
                status: { in: ['SENT', 'VIEWED', 'PARTIAL_PAID', 'OVERDUE'] },
            },
            include: {
                customer: true,
                organization: true,
            },
        });

        for (const invoice of invoices) {
            // Check if reminder already sent today for this invoice+reminder
            const existingLog = await prisma.reminderLog.findFirst({
                where: {
                    reminderId: reminder.id,
                    invoiceId: invoice.id,
                    sentAt: { gte: today },
                },
            });

            if (existingLog) continue;

            try {
                // Send email
                const emailContent = reminder.body
                    .replace('{{customerName}}', invoice.customer?.name || 'Customer')
                    .replace('{{invoiceNumber}}', invoice.invoiceNumber)
                    .replace('{{dueDate}}', invoice.dueDate.toLocaleDateString())
                    .replace('{{total}}', invoice.total.toString())
                    .replace('{{organizationName}}', invoice.organization.name);

                await resend.emails.send({
                    from: process.env.EMAIL_FROM!,
                    to: invoice.customer?.email!,
                    subject: reminder.subject,
                    react: ReminderEmail({
                        customerName: invoice.customer?.name || 'Customer',
                        invoiceNumber: invoice.invoiceNumber,
                        dueDate: invoice.dueDate,
                        total: invoice.total,
                        organizationName: invoice.organization.name,
                        body: emailContent,
                    }),
                });

                // Log success
                await prisma.reminderLog.create({
                    data: {
                        reminderId: reminder.id,
                        invoiceId: invoice.id,
                        status: 'sent',
                    },
                });

                results.push({ invoiceId: invoice.id, status: 'sent' });
            } catch (error) {
                console.error(`Failed to send reminder for invoice ${invoice.id}:`, error);
                await prisma.reminderLog.create({
                    data: {
                        reminderId: reminder.id,
                        invoiceId: invoice.id,
                        status: 'failed',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    },
                });
                results.push({ invoiceId: invoice.id, status: 'failed' });
            }
        }
    }

    return NextResponse.json({ processed: results.length, results });
}