<?php

use App\Models\Order;
use App\Models\OrderItems;
use App\Models\Product;

test('total price sums the frozen subtotal of each order item', function () {
    $order = Order::factory()->create();
    $productA = Product::factory()->create(['price' => 10000]);
    $productB = Product::factory()->create(['price' => 5000]);

    OrderItems::factory()->create([
        'order_id' => $order->id,
        'product_id' => $productA->id,
        'quantity' => 2,
        'price' => 10000,
        'subtotal' => 20000,
    ]);
    OrderItems::factory()->create([
        'order_id' => $order->id,
        'product_id' => $productB->id,
        'quantity' => 3,
        'price' => 5000,
        'subtotal' => 15000,
    ]);

    expect((float) $order->fresh()->total_price)->toBe(35000.0);
});

test('total price ignores later product price changes', function () {
    $order = Order::factory()->create();
    $product = Product::factory()->create(['price' => 10000]);

    OrderItems::factory()->create([
        'order_id' => $order->id,
        'product_id' => $product->id,
        'quantity' => 1,
        'price' => 10000,
        'subtotal' => 10000,
    ]);

    $product->update(['price' => 99999]);

    expect((float) $order->fresh()->total_price)->toBe(10000.0);
});
