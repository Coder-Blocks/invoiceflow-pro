import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const matchSchema = z.object({
    bankTransactionId: z.string(),
    paymentId: z.string().optional().nullable(),
    invoiceId: z.string().optional().nullable(),
    confidence: z.number().default(1.0),
});

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const validated = matchSchema.parse(body);

        const match = await prisma.reconciliationMatch.create({
            data: {
                organizationId: session.user.activeOrgId,
                bankTransactionId: validated.bankTransactionId,
                paymentId: validated.paymentId,
                invoiceId: validated.invoiceId,
                confidence: validated.confidence,
                status: 'PENDING',
            },
        });

        return NextResponse.json(match);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(error.errors[0].message, { status: 400 });
        }
        return new NextResponse('Internal server error', { status: 500 });
    }
}