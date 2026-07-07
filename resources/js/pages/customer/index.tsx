import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselIndicators, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type CartItem, type Category, type Pagination, type Product, type ProductPhoto } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { ImageIcon, Minus, Plus, SearchIcon, ShoppingCart, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
    products: Product[];
    categories: Category[];
    pagination?: Pagination;
}

export default function CustomerIndex({ products: initialProducts, categories, pagination }: Props) {
    // State
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartModalOpen, setIsCartModalOpen] = useState(false);

    // Infinite scroll state
    const [currentPage, setCurrentPage] = useState(pagination?.current_page || 1);
    const [hasMorePages, setHasMorePages] = useState(pagination?.has_more_pages || false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const observerRef = useRef<HTMLDivElement>(null);

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('kasirku_cart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (error) {
                console.error('Error loading cart from localStorage:', error);
                localStorage.removeItem('kasirku_cart');
            }
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('kasirku_cart', JSON.stringify(cart));
    }, [cart]);

    // Update products when props change
    useEffect(() => {
        setProducts(initialProducts);
        setCurrentPage(pagination?.current_page || 1);
        setHasMorePages(pagination?.has_more_pages || false);
    }, [initialProducts, pagination]);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Filter products based on search term and category
    const filteredProducts = products.filter((product) => {
        const matchesSearch =
            product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            product.category?.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || product.category_id.toString() === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    // Load more products function
    const loadMoreProducts = useCallback(async () => {
        if (isLoadingMore || !hasMorePages) return;

        setIsLoadingMore(true);

        try {
            const params = new URLSearchParams({
                page: (currentPage + 1).toString(),
            });

            if (debouncedSearchTerm) {
                params.append('search', debouncedSearchTerm);
            }

            if (categoryFilter && categoryFilter !== 'all') {
                params.append('category', categoryFilter);
            }

            const response = await fetch(`/?${params.toString()}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();

                setProducts((prev) => [...prev, ...data.products]);
                setCurrentPage(data.pagination.current_page);
                setHasMorePages(data.pagination.has_more_pages);
            }
        } catch (error) {
            console.error('Failed to load more products:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [currentPage, hasMorePages, isLoadingMore, debouncedSearchTerm, categoryFilter]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMorePages && !isLoadingMore) {
                    loadMoreProducts();
                }
            },
            {
                threshold: 0.1,
                rootMargin: '100px',
            },
        );

        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => {
            if (observerRef.current) {
                observer.unobserve(observerRef.current);
            }
        };
    }, [loadMoreProducts, hasMorePages, isLoadingMore]);

    // Reset pagination when search or filter changes
    useEffect(() => {
        // Reset products to initial when filtering
        setProducts(initialProducts);
        setCurrentPage(1);
        setHasMorePages(pagination?.has_more_pages || false);
    }, [debouncedSearchTerm, categoryFilter, initialProducts, pagination]);

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

    // Cart functions
    const addToCart = (product: Product) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.product.id === product.id);
            if (existingItem) {
                return prevCart.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
            } else {
                return [...prevCart, { product, quantity: 1 }];
            }
        });
    };

    const updateCartItemQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }

        setCart((prevCart) => prevCart.map((item) => (item.product.id === productId ? { ...item, quantity } : item)));
    };

    const removeFromCart = (productId: string) => {
        setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
    };

    const clearCart = () => {
        setCart([]);
    };

    const getTotalPrice = () => {
        return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
    };

    const getTotalItems = () => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    };

    const getProductQuantityInCart = (productId: string) => {
        const cartItem = cart.find((item) => item.product.id === productId);
        return cartItem ? cartItem.quantity : 0;
    };

    const goToCheckout = () => {
        console.log('Going to checkout with cart:', cart);

        // Save current cart to localStorage before navigation
        localStorage.setItem('kasirku_cart', JSON.stringify(cart));

        // Verify cart was saved
        const savedCart = localStorage.getItem('kasirku_cart');
        console.log('Cart saved to localStorage:', savedCart);

        setIsCartModalOpen(false);
        router.visit('/checkout');
    };

    return (
        <div className="min-h-screen bg-background">
            <Head title="Kasirku - Menu" />

            {/* Header */}
            <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Kasirku</h1>
                            <p className="text-muted-foreground">Pilih menu favorit Anda</p>
                        </div>

                        {/* Cart Button */}
                        <Dialog open={isCartModalOpen} onOpenChange={setIsCartModalOpen}>
                            <DialogTrigger asChild>
                                <Button className="relative">
                                    <ShoppingCart className="mr-2 h-5 w-5" />
                                    Keranjang
                                    {getTotalItems() > 0 && (
                                        <Badge className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full p-0">
                                            {getTotalItems()}
                                        </Badge>
                                    )}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Keranjang Belanja</DialogTitle>
                                    <DialogDescription>Review pesanan Anda sebelum melakukan checkout</DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                    {cart.length === 0 ? (
                                        <div className="py-8 text-center">
                                            <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                                            <p className="text-muted-foreground">Keranjang Anda kosong</p>
                                        </div>
                                    ) : (
                                        <>
                                            {cart.map((item) => (
                                                <div key={item.product.id} className="flex items-center space-x-4 rounded-lg border p-4">
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
                                                        <p className="text-sm text-muted-foreground">{formatCurrency(item.product.price)}</p>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                        </Button>

                                                        <span className="w-8 text-center">{item.quantity}</span>

                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </Button>

                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => removeFromCart(item.product.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="border-t pt-4">
                                                <div className="flex items-center justify-between text-lg font-semibold">
                                                    <span>Total:</span>
                                                    <span>{formatCurrency(getTotalPrice())}</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <DialogFooter className="flex-col space-y-2">
                                    {cart.length > 0 && (
                                        <>
                                            <Button variant="outline" className="w-full" onClick={clearCart}>
                                                Kosongkan Keranjang
                                            </Button>
                                            <Button className="w-full" onClick={goToCheckout}>
                                                Lanjut ke Checkout ({getTotalItems()} item)
                                            </Button>
                                        </>
                                    )}
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-6">
                {/* Filters */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative max-w-md">
                        <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                        <Input placeholder="Cari menu..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Semua Kategori" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Kategori</SelectItem>
                            {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Products Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredProducts.map((product) => {
                        const quantityInCart = getProductQuantityInCart(product.id);

                        return (
                            <Card key={product.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                                <div className="relative aspect-square bg-muted">
                                    {product.photos && product.photos.length > 0 ? (
                                        product.photos.length === 1 ? (
                                            // Single image - no carousel needed
                                            <img src={product.photos[0].url} alt={product.name} className="h-full w-full object-cover" />
                                        ) : (
                                            // Multiple images - use carousel
                                            <Carousel className="aspect-square w-full">
                                                <CarouselContent className="aspect-square">
                                                    {product.photos.map((photo, index) => (
                                                        <CarouselItem key={photo.id} className="aspect-square">
                                                            <img
                                                                src={photo.url}
                                                                alt={`${product.name} - Photo ${index + 1}`}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </CarouselItem>
                                                    ))}
                                                </CarouselContent>
                                                <CarouselPrevious />
                                                <CarouselNext />
                                                <CarouselIndicators />
                                            </Carousel>
                                        )
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>

                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">{product.name}</CardTitle>
                                    <div className="flex items-center justify-between">
                                        <Badge variant="secondary">{product.category?.name}</Badge>
                                        <span className="text-lg font-semibold text-green-600">{formatCurrency(product.price)}</span>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-0">
                                    {quantityInCart > 0 ? (
                                        <div className="flex items-center justify-between gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => updateCartItemQuantity(product.id, quantityInCart - 1)}
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>

                                            <span className="flex-grow text-center font-medium">{quantityInCart} di keranjang</span>

                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => updateCartItemQuantity(product.id, quantityInCart + 1)}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button className="w-full" onClick={() => addToCart(product)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Tambah ke Keranjang
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Infinite Scroll Observer */}
                {hasMorePages && (
                    <div ref={observerRef} className="flex justify-center py-8">
                        {isLoadingMore ? (
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                                <span className="text-muted-foreground">Memuat produk lainnya...</span>
                            </div>
                        ) : (
                            <div className="text-muted-foreground">Scroll ke bawah untuk memuat lebih banyak produk</div>
                        )}
                    </div>
                )}

                {/* End of results indicator */}
                {!hasMorePages && filteredProducts.length > 0 && (
                    <div className="flex justify-center py-8">
                        <div className="text-center text-muted-foreground">
                            <div className="mx-auto mb-4 h-px w-24 bg-border"></div>
                            <p>Anda telah melihat semua produk</p>
                            <p className="mt-1 text-sm">Menampilkan {filteredProducts.length} produk</p>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {filteredProducts.length === 0 && !isLoadingMore && (
                    <div className="py-12 text-center">
                        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-medium text-foreground">Tidak ada produk ditemukan</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {searchTerm || (categoryFilter && categoryFilter !== 'all')
                                ? 'Coba sesuaikan kriteria pencarian Anda'
                                : 'Belum ada produk yang tersedia'}
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
