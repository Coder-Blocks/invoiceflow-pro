'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AcceptInvitePage({ params }: { params: { token: string } }) {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState('');

    useEffect(() => {
        const acceptInvite = async () => {
            try {
                const res = await fetch('/api/invitations/accept', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: params.token }),
                });
                if (res.ok) {
                    setStatus('success');
                    toast.success('Successfully joined organization');
                    setTimeout(() => router.push('/dashboard'), 2000);
                } else {
                    const errorText = await res.text();
                    setError(errorText);
                    setStatus('error');
                }
            } catch (err) {
                setError('An unexpected error occurred');
                setStatus('error');
            }
        };
        acceptInvite();
    }, [params.token, router]);

    return (
        <div className="container flex items-center justify-center min-h-screen">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <CardTitle>Accept Invitation</CardTitle>
                    <CardDescription>
                        {status === 'loading' && 'Processing your invitation...'}
                        {status === 'success' && 'Redirecting to dashboard...'}
                        {status === 'error' && 'There was a problem'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
                    {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
                    {status === 'error' && (
                        <>
                            <XCircle className="h-12 w-12 text-red-500" />
                            <p className="text-sm text-muted-foreground">{error}</p>
                            <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}