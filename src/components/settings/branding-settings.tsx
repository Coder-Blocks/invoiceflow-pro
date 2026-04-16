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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

const brandingSchema = z.object({
    brandColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
    logo: z.string().optional().nullable(),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

interface BrandingSettingsProps {
    organization: any;
    canManage: boolean;
}

export function BrandingSettings({ organization, canManage }: BrandingSettingsProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(organization.logo);

    const form = useForm<BrandingFormValues>({
        resolver: zodResolver(brandingSchema),
        defaultValues: {
            brandColor: organization.brandColor || '#3B82F6',
            logo: organization.logo || '',
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const onSubmit = async (data: BrandingFormValues) => {
        setIsLoading(true);
        try {
            let logoUrl = data.logo;

            if (logoFile) {
                const formData = new FormData();
                formData.append('file', logoFile);

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadRes.ok) {
                    const errorText = await uploadRes.text();
                    throw new Error(errorText || 'Upload failed');
                }

                const { url } = await uploadRes.json();
                logoUrl = url;
            }

            const updateRes = await fetch('/api/organization', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, logo: logoUrl }),
            });

            if (!updateRes.ok) {
                const errorText = await updateRes.text();
                throw new Error(errorText || 'Failed to update branding');
            }

            toast.success('Branding updated successfully');

            // Update preview and form value without page reload
            if (logoUrl) setPreviewUrl(logoUrl);
            setLogoFile(null);
            form.setValue('logo', logoUrl);

            // Soft refresh using router to revalidate server components
            router.refresh();
        } catch (error) {
            console.error('Branding update error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to update branding');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>
                    Customize your logo and brand color for invoices.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Logo Upload Section */}
                        <div className="space-y-2">
                            <Label>Logo</Label>
                            <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20 rounded-lg">
                                    <AvatarImage src={previewUrl || ''} />
                                    <AvatarFallback className="rounded-lg text-2xl">
                                        {organization.name?.charAt(0) || 'C'}
                                    </AvatarFallback>
                                </Avatar>
                                {canManage && (
                                    <div>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="logo-upload"
                                        />
                                        <Button type="button" variant="outline" asChild>
                                            <label htmlFor="logo-upload" className="cursor-pointer">
                                                <Upload className="mr-2 h-4 w-4" /> Upload Logo
                                            </label>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="brandColor"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Brand Color</FormLabel>
                                    <div className="flex items-center gap-4">
                                        <FormControl>
                                            <Input
                                                type="color"
                                                className="w-20 h-10 p-1"
                                                {...field}
                                                value={field.value || '#3B82F6'}
                                                disabled={!canManage}
                                            />
                                        </FormControl>
                                        <Input
                                            placeholder="#3B82F6"
                                            {...field}
                                            value={field.value || '#3B82F6'}
                                            disabled={!canManage}
                                        />
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {canManage && (
                            <div className="flex justify-end">
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}