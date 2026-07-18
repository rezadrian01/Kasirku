<?php

use App\Http\Controllers\CheckoutController;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Services\MidtransService;

function fakeMidtransService(string $token = 'fake-snap-token'): void
{
    $mock = Mockery::mock(MidtransService::class);
    $mock->shouldReceive('createSnapToken')->andReturn($token);
    app()->instance(MidtransService::class, $mock);
}

test('checkout requires customer name, table number and cart', function () {
    fakeMidtransService();

    $response = $this->postJson('/checkout/process', []);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['customer_name', 'table_number', 'cart']);
});

test('checkout creates order, order items and a pending payment', function () {
    fakeMidtransService('snap-token-123');

    $product = Product::factory()->create(['price' => 20000]);

    $response = $this->postJson('/checkout/process', [
        'customer_name' => 'Budi',
        'table_number' => 5,
        'cart' => [
            ['product' => ['id' => $product->id], 'quantity' => 2, 'notes' => 'Pedas'],
        ],
    ]);

    $response->assertOk();
    $response->assertJsonStructure(['snap_token', 'order_id', 'payment_id']);
    $response->assertJson(['snap_token' => 'snap-token-123']);

    $order = Order::findOrFail($response->json('order_id'));
    expect($order->customer_name)->toBe('Budi');
    expect($order->table_number)->toBe(5);
    expect($order->status)->toBe('pending');

    $item = $order->orderItems->first();
    expect($item->quantity)->toBe(2);
    expect((float) $item->price)->toBe(20000.0);
    expect((float) $item->subtotal)->toBe(40000.0);

    $expectedTax = 40000 * config('pos.tax_rate');
    $payment = $order->payment;
    expect($payment->status)->toBe('pending');
    expect((float) $payment->amount)->toBe(40000 + $expectedTax);
});

test('checkout rounds fractional tax to whole IDR instead of truncating', function () {
    fakeMidtransService();

    // 33333 * 0.1 = 3333.3 — truncating (int) would give 3333, losing 0.3.
    $product = Product::factory()->create(['price' => 33333]);

    $response = $this->postJson('/checkout/process', [
        'customer_name' => 'Wati',
        'table_number' => 1,
        'cart' => [
            ['product' => ['id' => $product->id], 'quantity' => 1],
        ],
    ]);

    $response->assertOk();

    $order = Order::findOrFail($response->json('order_id'));
    $expectedTax = round(33333 * config('pos.tax_rate'));

    expect((float) $order->payment->amount)->toBe(33333 + $expectedTax);
});

test('midtrans settlement status marks payment completed and order pending', function () {
    fakeMidtransService();
    $order = Order::factory()->create(['status' => 'pending']);
    $payment = Payment::factory()->create([
        'order_id' => $order->id,
        'status' => 'pending',
        'transaction_id' => 'KASIR-TEST-1',
    ]);

    app(CheckoutController::class)
        ->applyTransactionStatus('settlement', 'bank_transfer', 'KASIR-TEST-1', null);

    expect($payment->fresh()->status)->toBe('completed');
    expect($payment->fresh()->paid_at)->not->toBeNull();
    expect($order->fresh()->status)->toBe('pending');
});

test('midtrans expire status marks payment failed and cancels the order', function () {
    fakeMidtransService();
    $order = Order::factory()->create(['status' => 'pending']);
    $payment = Payment::factory()->create([
        'order_id' => $order->id,
        'status' => 'pending',
        'transaction_id' => 'KASIR-TEST-2',
    ]);

    app(CheckoutController::class)
        ->applyTransactionStatus('expire', 'bank_transfer', 'KASIR-TEST-2', null);

    expect($payment->fresh()->status)->toBe('failed');
    expect($order->fresh()->status)->toBe('cancelled');
});
