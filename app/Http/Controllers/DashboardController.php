<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItems;
use App\Models\Payment;
use App\Models\Product;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $ordersByStatus = Order::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $statusCounts = [
            'pending' => (int) ($ordersByStatus['pending'] ?? 0),
            'completed' => (int) ($ordersByStatus['completed'] ?? 0),
            'cancelled' => (int) ($ordersByStatus['cancelled'] ?? 0),
        ];

        $topProducts = OrderItems::selectRaw('product_id, SUM(quantity) as total_quantity, SUM(subtotal) as total_revenue')
            ->groupBy('product_id')
            ->orderByDesc('total_quantity')
            ->with('product:id,name')
            ->limit(5)
            ->get()
            ->filter(fn ($item) => $item->product !== null)
            ->map(fn ($item) => [
                'id' => $item->product_id,
                'name' => $item->product->name,
                'quantity_sold' => (int) $item->total_quantity,
                'revenue' => (float) $item->total_revenue,
            ])
            ->values();

        $recentOrders = Order::with('payment')
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (Order $order) => [
                'id' => $order->id,
                'customer_name' => $order->customer_name,
                'status' => $order->status,
                'total' => (float) ($order->payment->amount ?? 0),
                'created_at' => $order->created_at,
            ]);

        $revenueTrend = collect(range(13, 0))
            ->map(function (int $daysAgo) {
                $date = today()->subDays($daysAgo);

                return [
                    'date' => $date->toDateString(),
                    'revenue' => (float) Payment::where('status', 'completed')
                        ->whereDate('paid_at', $date)
                        ->sum('amount'),
                ];
            })
            ->values();

        $ordersByStatusChart = [
            ['status' => 'pending', 'label' => 'Pending', 'count' => $statusCounts['pending']],
            ['status' => 'completed', 'label' => 'Completed', 'count' => $statusCounts['completed']],
            ['status' => 'cancelled', 'label' => 'Cancelled', 'count' => $statusCounts['cancelled']],
        ];

        return Inertia::render('admin/dashboard/index', [
            'stats' => [
                'total_revenue' => (float) Payment::where('status', 'completed')->sum('amount'),
                'total_orders' => array_sum($statusCounts),
                'pending_orders' => $statusCounts['pending'],
                'completed_orders' => $statusCounts['completed'],
                'cancelled_orders' => $statusCounts['cancelled'],
                'today_orders' => Order::whereDate('created_at', today())->count(),
                'today_revenue' => (float) Payment::where('status', 'completed')
                    ->whereDate('paid_at', today())
                    ->sum('amount'),
                'total_products' => Product::count(),
                'total_categories' => Category::count(),
            ],
            'topProducts' => $topProducts,
            'recentOrders' => $recentOrders,
            'revenueTrend' => $revenueTrend,
            'ordersByStatus' => $ordersByStatusChart,
        ]);
    }
}
