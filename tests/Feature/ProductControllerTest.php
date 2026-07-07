<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductPhotos;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('guests cannot access product management', function () {
    $this->get('/admin/products')->assertRedirect('/login');
});

test('admin can list products with category and photos', function () {
    $this->actingAs(User::factory()->create());

    $category = Category::factory()->create();
    Product::factory()->count(3)->create(['category_id' => $category->id]);

    $response = $this->get('/admin/products');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/products/index')
        ->has('products', 3)
    );
});

test('product search filters by name', function () {
    $this->actingAs(User::factory()->create());

    Product::factory()->create(['name' => 'Nasi Goreng']);
    Product::factory()->create(['name' => 'Es Teh']);

    $response = $this->get('/admin/products?search=Nasi');

    $response->assertInertia(fn ($page) => $page
        ->has('products', 1)
        ->where('products.0.name', 'Nasi Goreng')
    );
});

test('admin can create a product with a photo', function () {
    Storage::fake('public');
    $this->actingAs(User::factory()->create());
    $category = Category::factory()->create();

    $response = $this->post('/admin/products', [
        'name' => 'Ayam Geprek',
        'category_id' => $category->id,
        'price' => 22000,
        'photos' => [UploadedFile::fake()->create('food.jpg', 100, 'image/jpeg')],
    ]);

    $response->assertRedirect(route('products.index'));
    $this->assertDatabaseHas('products', ['name' => 'Ayam Geprek', 'price' => 22000]);

    $product = Product::where('name', 'Ayam Geprek')->firstOrFail();
    expect($product->photos)->toHaveCount(1);
    expect($product->photos->first()->is_primary)->toBeTrue();
});

test('admin can remove a product photo on update', function () {
    Storage::fake('public');
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create();
    $photo = ProductPhotos::factory()->create(['product_id' => $product->id, 'url' => Storage::url('products/existing.jpg')]);
    Storage::disk('public')->put('products/existing.jpg', 'fake-content');

    $response = $this->put("/admin/products/{$product->id}", [
        'name' => $product->name,
        'category_id' => $product->category_id,
        'price' => $product->price,
        'remove_photos' => [$photo->id],
    ]);

    $response->assertRedirect(route('products.index'));
    $this->assertDatabaseMissing('product_photos', ['id' => $photo->id]);
});

test('admin can delete a product', function () {
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create();

    $response = $this->delete("/admin/products/{$product->id}");

    $response->assertRedirect(route('products.index'));
    $this->assertDatabaseMissing('products', ['id' => $product->id]);
});
