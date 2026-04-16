'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { CheckCheck, MailOpen } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        const res = await fetch('/api/notifications?limit=100');
        const data = await res.json();
        setNotifications(data.notifications);
        setLoading(false);
    };

    const handleMarkAsRead = async (id?: string) => {
        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(id ? { id, read: true } : { read: true }),
        });
        toast.success(id ? 'Marked as read' : 'All marked as read');
        fetchNotifications();
    };

    const filteredNotifications = notifications.filter((n) => {
        if (activeTab === 'unread') return !n.read;
        if (activeTab === 'read') return n.read;
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                    <p className="text-muted-foreground">Stay updated with your account activity.</p>
                </div>
                <Button variant="outline" onClick={() => handleMarkAsRead()}>
                    <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
                </Button>
            </div>

            <Tabs defaultValue="all" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="unread">Unread</TabsTrigger>
                    <TabsTrigger value="read">Read</TabsTrigger>
                </TabsList>
                <TabsContent value={activeTab}>
                    <Card>
                        <CardHeader>
                            <CardTitle>{activeTab === 'all' ? 'All' : activeTab === 'unread' ? 'Unread' : 'Read'} Notifications</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="py-8 text-center">Loading...</div>
                            ) : filteredNotifications.length === 0 ? (
                                <div className="py-8 text-center text-muted-foreground">
                                    No notifications
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredNotifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={cn(
                                                'flex items-start justify-between p-4 rounded-lg border',
                                                !notification.read && 'bg-muted/30'
                                            )}
                                        >
                                            <div className="space-y-1 flex-1">
                                                <Link href={notification.actionUrl || '#'} className="font-medium hover:underline">
                                                    {notification.title}
                                                </Link>
                                                <p className="text-sm text-muted-foreground">{notification.message}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                >
                                                    <MailOpen className="mr-1 h-3 w-3" /> Mark read
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}