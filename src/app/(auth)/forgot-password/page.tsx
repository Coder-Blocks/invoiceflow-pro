'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const schema = z.object({
    email: z.string().email('Invalid email address'),
});

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        // Placeholder — actual email sending will be added in Phase 2
        await new Promise((r) => setTimeout(r, 1000));
        toast.success('If an account exists, a reset link has been sent.');
        setIsSubmitted(true);
        setIsLoading(false);
    };

    return (
        <>
            <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
                <p className="text-sm text-muted-foreground">
                    Enter your email and we&apos;ll send you a reset link
                </p>
            </div>
            {isSubmitted ? (
                <div className="text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Check your email for a password reset link.
                    </p>
                    <Button variant="outline" asChild className="w-full">
                        <Link href="/login">Back to Sign In</Link>
                    </Button>
                </div>
            ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            {...register('email')}
                            disabled={isLoading}
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email.message as string}</p>
                        )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                    <p className="px-8 text-center text-sm text-muted-foreground">
                        <Link href="/login" className="underline underline-offset-4 hover:text-primary">
                            Back to Sign In
                        </Link>
                    </p>
                </form>
            )}
        </>
    );
}