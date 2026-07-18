<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PrintController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

Route::get('/', [CustomerController::class, 'index'])->name('home');

// Checkout routes
Route::prefix('checkout')->group(function () {
    Route::get('/', [CheckoutController::class, 'index'])->name('checkout.index');
    Route::post('/process', [CheckoutController::class, 'processCheckout'])->name('checkout.process');
    Route::get('/finish', [CheckoutController::class, 'paymentFinish'])->name('checkout.finish');
    Route::get('/unfinish', [CheckoutController::class, 'paymentUnfinish'])->name('checkout.unfinish');
    Route::get('/error', [CheckoutController::class, 'paymentError'])->name('checkout.error');
    Route::post('/notification', [CheckoutController::class, 'paymentNotification'])->name('checkout.notification');
});

// Order routes
Route::prefix('order')->group(function () {
    Route::get('/{orderId}/status', [CheckoutController::class, 'orderStatus'])->name('order.status');
    Route::get('/{orderId}/check', [CheckoutController::class, 'checkOrderStatus'])->name('order.check');
});

Route::prefix('admin')->middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('admin.dashboard');

    Route::post('print', [PrintController::class, 'index'])->name('print.index');

    // Resource route for CategoryController
    Route::resource('categories', CategoryController::class);

    // Resource route for ProductController
    Route::resource('products', ProductController::class);

    // Order routes (using modals, so only need index, store, update, destroy)
    Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
    Route::post('orders', [OrderController::class, 'store'])->name('orders.store');
    Route::put('orders/{order}', [OrderController::class, 'update'])->name('orders.update');
    Route::delete('orders/{order}', [OrderController::class, 'destroy'])->name('orders.destroy');
    Route::post('orders/{order}/update-status', [OrderController::class, 'updateStatus'])->name('orders.update-status');
    Route::get('orders/{order}/print', [OrderController::class, 'printReceipt'])->name('orders.print');
});
require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
