import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RevenueChart } from '@/components/analytics/revenue-chart';
import { InvoiceTrends } from '@/components/analytics/invoice-trends';
import { PaymentTrends } from '@/components/analytics/payment-trends';
import { CustomerGrowth } from '@/components/analytics/customer-growth';
import { AgingReport } from '@/components/analytics/aging-report';
import { TopCustomersTable } from '@/components/analytics/top-customers-table';
import { AnalyticsSkeleton } from '@/components/analytics/analytics-skeleton';
import { DateRangePicker } from '@/components/analytics/date-range-picker';

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
                    <p className="text-muted-foreground">
                        Detailed insights into your business performance.
                    </p>
                </div>
                <DateRangePicker />
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="revenue">Revenue</TabsTrigger>
                    <TabsTrigger value="customers">Customers</TabsTrigger>
                    <TabsTrigger value="aging">Aging</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Revenue Overview</CardTitle>
                                <CardDescription>Monthly revenue breakdown</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <Suspense fallback={<AnalyticsSkeleton type="chart" />}>
                                    <RevenueChart />
                                </Suspense>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Invoice Trends</CardTitle>
                                <CardDescription>Invoiced vs Paid</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <Suspense fallback={<AnalyticsSkeleton type="chart" />}>
                                    <InvoiceTrends />
                                </Suspense>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Payment Trends</CardTitle>
                                <CardDescription>Payments received over time</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <Suspense fallback={<AnalyticsSkeleton type="chart" />}>
                                    <PaymentTrends />
                                </Suspense>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Customer Growth</CardTitle>
                                <CardDescription>New customers per month</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <Suspense fallback={<AnalyticsSkeleton type="chart" />}>
                                    <CustomerGrowth />
                                </Suspense>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="revenue" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Revenue Analysis</CardTitle>
                            <CardDescription>Month-over-month comparison</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <Suspense fallback={<AnalyticsSkeleton type="chart" />}>
                                <RevenueChart detailed />
                            </Suspense>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Customers by Revenue</CardTitle>
                            <CardDescription>Your highest-value clients</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Suspense fallback={<AnalyticsSkeleton type="table" />}>
                                <TopCustomersTable />
                            </Suspense>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="customers" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Acquisition</CardTitle>
                            <CardDescription>New customers over time</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <Suspense fallback={<AnalyticsSkeleton type="chart" />}>
                                <CustomerGrowth detailed />
                            </Suspense>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>All Customers</CardTitle>
                            <CardDescription>Complete customer list with metrics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Suspense fallback={<AnalyticsSkeleton type="table" />}>
                                <TopCustomersTable showAll />
                            </Suspense>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="aging" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Accounts Receivable Aging</CardTitle>
                            <CardDescription>Outstanding invoices by age</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Suspense fallback={<AnalyticsSkeleton type="chart" />}>
                                <AgingReport />
                            </Suspense>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}