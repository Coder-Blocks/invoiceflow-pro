import { Suspense } from 'react';
import { TeamMembers } from '@/components/team/team-members';
import { PendingInvitations } from '@/components/team/pending-invitations';
import { InviteMemberButton } from '@/components/team/invite-member-button';
import { TeamSkeleton } from '@/components/team/team-skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function TeamPage() {
    const session = await auth();
    if (!session?.user?.activeOrgId) return null;

    const currentMember = await prisma.organizationMember.findFirst({
        where: {
            organizationId: session.user.activeOrgId,
            userId: session.user.id,
        },
    });

    const canManage = currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Team</h1>
                    <p className="text-muted-foreground">
                        Manage your team members and their access.
                    </p>
                </div>
                {canManage && <InviteMemberButton />}
            </div>

            <Tabs defaultValue="members" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="members">Members</TabsTrigger>
                    {canManage && <TabsTrigger value="invitations">Pending Invitations</TabsTrigger>}
                </TabsList>
                <TabsContent value="members">
                    <Suspense fallback={<TeamSkeleton type="members" />}>
                        <TeamMembers canManage={canManage} currentUserId={session.user.id} />
                    </Suspense>
                </TabsContent>
                {canManage && (
                    <TabsContent value="invitations">
                        <Suspense fallback={<TeamSkeleton type="invitations" />}>
                            <PendingInvitations />
                        </Suspense>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}