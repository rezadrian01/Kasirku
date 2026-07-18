import { OrdersByStatusChart } from '@/components/dashboard/orders-by-status-chart';
import { RevenueTrendChart } from '@/components/dashboard/revenue-trend-chart';
import { TopProductsChart } from '@/components/dashboard/top-products-chart';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDate } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { CalendarClock, CheckCircle2, Clock, FolderKanban, Package, Receipt, ShoppingCart, TrendingUp, Wallet } from 'lucide-react';

interface Stats {
    total_revenue: number;
    total_orders: number;
    pending_orders: number;
    completed_orders: number;
    cancelled_orders: number;
    today_orders: number;
    today_revenue: number;
    total_products: number;
    total_categories: number;
}

interface TopProduct {
    id: string;
    name: string;
    quantity_sold: number;
    revenue: number;
}

interface RecentOrder {
    id: number;
    customer_name: string | null;
    status: string;
    total: number;
    created_at: string;
}

interface RevenuePoint {
    date: string;
    revenue: number;
}

interface OrderStatusPoint {
    status: 'pending' | 'completed' | 'cancelled';
    label: string;
    count: number;
}

interface Props {
    stats: Stats;
    topProducts: TopProduct[];
    recentOrders: RecentOrder[];
    revenueTrend: RevenuePoint[];
    ordersByStatus: OrderStatusPoint[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/admin/dashboard',
    },
];

const statusConfig = {
    pending: { label: 'Pending', variant: 'secondary' as const },
    completed: { label: 'Completed', variant: 'default' as const },
    cancelled: { label: 'Cancelled', variant: 'destructive' as const },
};

function StatCard({ icon: Icon, label, value, hint }: { icon: typeof Wallet; label: string; value: string; hint?: string }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </CardContent>
        </Card>
    );
}

export default function Dashboard({ stats, topProducts, recentOrders, revenueTrend, ordersByStatus }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        icon={Wallet}
                        label="Total Revenue"
                        value={formatCurrency(stats.total_revenue)}
                        hint={`${formatCurrency(stats.today_revenue)} today`}
                    />
                    <StatCard icon={ShoppingCart} label="Total Orders" value={stats.total_orders.toString()} hint={`${stats.today_orders} today`} />
                    <StatCard icon={Clock} label="Pending Orders" value={stats.pending_orders.toString()} hint="Awaiting fulfillment" />
                    <StatCard
                        icon={CheckCircle2}
                        label="Completed Orders"
                        value={stats.completed_orders.toString()}
                        hint={`${stats.cancelled_orders} cancelled`}
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <StatCard icon={Package} label="Total Products" value={stats.total_products.toString()} />
                    <StatCard icon={FolderKanban} label="Total Categories" value={stats.total_categories.toString()} />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="h-4 w-4" />
                            Revenue — Last 14 Days
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RevenueTrendChart data={revenueTrend} />
                    </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Orders by Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <OrdersByStatusChart data={ordersByStatus} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Top Products by Quantity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {topProducts.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">No sales yet</p>
                            ) : (
                                <TopProductsChart data={topProducts} />
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Receipt className="h-4 w-4" />
                                Recent Orders
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {recentOrders.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">No orders yet</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentOrders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell>
                                                    <div className="font-medium">{order.customer_name ?? 'Walk-in'}</div>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <CalendarClock className="h-3 w-3" />
                                                        {formatDate(order.created_at)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={statusConfig[order.status as keyof typeof statusConfig]?.variant}>
                                                        {statusConfig[order.status as keyof typeof statusConfig]?.label ?? order.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Package className="h-4 w-4" />
                                Top Selling Products
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {topProducts.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">No sales yet</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">Qty Sold</TableHead>
                                            <TableHead className="text-right">Revenue</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topProducts.map((product) => (
                                            <TableRow key={product.id}>
                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                <TableCell className="text-right">{product.quantity_sold}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(product.revenue)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
