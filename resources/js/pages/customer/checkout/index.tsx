import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TAX_RATE } from '@/lib/constants';
import { type CartItem, type ProductPhoto } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, ImageIcon, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';

declare global {
    interface Window {
        snap: any;
    }
}

export default function CheckoutIndex() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [tableNumber, setTableNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('kasirku_cart');

        if (savedCart) {
            try {
                const parsedCart = JSON.parse(savedCart);
                setCart(parsedCart);
            } catch (error) {
                console.error('Error loading cart from localStorage:', error);
                setCart([]);
            }
        } else {
            setCart([]);
        }

        // Mark initial loading as complete
        setIsInitialLoading(false);

        // Load Midtrans Snap script
        const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
        const isProduction = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true';

        const snapScript = document.createElement('script');
        // Use correct URL based on environment
        snapScript.src = isProduction ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js';

        snapScript.setAttribute('data-client-key', clientKey);

        snapScript.onload = () => {
            // Midtrans Snap script loaded successfully
        };

        snapScript.onerror = () => {
            console.error('Failed to load Midtrans Snap script');
        };

        document.head.appendChild(snapScript);

        return () => {
            if (document.head.contains(snapScript)) {
                document.head.removeChild(snapScript);
            }
        };
    }, []);

    // Redirect if cart is empty (only after initial loading is complete)
    useEffect(() => {
        if (!isInitialLoading && cart.length === 0) {
            router.visit('/');
        }
    }, [cart, isInitialLoading]);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
        }).format(amount);
    };

    // Get primary photo
    const getPrimaryPhoto = (photos: ProductPhoto[] = []) => {
        if (photos.length === 0) return null;
        const primary = photos.find((photo) => photo.is_primary);
        return primary?.url || photos[0]?.url || null;
    };

    // Calculate totals
    const getSubtotal = () => {
        return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
    };

    const getTaxAmount = () => {
        return getSubtotal() * TAX_RATE;
    };

    const getTotalPrice = () => {
        return getSubtotal() + getTaxAmount();
    };

    const getTotalItems = () => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    };

    // Handle payment
    const handlePayment = async () => {
        if (!customerName.trim()) {
            setErrors({ customer_name: 'Nama pelanggan harus diisi' });
            return;
        }

        if (!tableNumber.trim() || parseInt(tableNumber) < 1) {
            setErrors({ table_number: 'Nomor meja harus diisi dengan angka yang valid' });
            return;
        }

        setErrors({});
        setIsLoading(true);

        try {
            const response = await fetch('/checkout/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    customer_name: customerName,
                    table_number: parseInt(tableNumber),
                    cart: cart,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store order info in localStorage
                localStorage.setItem(
                    'kasirku_current_order',
                    JSON.stringify({
                        order_id: data.order_id,
                        payment_id: data.payment_id,
                    }),
                );

                // Check if Snap is available
                if (!window.snap) {
                    setErrors({ general: 'Midtrans Snap belum siap. Silakan refresh halaman dan coba lagi.' });
                    setIsLoading(false);
                    return;
                }

                // Open Midtrans Snap
                try {
                    window.snap.pay(data.snap_token, {
                        onSuccess: function (result: any) {
                            // Clear cart and redirect to order status
                            localStorage.removeItem('kasirku_cart');
                            router.visit(`/order/${data.order_id}/status`);
                        },
                        onPending: function (result: any) {
                            // Redirect to order status to wait for payment
                            router.visit(`/order/${data.order_id}/status`);
                        },
                        onError: function (result: any) {
                            console.error('Payment error:', result);
                            alert('Pembayaran gagal. Silakan coba lagi.');
                            setIsLoading(false);
                        },
                        onClose: function () {
                            // User closed the popup without finishing payment
                            setIsLoading(false);
                        },
                    });
                } catch (error) {
                    console.error('Error opening Snap:', error);
                    setErrors({ general: 'Gagal membuka halaman pembayaran. Silakan coba lagi.' });
                    setIsLoading(false);
                }
            } else {
                setErrors({ general: data.error || 'Terjadi kesalahan saat memproses pesanan' });
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Checkout error:', error);
            setErrors({ general: 'Terjadi kesalahan jaringan. Silakan coba lagi.' });
            setIsLoading(false);
        }
    };

    const goBack = () => {
        router.visit('/');
    };

    // Show loading state while checking cart
    if (isInitialLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Head title="Checkout - Kasirku" />
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                    <span className="text-muted-foreground">Memuat keranjang...</span>
                </div>
            </div>
        );
    }

    if (cart.length === 0) {
        return null; // Will redirect to home
    }

    return (
        <div className="min-h-screen bg-background">
            <Head title="Checkout - Kasirku" />

            {/* Header */}
            <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={goBack}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Checkout</h1>
                                <p className="text-muted-foreground">Konfirmasi pesanan Anda</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-6">
                <div className="mx-auto max-w-4xl">
                    {/* Dine In Notice */}
                    <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                        <CardContent className="flex items-center gap-3 p-4">
                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            <div>
                                <p className="font-medium text-amber-800 dark:text-amber-200">Pemesanan Dine In Only</p>
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                    Saat ini kami hanya menerima pesanan untuk dine in. Silakan pilih meja Anda dan nikmati makanan di tempat.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Order Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5" />
                                    Ringkasan Pesanan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {cart.map((item) => (
                                    <div key={item.product.id} className="flex items-center gap-4">
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

                                <Separator />

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Subtotal ({getTotalItems()} item)</span>
                                        <span>{formatCurrency(getSubtotal())}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Pajak ({TAX_RATE * 100}%)</span>
                                        <span>{formatCurrency(getTaxAmount())}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between text-lg font-semibold">
                                        <span>Total</span>
                                        <span className="text-green-600">{formatCurrency(getTotalPrice())}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Customer Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Informasi Pelanggan</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {errors.general && (
                                    <div className="rounded-md bg-red-50 p-4 dark:bg-red-950">
                                        <p className="text-sm text-red-800 dark:text-red-200">{errors.general}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="customer_name">Nama Pelanggan *</Label>
                                    <Input
                                        id="customer_name"
                                        type="text"
                                        placeholder="Masukkan nama Anda"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className={errors.customer_name ? 'border-red-500' : ''}
                                    />
                                    {errors.customer_name && <p className="text-sm text-red-600">{errors.customer_name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="table_number">Nomor Meja *</Label>
                                    <Input
                                        id="table_number"
                                        type="number"
                                        min="1"
                                        placeholder="Masukkan nomor meja"
                                        value={tableNumber}
                                        onChange={(e) => setTableNumber(e.target.value)}
                                        className={errors.table_number ? 'border-red-500' : ''}
                                    />
                                    {errors.table_number && <p className="text-sm text-red-600">{errors.table_number}</p>}
                                </div>

                                <Separator />

                                <Button className="w-full" size="lg" onClick={handlePayment} disabled={isLoading}>
                                    {isLoading ? 'Memproses...' : `Bayar ${formatCurrency(getTotalPrice())}`}
                                </Button>

                                <p className="text-center text-xs text-muted-foreground">
                                    Dengan melanjutkan pembayaran, Anda menyetujui syarat dan ketentuan kami.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
