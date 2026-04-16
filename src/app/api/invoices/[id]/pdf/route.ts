import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateInvoicePDF } from '@/lib/pdf-generator';

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user?.activeOrgId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const invoice = await prisma.invoice.findUnique({
        where: {
            id: params.id,
            organizationId: session.user.activeOrgId,
        },
        include: {
            customer: true,
            items: true,
            organization: true,
        },
    });

    if (!invoice) {
        return new NextResponse('Invoice not found', { status: 404 });
    }

    const pdfBuffer = await generateInvoicePDF(invoice);

    return new NextResponse(pdfBuffer, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        },
    });
}