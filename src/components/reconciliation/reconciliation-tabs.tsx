'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnmatchedTransactions } from './unmatched-transactions';
import { MatchedTransactions } from './matched-transactions';
import { PendingMatches } from './pending-matches';

export function ReconciliationTabs() {
    return (
        <Tabs defaultValue="unmatched" className="space-y-4">
            <TabsList>
                <TabsTrigger value="unmatched">Unmatched</TabsTrigger>
                <TabsTrigger value="pending">Pending Matches</TabsTrigger>
                <TabsTrigger value="matched">Matched</TabsTrigger>
            </TabsList>
            <TabsContent value="unmatched">
                <UnmatchedTransactions />
            </TabsContent>
            <TabsContent value="pending">
                <PendingMatches />
            </TabsContent>
            <TabsContent value="matched">
                <MatchedTransactions />
            </TabsContent>
        </Tabs>
    );
}