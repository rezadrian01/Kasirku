<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItems;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;

test('guests cannot access the dashboard', function () {
    $this->get('/admin/dashboard')->assertRedirect('/login');
});

test('dashboard reports accurate revenue and order counts', function () {
    $this->actingAs(User::factory()->create());

    $product = Product::factory()->create(['price' => 10000]);

    $completedOrder = Order::factory()->create(['status' => 'completed']);
    OrderItems::factory()->create([
        'order_id' => $completedOrder->id,
        'product_id' => $product->id,
        'quantity' => 2,
        'price' => 10000,
        'subtotal' => 20000,
    ]);
    Payment::factory()->completed()->create(['order_id' => $completedOrder->id, 'amount' => 22000]);

    $pendingOrder = Order::factory()->create(['status' => 'pending']);
    Payment::factory()->create(['order_id' => $pendingOrder->id, 'amount' => 11000]);

    $cancelledOrder = Order::factory()->create(['status' => 'cancelled']);
    Payment::factory()->failed()->create(['order_id' => $cancelledOrder->id, 'amount' => 5000]);

    $response = $this->get('/admin/dashboard');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/dashboard/index')
        ->where('stats.total_orders', 3)
        ->where('stats.pending_orders', 1)
        ->where('stats.completed_orders', 1)
        ->where('stats.cancelled_orders', 1)
        // Only the completed payment counts toward revenue.
        ->where('stats.total_revenue', 22000)
        ->where('stats.total_products', 1)
    );
});

test('dashboard ranks top products by quantity sold', function () {
    $this->actingAs(User::factory()->create());

    $popular = Product::factory()->create(['name' => 'Popular Item', 'price' => 5000]);
    $niche = Product::factory()->create(['name' => 'Niche Item', 'price' => 50000]);

    $order = Order::factory()->create();
    OrderItems::factory()->create([
        'order_id' => $order->id,
        'product_id' => $popular->id,
        'quantity' => 10,
        'price' => 5000,
        'subtotal' => 50000,
    ]);
    OrderItems::factory()->create([
        'order_id' => $order->id,
        'product_id' => $niche->id,
        'quantity' => 1,
        'price' => 50000,
        'subtotal' => 50000,
    ]);

    $response = $this->get('/admin/dashboard');

    $response->assertInertia(fn ($page) => $page
        ->where('topProducts.0.name', 'Popular Item')
        ->where('topProducts.0.quantity_sold', 10)
        ->where('topProducts.1.name', 'Niche Item')
    );
});

test('dashboard lists recent orders with their payment total', function () {
    $this->actingAs(User::factory()->create());

    $order = Order::factory()->create(['customer_name' => 'Wati', 'status' => 'completed']);
    Payment::factory()->completed()->create(['order_id' => $order->id, 'amount' => 33000]);

    $response = $this->get('/admin/dashboard');

    $response->assertInertia(fn ($page) => $page
        ->where('recentOrders.0.customer_name', 'Wati')
        ->where('recentOrders.0.total', 33000)
        ->where('recentOrders.0.status', 'completed')
    );
});

test('dashboard handles having no data at all', function () {
    $this->actingAs(User::factory()->create());

    $response = $this->get('/admin/dashboard');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('stats.total_orders', 0)
        ->where('stats.total_revenue', 0)
        ->where('topProducts', [])
        ->where('recentOrders', [])
    );
});

test('category count is unaffected by unrelated data', function () {
    $this->actingAs(User::factory()->create());
    Category::factory()->count(3)->create();

    $response = $this->get('/admin/dashboard');

    $response->assertInertia(fn ($page) => $page->where('stats.total_categories', 3));
});
