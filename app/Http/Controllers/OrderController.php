<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItems;
use App\Models\Payment;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
  /**
   * Display a listing of orders.
   */
  public function index(Request $request)
  {
    try {
      $query = Order::with(['orderItems.product.photos', 'payment'])
        ->orderBy('created_at', 'desc');

      // Filter by status if provided
      if ($request->has('status') && $request->status !== '') {
        $query->where('status', $request->status);
      }

      // Search by customer name or order ID
      if ($request->has('search') && $request->search !== '') {
        $search = $request->search;
        $query->where(function ($q) use ($search) {
          $q->where('customer_name', 'like', "%{$search}%")
            ->orWhere('id', 'like', "%{$search}%");
        });
      }

      $orders = $query->paginate(10)->through(function ($order) {
        return [
          'id' => $order->id,
          'customer_name' => $order->customer_name,
          'customer_phone' => null, // Not stored in database
          'customer_email' => null, // Not stored in database
          'total_amount' => $order->payment->amount ?? 0,
          'status' => $order->status,
          'order_type' => 'admin', // Since these are admin-created orders
          'notes' => null, // Not stored in database
          'created_at' => $order->created_at,
          'order_items' => $order->orderItems->map(function ($item) {
            return [
              'id' => $item->id,
              'product' => [
                'id' => $item->product->id,
                'name' => $item->product->name,
                'photos' => $item->product->photos->map(function ($photo) {
                  return [
                    'id' => $photo->id,
                    'url' => $photo->url
                  ];
                })
              ],
              'quantity' => $item->quantity,
              'price' => $item->price,
              'subtotal' => $item->subtotal
            ];
          }),
          'payment' => [
            'id' => $order->payment->id ?? 0,
            'method' => $order->payment->payment_method ?? 'cash',
            'status' => $order->payment->status ?? 'completed',
            'amount' => $order->payment->amount ?? 0,
            'transaction_id' => $order->payment->transaction_id ?? '',
            'paid_at' => $order->payment->paid_at ?? null
          ]
        ];
      });

      $products = Product::with('photos')->get();

      // Return JSON for AJAX requests (infinite scroll). Inertia visits also
      // set X-Requested-With via axios, so exclude them explicitly or every
      // Inertia navigation to this page would get raw JSON instead of a
      // proper Inertia response.
      if (!$request->header('X-Inertia') && ($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest')) {
        return response()->json([
          'orders' => $orders,
          'products' => $products,
          'filters' => $request->only(['status', 'search'])
        ]);
      }

      return Inertia::render('admin/orders/index', [
        'orders' => $orders,
        'products' => $products,
        'filters' => $request->only(['status', 'search'])
      ]);
    } catch (\Exception $e) {
      dd('Error: ' . $e->getMessage(), $e->getTraceAsString());
    }
  }
  /**
   * Show the form for creating a new order.
   */
  public function create()
  {
    // $products = Product::with('photos')->where('is_active', true)->get();

    // return Inertia::render('admin/orders/create', [
    //   'products' => $products
    // ]);
  }

  /**
   * Store a newly created order in storage.
   */
  public function store(Request $request)
  {
    $request->validate([
      'customer_name' => 'required|string|max:255',
      'table_number' => 'nullable|integer|min:0',
      'status' => 'nullable|in:pending,completed,cancelled',
      'items' => 'required|array|min:1',
      'items.*.product_id' => 'required|exists:products,id',
      'items.*.quantity' => 'required|integer|min:1',
      'payment_method' => 'required|in:cash,digital',
    ]);

    DB::beginTransaction();

    try {
      // Calculate total amount
      $subtotalAmount = 0;
      $validatedItems = [];

      foreach ($request->items as $item) {
        $product = Product::findOrFail($item['product_id']);
        $subtotal = $product->price * $item['quantity'];
        $subtotalAmount += $subtotal;

        $validatedItems[] = [
          'product_id' => $product->id,
          'quantity' => $item['quantity'],
          'price' => $product->price,
          'subtotal' => $subtotal
        ];
      }

      // Add tax
      $taxAmount = $subtotalAmount * config('pos.tax_rate');
      $totalAmount = $subtotalAmount + $taxAmount;

      // Create order
      $order = Order::create([
        'customer_name' => $request->customer_name,
        'table_number' => $request->table_number ?? 0, // Default to 0 for admin orders
        'status' => $request->status ?? 'pending', // Order status from admin input, default pending
      ]);

      // Create order items
      foreach ($validatedItems as $item) {
        OrderItems::create([
          'order_id' => $order->id,
          'product_id' => $item['product_id'],
          'quantity' => $item['quantity'],
          'price' => $item['price'],
          'subtotal' => $item['subtotal'],
        ]);
      }

      // Create payment record
      $payment = Payment::create([
        'order_id' => $order->id,
        'amount' => $totalAmount,
        'payment_method' => $request->payment_method,
        'status' => 'completed', // Admin orders are automatically completed
        'transaction_id' => 'ADMIN-' . time() . '-' . $order->id,
        'paid_at' => now(),
      ]);

      DB::commit();

      // Return JSON response for AJAX requests
      if ($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
        return response()->json([
          'success' => true,
          'message' => 'Order berhasil dibuat!',
          'order_id' => $order->id
        ]);
      }

      // Return Inertia response for regular requests
      return redirect()->route('orders.index')->with('success', 'Order berhasil dibuat!');
    } catch (\Exception $e) {
      DB::rollback();

      // Return JSON error for AJAX requests
      if ($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
        return response()->json([
          'success' => false,
          'message' => 'Gagal membuat order: ' . $e->getMessage(),
          'errors' => ['general' => $e->getMessage()]
        ], 422);
      }

      return redirect()->back()->withErrors(['error' => 'Gagal membuat order: ' . $e->getMessage()]);
    }
  }

  /**
   * Display the specified order.
   */
  public function show(Order $order)
  {
    $order->load(['orderItems.product.photos', 'payment']);

    return Inertia::render('admin/orders/show', [
      'order' => $order,
      'printReceipt' => session('print_receipt', false)
    ]);
  }

  /**
   * Show the form for editing the specified order.
   */
  public function edit(Order $order)
  {
    $order->load(['orderItems.product', 'payment']);
    $products = Product::with('photos')->get();

    return Inertia::render('admin/orders/edit', [
      'order' => $order,
      'products' => $products
    ]);
  }

  /**
   * Update the specified order in storage.
   */
  public function update(Request $request, Order $order)
  {
    $request->validate([
      'customer_name' => 'required|string|max:255',
      'status' => 'required|in:pending,completed,cancelled',
    ]);

    $order->update([
      'customer_name' => $request->customer_name,
      'status' => $request->status,
    ]);

    // Return JSON response for AJAX requests
    if ($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
      return response()->json([
        'success' => true,
        'message' => 'Order berhasil diupdate!',
        'order_id' => $order->id
      ]);
    }

    return redirect()->route('orders.index')
      ->with('success', 'Order berhasil diupdate!');
  }

  /**
   * Remove the specified order from storage.
   */
  public function destroy(Request $request, Order $order)
  {
    // Only allow deletion of cancelled orders
    if ($order->status !== 'cancelled') {
      return back()->withErrors(['error' => 'Hanya order yang dibatalkan yang bisa dihapus.']);
    }

    DB::beginTransaction();

    try {
      // Delete order items
      $order->orderItems()->delete();

      // Delete payment record
      $order->payment()->delete();

      // Delete order
      $order->delete();

      DB::commit();

      // Return JSON response for AJAX requests
      if ($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
        return response()->json([
          'success' => true,
          'message' => 'Order berhasil dihapus!'
        ]);
      }

      return redirect()->route('orders.index')
        ->with('success', 'Order berhasil dihapus!');
    } catch (\Exception $e) {
      DB::rollback();

      // Return JSON error for AJAX requests
      if ($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
        return response()->json([
          'success' => false,
          'message' => 'Gagal menghapus order: ' . $e->getMessage(),
          'errors' => ['general' => $e->getMessage()]
        ], 422);
      }

      return back()->withErrors(['error' => 'Gagal menghapus order: ' . $e->getMessage()]);
    }
  }

  /**
   * Print receipt for the order.
   */
  public function printReceipt(Order $order)
  {
    $order->load(['orderItems.product', 'payment']);

    // Prepare data for print endpoint
    $items = $order->orderItems->map(function ($item) {
      return [
        'name' => $item->product->name,
        'quantity' => $item->quantity,
        'price' => $item->price,
        'subtotal' => $item->subtotal
      ];
    });

    $printData = [
      'customer_name' => $order->customer_name,
      'customer_phone' => $order->customer_phone,
      'items' => $items,
      'total_amount' => $order->total_amount,
      'payment_method' => $order->payment->method,
      'order_date' => $order->created_at->format('d/m/Y H:i'),
      'order_id' => $order->id
    ];

    // Redirect to print endpoint with query parameters
    return redirect()->route('print.index', $printData);
  }

  /**
   * Update order status.
   */
  public function updateStatus(Request $request, Order $order)
  {
    $request->validate([
      'status' => 'required|in:pending,completed,cancelled'
    ]);

    $order->update(['status' => $request->status]);

    return response()->json([
      'success' => true,
      'message' => 'Status order berhasil diupdate!'
    ]);
  }
}
