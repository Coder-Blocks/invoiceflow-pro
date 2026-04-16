import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeneralSettings } from '@/components/settings/general-settings';
import { BrandingSettings } from '@/components/settings/branding-settings';
import { TaxSettings } from '@/components/settings/tax-settings';
import { InvoiceSettings } from '@/components/settings/invoice-settings';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export default async function SettingsPage() {
    const session = await auth();
    if (!session?.user?.activeOrgId) return notFound();

    const org = await prisma.organization.findUnique({
        where: { id: session.user.activeOrgId },
        include: { settings: true },
    });

    if (!org) return notFound();

    const membership = await prisma.organizationMember.findFirst({
        where: {
            organizationId: session.user.activeOrgId,
            userId: session.user.id,
        },
    });

    const canManage = membership?.role === 'OWNER' || membership?.role === 'ADMIN';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your organization settings and preferences.
                </p>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList className="flex flex-wrap gap-2">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="branding">Branding</TabsTrigger>
                    <TabsTrigger value="tax">Tax & Currency</TabsTrigger>
                    <TabsTrigger value="invoice">Invoice Defaults</TabsTrigger>
                    <TabsTrigger value="team">Team</TabsTrigger>
                    <TabsTrigger value="billing">Billing</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <GeneralSettings organization={org} canManage={canManage} />
                </TabsContent>

                <TabsContent value="branding">
                    <BrandingSettings organization={org} canManage={canManage} />
                </TabsContent>

                <TabsContent value="tax">
                    <TaxSettings organization={org} canManage={canManage} />
                </TabsContent>

                <TabsContent value="invoice">
                    <InvoiceSettings organization={org} canManage={canManage} settings={org.settings} />
                </TabsContent>

                <TabsContent value="team">
                    <div className="text-center py-12 text-muted-foreground">
                        Team management is available in the{' '}
                        <Link href="/dashboard/team" className="text-primary hover:underline">
                            Team
                        </Link>{' '}
                        section.
                    </div>
                </TabsContent>

                <TabsContent value="billing">
                    <div className="space-y-4">
                        <div className="rounded-lg border bg-card p-6">
                            <h3 className="text-lg font-semibold mb-2">Subscription & Billing</h3>
                            <p className="text-muted-foreground mb-4">
                                Manage your subscription plan, payment methods, and view billing history.
                            </p>
                            <Button asChild>
                                <Link href="/dashboard/billing">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Go to Billing Portal
                                </Link>
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}