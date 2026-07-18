<?php

use App\Models\Order;
use App\Models\OrderItems;
use App\Models\Product;
use App\Models\User;

test('guests cannot access order management', function () {
    $this->get('/admin/orders')->assertRedirect('/login');
});

test('an Inertia navigation to the orders page gets a real Inertia response, not raw JSON', function () {
    $this->actingAs(User::factory()->create());

    // Mirrors the headers axios/Inertia's client actually sends on a visit,
    // including a matching asset version so the request isn't intercepted
    // as a stale-version conflict before reaching the controller.
    $version = file_exists($manifest = public_path('build/manifest.json'))
        ? hash_file('xxh128', $manifest)
        : null;

    $response = $this->withHeaders([
        'X-Inertia' => 'true',
        'X-Inertia-Version' => $version,
        'X-Requested-With' => 'XMLHttpRequest',
    ])->get('/admin/orders');

    // assertInertia() only understands the full-page-load (view-based) shape,
    // not the XHR/partial-reload response this deliberately exercises — so
    // assert directly on the envelope Inertia's client actually expects.
    $response->assertOk();
    $response->assertHeader('X-Inertia', 'true');
    $response->assertJsonStructure(['component', 'props', 'url', 'version']);
    $response->assertJson(['component' => 'admin/orders/index']);
});

test('order list shows the frozen item price, not the current product price', function () {
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create(['price' => 10000]);
    $order = Order::factory()->create();
    OrderItems::factory()->create([
        'order_id' => $order->id,
        'product_id' => $product->id,
        'quantity' => 2,
        'price' => 10000,
        'subtotal' => 20000,
    ]);

    $product->update(['price' => 99999]);

    $response = $this->get('/admin/orders');

    $response->assertInertia(fn ($page) => $page
        ->where('orders.data.0.order_items.0.price', 10000)
        ->where('orders.data.0.order_items.0.subtotal', 20000)
    );
});

test('admin can create a cash order with correct tax calculation', function () {
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create(['price' => 15000]);

    $response = $this->postJson('/admin/orders', [
        'customer_name' => 'Siti',
        'table_number' => 3,
        'status' => 'completed',
        'payment_method' => 'cash',
        'items' => [
            ['product_id' => $product->id, 'quantity' => 3],
        ],
    ]);

    $response->assertOk();
    $response->assertJson(['success' => true]);

    $order = Order::where('customer_name', 'Siti')->firstOrFail();
    $subtotal = 15000 * 3;
    $expectedTotal = $subtotal + $subtotal * config('pos.tax_rate');

    expect((float) $order->payment->amount)->toBe((float) $expectedTotal);
    expect($order->payment->status)->toBe('completed');
    expect($order->payment->payment_method)->toBe('cash');
    expect($order->orderItems)->toHaveCount(1);
    expect((float) $order->orderItems->first()->subtotal)->toBe((float) $subtotal);
});

test('admin can update order status', function () {
    $this->actingAs(User::factory()->create());
    $order = Order::factory()->create(['status' => 'pending']);

    $response = $this->postJson("/admin/orders/{$order->id}/update-status", ['status' => 'completed']);

    $response->assertOk();
    expect($order->fresh()->status)->toBe('completed');
});

test('only cancelled orders can be deleted', function () {
    $this->actingAs(User::factory()->create());
    $pendingOrder = Order::factory()->create(['status' => 'pending']);

    $response = $this->from('/admin/orders')->delete("/admin/orders/{$pendingOrder->id}");

    $response->assertSessionHasErrors('error');
    $this->assertDatabaseHas('orders', ['id' => $pendingOrder->id]);
});

test('a cancelled order can be deleted', function () {
    $this->actingAs(User::factory()->create());
    $order = Order::factory()->create(['status' => 'cancelled']);

    $response = $this->delete("/admin/orders/{$order->id}");

    $response->assertRedirect(route('orders.index'));
    $this->assertDatabaseMissing('orders', ['id' => $order->id]);
});
