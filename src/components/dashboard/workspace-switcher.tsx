'use client';

import { useSession } from 'next-auth/react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function WorkspaceSwitcher() {
    const { data: session, update } = useSession();
    const router = useRouter();
    const [currentOrgId, setCurrentOrgId] = useState(session?.user?.activeOrgId || '');

    const orgs = session?.user?.orgs || [];

    const handleOrgChange = async (orgId: string) => {
        setCurrentOrgId(orgId);
        // Update session with new active org
        await update({ activeOrgId: orgId });
        router.refresh();
        // Optionally redirect to dashboard or stay
    };

    if (orgs.length <= 1) return null;

    return (
        <Select value={currentOrgId} onValueChange={handleOrgChange}>
            <SelectTrigger className="w-[220px] h-8 text-sm border-0 bg-muted/50 hover:bg-muted">
                <Building2 className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
                {orgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                        {org.name} ({org.role})
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}