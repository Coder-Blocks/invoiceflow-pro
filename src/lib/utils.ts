import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(
    amount: number,
    currency: string = 'INR',
    locale?: string
): string {
    const currencyMap: Record<
        string,
        { locale: string; options: Intl.NumberFormatOptions }
    > = {
        INR: {
            locale: 'en-IN',
            options: {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            },
        },
        USD: {
            locale: 'en-US',
            options: {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            },
        },
        EUR: {
            locale: 'de-DE',
            options: {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            },
        },
        GBP: {
            locale: 'en-GB',
            options: {
                style: 'currency',
                currency: 'GBP',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            },
        },
        CAD: {
            locale: 'en-CA',
            options: {
                style: 'currency',
                currency: 'CAD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            },
        },
        AUD: {
            locale: 'en-AU',
            options: {
                style: 'currency',
                currency: 'AUD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            },
        },
    };

    const config = currencyMap[currency] || currencyMap.INR;
    return new Intl.NumberFormat(
        locale || config.locale,
        config.options
    ).format(amount);
}

export function formatDate(date: Date | string) {
    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
    }).format(new Date(date));
}

export function getInitials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}