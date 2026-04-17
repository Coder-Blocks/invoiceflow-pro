import {
    Customer,
    Estimate,
    EstimateItem,
    Invoice,
    InvoiceItem,
    Organization,
} from '@prisma/client';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function formatMoney(value: number, currency = 'INR') {
    try {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency,
            maximumFractionDigits: 2,
        }).format(value);
    } catch {
        return `${currency} ${value.toFixed(2)}`;
    }
}

function formatDateValue(value: Date | string | null | undefined) {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString('en-IN');
}

async function createBasePdf(title: string) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;

    const drawText = (
        text: string,
        x: number,
        size = 12,
        bold = false,
        color = rgb(0, 0, 0)
    ) => {
        page.drawText(text, {
            x,
            y,
            size,
            font: bold ? boldFont : font,
            color,
        });
        y -= size + 8;
    };

    drawText(title, 50, 22, true);
    y -= 8;

    return { pdfDoc, page, drawText, getY: () => y, setY: (value: number) => (y = value) };
}

export async function generateInvoicePDF(
    invoice: Invoice & {
        customer: Customer | null;
        items: InvoiceItem[];
        organization: Organization;
    }
): Promise<Uint8Array> {
    const { pdfDoc, page, drawText, getY, setY } = await createBasePdf(
        `Invoice ${invoice.invoiceNumber}`
    );

    drawText(`From: ${invoice.organization.name}`, 50, 12, true);
    drawText(`Bill To: ${invoice.customer?.name || '-'}`, 50);
    drawText(`Issue Date: ${formatDateValue(invoice.issueDate)}`, 50);
    drawText(`Due Date: ${formatDateValue(invoice.dueDate)}`, 50);
    drawText(`Status: ${invoice.status}`, 50);

    setY(getY() - 8);
    page.drawText('Items', { x: 50, y: getY(), size: 14 });
    setY(getY() - 24);

    invoice.items.forEach((item) => {
        page.drawText(
            `${item.description} | Qty: ${item.quantity} | Price: ${formatMoney(
                item.unitPrice,
                invoice.currency
            )} | Tax: ${item.taxRate}% | Amount: ${formatMoney(item.amount, invoice.currency)}`,
            {
                x: 50,
                y: getY(),
                size: 10,
            }
        );
        setY(getY() - 18);
    });

    setY(getY() - 10);
    drawText(`Subtotal: ${formatMoney(invoice.subtotal, invoice.currency)}`, 50, 12, true);
    drawText(`Tax: ${formatMoney(invoice.taxTotal, invoice.currency)}`, 50);
    drawText(`Discount: ${formatMoney(invoice.discountTotal, invoice.currency)}`, 50);
    drawText(`Total: ${formatMoney(invoice.total, invoice.currency)}`, 50, 14, true);

    if (invoice.notes) {
        setY(getY() - 10);
        drawText(`Notes: ${invoice.notes}`, 50);
    }

    if (invoice.terms) {
        drawText(`Terms: ${invoice.terms}`, 50);
    }

    return await pdfDoc.save();
}

export async function generateEstimatePDF(
    estimate: Estimate & {
        customer: Customer | null;
        items: EstimateItem[];
        organization: Organization;
    }
): Promise<Uint8Array> {
    const { pdfDoc, page, drawText, getY, setY } = await createBasePdf(
        `Estimate ${estimate.estimateNumber}`
    );

    drawText(`From: ${estimate.organization.name}`, 50, 12, true);
    drawText(`Bill To: ${estimate.customer?.name || '-'}`, 50);
    drawText(`Issue Date: ${formatDateValue(estimate.issueDate)}`, 50);
    drawText(`Expiry Date: ${formatDateValue(estimate.expiryDate)}`, 50);
    drawText(`Status: ${estimate.status}`, 50);

    setY(getY() - 8);
    page.drawText('Items', { x: 50, y: getY(), size: 14 });
    setY(getY() - 24);

    estimate.items.forEach((item) => {
        page.drawText(
            `${item.description} | Qty: ${item.quantity} | Price: ${formatMoney(
                item.unitPrice,
                estimate.currency
            )} | Tax: ${item.taxRate}% | Amount: ${formatMoney(item.amount, estimate.currency)}`,
            {
                x: 50,
                y: getY(),
                size: 10,
            }
        );
        setY(getY() - 18);
    });

    setY(getY() - 10);
    drawText(`Subtotal: ${formatMoney(estimate.subtotal, estimate.currency)}`, 50, 12, true);
    drawText(`Tax: ${formatMoney(estimate.taxTotal, estimate.currency)}`, 50);
    drawText(`Discount: ${formatMoney(estimate.discountTotal, estimate.currency)}`, 50);
    drawText(`Total: ${formatMoney(estimate.total, estimate.currency)}`, 50, 14, true);

    if (estimate.notes) {
        setY(getY() - 10);
        drawText(`Notes: ${estimate.notes}`, 50);
    }

    if (estimate.terms) {
        drawText(`Terms: ${estimate.terms}`, 50);
    }

    return await pdfDoc.save();
}