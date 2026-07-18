<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use App\Models\ProductPhotos;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
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
        return Inertia::render('admin/products/index', [
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

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        abort(404, 'Not Found');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Validation
        $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'price' => 'required|numeric|min:0',
            'photos' => 'nullable|array',
            'photos.*' => 'image|max:5120', // 5MB max per image
        ]);

        // Create the product
        $product = Product::create([
            'name' => $request->name,
            'category_id' => $request->category_id,
            'price' => $request->price,
        ]);

        // Handle photo uploads
        if ($request->hasFile('photos')) {
            $photos = $request->file('photos');
            foreach ($photos as $index => $photo) {
                $path = $photo->store('products', 'public');

                ProductPhotos::create([
                    'product_id' => $product->id,
                    'url' => Storage::url($path),
                    'is_primary' => $index === 0, // First photo is primary
                ]);
            }
        }

        return redirect()->route('products.index')->with('success', 'Product created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        abort(404, 'Not Found');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        abort(404, 'Not Found');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $product = Product::findOrFail($id);

        // Validation
        $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'price' => 'required|numeric|min:0',
            'photos' => 'nullable|array',
            'photos.*' => 'image|max:5120', // 5MB max per image
            'remove_photos' => 'nullable|array',
            'remove_photos.*' => 'exists:product_photos,id',
        ]);

        // Update product
        $product->update([
            'name' => $request->name,
            'category_id' => $request->category_id,
            'price' => $request->price,
        ]);

        // Handle photo removal
        if ($request->has('remove_photos')) {
            foreach ($request->remove_photos as $photoId) {
                $photo = ProductPhotos::find($photoId);
                if ($photo && $photo->product_id === $product->id) {
                    // Delete file from storage
                    $urlPath = parse_url($photo->url, PHP_URL_PATH);
                    $filePath = str_replace('/storage/', '', $urlPath);
                    Storage::disk('public')->delete($filePath);

                    // Delete from database
                    $photo->delete();
                }
            }
        }

        // Handle new photo uploads
        if ($request->hasFile('photos')) {
            $photos = $request->file('photos');
            $existingPhotosCount = $product->photos()->count();

            foreach ($photos as $index => $photo) {
                $path = $photo->store('products', 'public');

                ProductPhotos::create([
                    'product_id' => $product->id,
                    'url' => Storage::url($path),
                    'is_primary' => $existingPhotosCount === 0 && $index === 0, // First photo is primary if no existing photos
                ]);
            }
        }

        return redirect()->route('products.index')->with('success', 'Product updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $product = Product::findOrFail($id);

        // Delete all associated photos
        foreach ($product->photos as $photo) {
            // Delete file from storage
            $urlPath = parse_url($photo->url, PHP_URL_PATH);
            $filePath = str_replace('/storage/', '', $urlPath);
            Storage::disk('public')->delete($filePath);
        }

        // Delete product (photos will be deleted by cascade)
        $product->delete();

        return redirect()->route('products.index')->with('success', 'Product deleted successfully.');
    }
}
