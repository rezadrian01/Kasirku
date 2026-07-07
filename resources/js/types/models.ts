export interface Category {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
    products_count?: number;
}

export interface ProductPhoto {
    id: number;
    product_id: string;
    url: string;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
}

export interface Product {
    id: string;
    name: string;
    category_id: number;
    price: number;
    created_at: string;
    updated_at: string;
    category?: Category;
    photos?: ProductPhoto[];
}

export interface CartItem {
    product: Product;
    quantity: number;
    notes?: string;
}

export interface OrderItem {
    id: number;
    order_id: number;
    product_id: string;
    quantity: number;
    notes?: string | null;
    price: number;
    subtotal: number;
    product: Product;
}

export interface Payment {
    id: number;
    order_id: number;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    payment_method: string | null;
    transaction_id: string | null;
    paid_at: string | null;
    notes?: string | null;
}

export interface Order {
    id: number;
    customer_name: string | null;
    table_number: number;
    status: 'pending' | 'completed' | 'cancelled';
    created_at: string;
    updated_at: string;
    order_items: OrderItem[];
    payment: Payment;
}

export interface Pagination {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more_pages: boolean;
}
