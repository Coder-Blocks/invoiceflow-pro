'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    FileText,
    FileBarChart,
    Receipt,
    CreditCard,
    BarChart3,
    Settings,
    Bell,
    Users2,
    ChevronLeft,
    ChevronRight,
    Repeat,
    Shield,
    Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Customers', href: '/dashboard/customers', icon: Users },
    { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
    { name: 'Estimates', href: '/dashboard/estimates', icon: FileBarChart },
    { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
    { name: 'Recurring', href: '/dashboard/recurring', icon: Repeat },
    { name: 'Reconciliation', href: '/dashboard/reconciliation', icon: Receipt },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Team', href: '/dashboard/team', icon: Users2 },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    { name: 'Audit Logs', href: '/dashboard/audit-logs', icon: Shield },
    { name: 'Billing', href: '/dashboard/billing', icon: Wallet },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <TooltipProvider delayDuration={0}>
            <aside
                className={cn(
                    'relative flex flex-col border-r bg-card transition-all duration-300',
                    collapsed ? 'w-16' : 'w-64'
                )}
            >
                <div className="flex h-14 items-center border-b px-3 py-4">
                    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            {collapsed ? 'IF' : 'InvoiceFlow Pro'}
                        </span>
                    </Link>
                </div>
                <ScrollArea className="flex-1 py-2">
                    <nav className="grid gap-1 px-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <Tooltip key={item.href} delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                                isActive
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                                collapsed && 'justify-center'
                                            )}
                                        >
                                            <item.icon className="h-5 w-5 shrink-0" />
                                            {!collapsed && <span>{item.name}</span>}
                                        </Link>
                                    </TooltipTrigger>
                                    {collapsed && (
                                        <TooltipContent side="right" className="flex items-center gap-4">
                                            {item.name}
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            );
                        })}
                    </nav>
                </ScrollArea>
                <div className="border-t p-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-full justify-center"
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                </div>
            </aside>
        </TooltipProvider>
    );
}