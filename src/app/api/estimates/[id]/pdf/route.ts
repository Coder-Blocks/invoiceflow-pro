import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateEstimatePDF } from '@/lib/pdf-generator';

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await context.params;

    const estimate = await prisma.estimate.findUnique({
        where: {
            id,
            organizationId: session.user.activeOrgId,
        },
        include: {
            customer: true,
            items: true,
            organization: true,
        },
    });

    if (!estimate) {
        return new NextResponse('Estimate not found', { status: 404 });
    }

    const pdfBuffer = await generateEstimatePDF(estimate);

    return new NextResponse(pdfBuffer, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="estimate-${estimate.estimateNumber}.pdf"`,
        },
    });
}