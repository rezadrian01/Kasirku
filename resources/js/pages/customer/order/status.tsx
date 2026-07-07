import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { type Order, type ProductPhoto } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, CheckCircle, Clock, ImageIcon, Receipt, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
    order: Order;
}

export default function OrderStatus({ order: initialOrder }: Props) {
    const [order, setOrder] = useState<Order>(initialOrder);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Poll for order status updates
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/order/${order.id}/check`);
                if (response.ok) {
                    const data = await response.json();
                    setOrder(data.order);
                }
            } catch (error) {
                console.error('Error checking order status:', error);
            }
        }, 10000); // Poll every 10 seconds

        return () => clearInterval(interval);
    }, [order.id]);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
        }).format(amount);
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Get primary photo
    const getPrimaryPhoto = (photos: ProductPhoto[] = []) => {
        if (photos.length === 0) return null;
        const primary = photos.find((photo) => photo.is_primary);
        return primary?.url || photos[0]?.url || null;
    };

    // Calculate totals
    const getTotalPrice = () => {
        return order.order_items.reduce((total, item) => total + item.product.price * item.quantity, 0);
    };

    const getTotalItems = () => {
        return order.order_items.reduce((total, item) => total + item.quantity, 0);
    };

    // Manual refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const response = await fetch(`/order/${order.id}/check`);
            if (response.ok) {
                const data = await response.json();
                setOrder(data.order);
            }
        } catch (error) {
            console.error('Error refreshing order status:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const goHome = () => {
        // Clear order info from localStorage
        localStorage.removeItem('kasirku_current_order');
        router.visit('/');
    };

    // Get status info
    const getStatusInfo = () => {
        switch (order.status) {
            case 'pending':
                return {
                    icon: <Clock className="h-8 w-8 text-yellow-500" />,
                    title: 'Pesanan Sedang Diproses',
                    description: 'Pesanan Anda sedang dipersiapkan oleh dapur. Mohon tunggu sebentar.',
                    color: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950',
                };
            case 'completed':
                return {
                    icon: <CheckCircle className="h-8 w-8 text-green-500" />,
                    title: 'Pesanan Siap Diambil!',
                    description: 'Pesanan Anda sudah siap. Silakan ambil di kasir dengan menunjukkan halaman ini.',
                    color: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
                };
            case 'cancelled':
                return {
                    icon: <Receipt className="h-8 w-8 text-red-500" />,
                    title: 'Pesanan Dibatalkan',
                    description: 'Pesanan Anda telah dibatalkan. Silakan hubungi kasir untuk informasi lebih lanjut.',
                    color: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
                };
            default:
                return {
                    icon: <Clock className="h-8 w-8 text-gray-500" />,
                    title: 'Status Tidak Diketahui',
                    description: 'Mohon hubungi kasir untuk informasi lebih lanjut.',
                    color: 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950',
                };
        }
    };

    const statusInfo = getStatusInfo();

    return (
        <div className="min-h-screen bg-background">
            <Head title={`Pesanan #${order.id} - Status`} />

            {/* Header */}
            <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={goHome}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Status Pesanan</h1>
                                <p className="text-muted-foreground">Pesanan #{order.id}</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-6">
                <div className="mx-auto max-w-4xl space-y-6">
                    {/* Status Card */}
                    <Card className={statusInfo.color}>
                        <CardContent className="flex items-center gap-4 p-6">
                            {statusInfo.icon}
                            <div className="flex-grow">
                                <h2 className="text-xl font-bold">{statusInfo.title}</h2>
                                <p className="text-muted-foreground">{statusInfo.description}</p>
                                {order.status === 'pending' && (
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        💡 Halaman ini akan otomatis diperbarui. Anda juga dapat me-refresh secara manual.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Order Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Detail Pesanan</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Nama Pelanggan</p>
                                        <p className="font-medium">{order.customer_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Nomor Meja</p>
                                        <p className="font-medium">Meja {order.table_number}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Waktu Pesanan</p>
                                        <p className="font-medium">{formatDate(order.created_at)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Status Pembayaran</p>
                                        <Badge variant={order.payment.status === 'completed' ? 'default' : 'secondary'}>
                                            {order.payment.status === 'completed' ? 'Lunas' : 'Pending'}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Informasi Pembayaran</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Subtotal ({getTotalItems()} item)</span>
                                        <span>{formatCurrency(getTotalPrice())}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-semibold">
                                        <span>Total Dibayar</span>
                                        <span className="text-green-600">{formatCurrency(order.payment.amount)}</span>
                                    </div>
                                </div>

                                <div className="text-sm text-muted-foreground">
                                    <p>Metode Pembayaran: {order.payment.payment_method}</p>
                                    {order.payment.paid_at && <p>Dibayar pada: {formatDate(order.payment.paid_at)}</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Order Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Item Pesanan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {order.order_items.map((item) => (
                                <div key={item.id} className="flex items-center gap-4">
                                    <div className="h-16 w-16 flex-shrink-0">
                                        {getPrimaryPhoto(item.product.photos) ? (
                                            <img
                                                src={getPrimaryPhoto(item.product.photos)!}
                                                alt={item.product.name}
                                                className="h-full w-full rounded object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center rounded bg-muted">
                                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-grow">
                                        <h4 className="font-medium">{item.product.name}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {formatCurrency(item.product.price)} × {item.quantity}
                                        </p>
                                        {item.product.category && (
                                            <Badge variant="secondary" className="mt-1 text-xs">
                                                {item.product.category.name}
                                            </Badge>
                                        )}
                                        {item.notes && <p className="mt-1 text-xs text-muted-foreground">Catatan: {item.notes}</p>}
                                    </div>

                                    <div className="text-right">
                                        <p className="font-medium">{formatCurrency(item.product.price * item.quantity)}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Footer Note */}
                    <Card className="border-dashed">
                        <CardContent className="p-6 text-center">
                            <Receipt className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                            <h3 className="mb-2 font-semibold">Nota Digital</h3>
                            <p className="text-sm text-muted-foreground">
                                Simpan halaman ini sebagai bukti pesanan Anda. Tunjukkan kepada kasir saat mengambil pesanan.
                            </p>
                            {order.status === 'completed' && (
                                <p className="mt-2 text-sm font-medium text-green-600">✅ Pesanan siap diambil di kasir</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
