import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, Users, FileText, Clock, TrendingUp, AlertCircle } from 'lucide-react';

const iconMap: Record<string, any> = {
    DollarSign,
    Users,
    FileText,
    Clock,
    TrendingUp,
    AlertCircle,
};

interface StatsCardsProps {
    stats: {
        title: string;
        value: number;
        iconName: string;
        description: string;
        format: 'currency' | 'number';
    }[];
}

export function StatsCards({ stats }: StatsCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
                const Icon = iconMap[stat.iconName];
                return (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stat.format === 'currency' ? formatCurrency(stat.value) : stat.value}
                            </div>
                            <p className="text-xs text-muted-foreground">{stat.description}</p>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}