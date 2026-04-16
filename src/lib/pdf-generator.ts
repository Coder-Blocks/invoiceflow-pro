import { Invoice, Customer, Organization, InvoiceItem, Estimate, EstimateItem } from '@prisma/client';
import { formatCurrency, formatDate } from './utils';

export async function generateInvoicePDF(
    invoice: Invoice & { customer: Customer | null; items: InvoiceItem[]; organization: Organization }
): Promise<Buffer> {
    const content = `
INVOICE
=======
Invoice Number: ${invoice.invoiceNumber}
Date: ${formatDate(invoice.issueDate)}
Due Date: ${formatDate(invoice.dueDate)}

From:
${invoice.organization.name}
${invoice.organization.email || ''}
${invoice.organization.address || ''}

To:
${invoice.customer?.name || 'N/A'}
${invoice.customer?.email || ''}

Items:
${invoice.items.map(item => `${item.description} - ${item.quantity} x ${formatCurrency(item.unitPrice, invoice.currency)} = ${formatCurrency(item.amount, invoice.currency)}`).join('\n')}

Subtotal: ${formatCurrency(invoice.subtotal, invoice.currency)}
Tax: ${formatCurrency(invoice.taxTotal, invoice.currency)}
Total: ${formatCurrency(invoice.total, invoice.currency)}
`;
    return Buffer.from(content, 'utf-8');
}

export async function generateEstimatePDF(
    estimate: Estimate & { customer: Customer | null; items: EstimateItem[]; organization: Organization }
): Promise<Buffer> {
    const content = `
ESTIMATE
========
Estimate Number: ${estimate.estimateNumber}
Date: ${formatDate(estimate.issueDate)}
Expiry Date: ${estimate.expiryDate ? formatDate(estimate.expiryDate) : 'N/A'}

From:
${estimate.organization.name}
${estimate.organization.email || ''}
${estimate.organization.address || ''}

To:
${estimate.customer?.name || 'N/A'}
${estimate.customer?.email || ''}

Items:
${estimate.items.map(item => `${item.description} - ${item.quantity} x ${formatCurrency(item.unitPrice, estimate.currency)} = ${formatCurrency(item.amount, estimate.currency)}`).join('\n')}

Subtotal: ${formatCurrency(estimate.subtotal, estimate.currency)}
Tax: ${formatCurrency(estimate.taxTotal, estimate.currency)}
Total: ${formatCurrency(estimate.total, estimate.currency)}
`;
    return Buffer.from(content, 'utf-8');
}