import { LandingHeader } from '@/components/layout/landing-header';
import { LandingFooter } from '@/components/layout/landing-footer';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Shield, Zap, BarChart3, Users } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
    return (
        <div className="flex min-h-screen flex-col">
            <LandingHeader />
            <main className="flex-1">
                {/* Hero */}
                <section className="relative py-20 md:py-28 overflow-hidden">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
                    <div className="container relative">
                        <div className="mx-auto max-w-4xl text-center">
                            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                                Invoicing that works{' '}
                                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                    for you
                                </span>
                            </h1>
                            <p className="mt-6 text-xl text-muted-foreground md:text-2xl">
                                Create, send, track, and reconcile invoices without the complexity of ERP systems.
                                Built for micro and small businesses that value time.
                            </p>
                            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                                <Button size="lg" asChild>
                                    <Link href="/signup">
                                        Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button size="lg" variant="outline" asChild>
                                    <Link href="#demo">Watch Demo</Link>
                                </Button>
                            </div>
                            <p className="mt-4 text-sm text-muted-foreground">
                                No credit card required. 14-day free trial.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Trusted by */}
                <section className="border-y py-8 bg-muted/20">
                    <div className="container">
                        <p className="text-center text-sm font-medium text-muted-foreground">
                            Trusted by 2,500+ small businesses worldwide
                        </p>
                    </div>
                </section>

                {/* Features */}
                <section id="features" className="py-20 md:py-28">
                    <div className="container">
                        <div className="mx-auto max-w-3xl text-center">
                            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                Everything you need to run invoices like a pro
                            </h2>
                            <p className="mt-4 text-lg text-muted-foreground">
                                InvoiceFlow Pro replaces spreadsheets and complex ERPs with a streamlined,
                                powerful invoicing platform.
                            </p>
                        </div>
                        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                            {[
                                {
                                    icon: Zap,
                                    title: 'Fast Invoicing',
                                    desc: 'Create professional invoices in seconds with smart defaults and autofill.',
                                },
                                {
                                    icon: BarChart3,
                                    title: 'Real‑time Tracking',
                                    desc: 'Know exactly which invoices are paid, overdue, or pending.',
                                },
                                {
                                    icon: Shield,
                                    title: 'Automated Reminders',
                                    desc: 'Set and forget payment reminders that improve cash flow.',
                                },
                                {
                                    icon: Users,
                                    title: 'Team Collaboration',
                                    desc: 'Invite accountants or staff with role‑based permissions.',
                                },
                            ].map((feature, i) => (
                                <div key={i} className="rounded-lg border bg-card p-6 shadow-sm">
                                    <feature.icon className="h-10 w-10 text-primary" />
                                    <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                                    <p className="mt-2 text-muted-foreground">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pain point solution */}
                <section className="border-t py-20 md:py-28 bg-muted/50">
                    <div className="container">
                        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                    Stop wasting time on manual invoicing
                                </h2>
                                <p className="mt-4 text-lg text-muted-foreground">
                                    Small businesses spend over 15 hours per month on invoicing and reconciliation.
                                    InvoiceFlow Pro automates the busywork so you can focus on growing your business.
                                </p>
                                <ul className="mt-6 space-y-3">
                                    {[
                                        'Automatic invoice numbering and tax calculation',
                                        'Recurring invoices that send themselves',
                                        'Bank reconciliation in minutes, not hours',
                                        'AI‑powered reminders that sound human',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-primary" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="rounded-lg border bg-card p-2 shadow-xl">
                                <div className="aspect-video rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                    <span className="text-sm font-medium">[ Dashboard Preview ]</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing preview */}
                <section id="pricing" className="py-20 md:py-28">
                    <div className="container">
                        <div className="mx-auto max-w-3xl text-center">
                            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                Simple, transparent pricing
                            </h2>
                            <p className="mt-4 text-lg text-muted-foreground">
                                Choose the plan that fits your business. All plans include a 14‑day free trial.
                            </p>
                        </div>
                        <div className="mt-12 grid gap-8 md:grid-cols-3">
                            {[
                                { name: 'Starter', price: '$19', desc: 'Perfect for freelancers' },
                                { name: 'Professional', price: '$39', desc: 'Growing businesses', highlight: true },
                                { name: 'Business', price: '$79', desc: 'Teams & volume' },
                            ].map((plan, i) => (
                                <div
                                    key={i}
                                    className={`rounded-xl border bg-card p-6 shadow-sm ${plan.highlight ? 'border-primary ring-1 ring-primary' : ''
                                        }`}
                                >
                                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                                    <div className="mt-4 flex items-baseline">
                                        <span className="text-3xl font-bold">{plan.price}</span>
                                        <span className="ml-1 text-muted-foreground">/month</span>
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
                                    <Button className="mt-6 w-full" variant={plan.highlight ? 'default' : 'outline'}>
                                        Start Free Trial
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <p className="mt-6 text-center text-sm text-muted-foreground">
                            All plans include unlimited invoices, clients, and 24/7 support.
                        </p>
                    </div>
                </section>

                {/* CTA */}
                <section className="border-t py-20 bg-primary/5">
                    <div className="container text-center">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Ready to simplify your invoicing?
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Join thousands of small businesses that trust InvoiceFlow Pro.
                        </p>
                        <Button size="lg" className="mt-8" asChild>
                            <Link href="/signup">
                                Get Started — It&apos;s Free <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </section>
            </main>
            <LandingFooter />
        </div>
    );
}