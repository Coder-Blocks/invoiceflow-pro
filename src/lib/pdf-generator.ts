import { Invoice, Customer, Organization, InvoiceItem, Estimate, EstimateItem } from '@prisma/client';
import { formatCurrency, formatDate } from './utils';

export async function generateInvoicePDF(
    invoice: Invoice & { customer: Customer | null; items: InvoiceItem[]; organization: Organization }
): Promise<Uint8Array> {
    const content = `INVOICE...`; // 保持原有内容
    return new TextEncoder().encode(content);
}

export async function generateEstimatePDF(
    estimate: Estimate & { customer: Customer | null; items: EstimateItem[]; organization: Organization }
): Promise<Uint8Array> {
    const content = `ESTIMATE...`; // 保持原有内容
    return new TextEncoder().encode(content);
}