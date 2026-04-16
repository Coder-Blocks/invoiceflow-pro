import { Estimate, Customer, Organization, EstimateItem } from '@prisma/client';
import { formatCurrency, formatDate } from './utils';

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
${estimate.items.map(item => `${item.description} - ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.amount)}`).join('\n')}

Subtotal: ${formatCurrency(estimate.subtotal)}
Tax: ${formatCurrency(estimate.taxTotal)}
Total: ${formatCurrency(estimate.total)}
`;
    return Buffer.from(content, 'utf-8');
}