<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CustomerController extends Controller
{
  public function index(Request $request)
  {
    $query = Product::with(['category', 'photos']);

    // Apply search filter
    if ($request->has('search') && $request->search) {
      $searchTerm = $request->search;
      $query->where(function ($q) use ($searchTerm) {
        $q->where('name', 'like', "%{$searchTerm}%")
          ->orWhereHas('category', function ($q2) use ($searchTerm) {
            $q2->where('name', 'like', "%{$searchTerm}%");
          });
      });
    }

    // Apply category filter
    if ($request->has('category') && $request->category && $request->category !== 'all') {
      $query->where('category_id', $request->category);
    }

    // Paginate results
    $perPage = 12; // Number of products per page
    $products = $query->latest()->paginate($perPage);

    $categories = Category::all();

    // Return JSON for AJAX requests (infinite scroll) - hanya untuk request dengan page parameter.
    // Exclude Inertia visits (X-Inertia header) since axios also sets X-Requested-With.
    if (!$request->header('X-Inertia') && ($request->wantsJson() || $request->ajax()) && $request->has('page') && $request->page > 1) {
      return response()->json([
        'products' => $products->items(),
        'pagination' => [
          'current_page' => $products->currentPage(),
          'last_page' => $products->lastPage(),
          'per_page' => $products->perPage(),
          'total' => $products->total(),
          'has_more_pages' => $products->hasMorePages(),
        ]
      ]);
    }

    // Return Inertia page for initial load and redirects
    return Inertia::render('customer/index', [
      "products" => $products->items(),
      "categories" => $categories,
      "pagination" => [
        'current_page' => $products->currentPage(),
        'last_page' => $products->lastPage(),
        'per_page' => $products->perPage(),
        'total' => $products->total(),
        'has_more_pages' => $products->hasMorePages(),
      ]
    ]);
  }
}
