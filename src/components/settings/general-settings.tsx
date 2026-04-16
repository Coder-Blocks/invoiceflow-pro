'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const generalSchema = z.object({
    name: z.string().min(1, 'Company name is required'),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    taxId: z.string().optional().nullable(),
});

type GeneralFormValues = z.infer<typeof generalSchema>;

interface GeneralSettingsProps {
    organization: any;
    canManage: boolean;
}

export function GeneralSettings({ organization, canManage }: GeneralSettingsProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<GeneralFormValues>({
        resolver: zodResolver(generalSchema),
        defaultValues: {
            name: organization.name || '',
            email: organization.email || '',
            phone: organization.phone || '',
            address: organization.address || '',
            taxId: organization.taxId || '',
        },
    });

    const onSubmit = async (data: GeneralFormValues) => {
        setIsLoading(true);
        const res = await fetch('/api/organization', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            toast.success('Settings updated');
        } else {
            toast.error('Failed to update settings');
        }
        setIsLoading(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                    Update your company information and contact details.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Company Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Acme Inc." {...field} disabled={!canManage} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="contact@acme.com"
                                                {...field}
                                                value={field.value || ''}
                                                disabled={!canManage}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="+1 (555) 000-0000"
                                                {...field}
                                                value={field.value || ''}
                                                disabled={!canManage}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="123 Business St, City, Country"
                                            {...field}
                                            value={field.value || ''}
                                            disabled={!canManage}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="taxId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tax ID / GST Number</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="GSTIN123456789"
                                            {...field}
                                            value={field.value || ''}
                                            disabled={!canManage}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {canManage && (
                            <div className="flex justify-end">
                                <Button type="submit" disabled={isLoading}>
                                    Save Changes
                                </Button>
                            </div>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}