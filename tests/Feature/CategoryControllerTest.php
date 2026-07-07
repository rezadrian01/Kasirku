<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;

test('guests cannot access category management', function () {
    $this->get('/admin/categories')->assertRedirect('/login');
});

test('admin can list categories with product counts', function () {
    $this->actingAs(User::factory()->create());

    $category = Category::factory()->create(['name' => 'Makanan']);
    Product::factory()->count(2)->create(['category_id' => $category->id]);

    $response = $this->get('/admin/categories');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/categories/index')
        ->where('categories.0.products_count', 2)
    );
});

test('admin can create a category', function () {
    $this->actingAs(User::factory()->create());

    $response = $this->post('/admin/categories', ['name' => 'Minuman']);

    $response->assertRedirect(route('categories.index'));
    $this->assertDatabaseHas('categories', ['name' => 'Minuman']);
});

test('category name must be unique', function () {
    $this->actingAs(User::factory()->create());
    Category::factory()->create(['name' => 'Minuman']);

    $response = $this->from('/admin/categories')->post('/admin/categories', ['name' => 'Minuman']);

    $response->assertSessionHasErrors('name');
    $this->assertDatabaseCount('categories', 1);
});

test('admin can update a category', function () {
    $this->actingAs(User::factory()->create());
    $category = Category::factory()->create(['name' => 'Old Name']);

    $response = $this->put("/admin/categories/{$category->id}", ['name' => 'New Name']);

    $response->assertRedirect(route('categories.index'));
    $this->assertDatabaseHas('categories', ['id' => $category->id, 'name' => 'New Name']);
});

test('deleting a category without products succeeds', function () {
    $this->actingAs(User::factory()->create());
    $category = Category::factory()->create();

    $response = $this->delete("/admin/categories/{$category->id}");

    $response->assertRedirect(route('categories.index'));
    $this->assertDatabaseMissing('categories', ['id' => $category->id]);
});

test('deleting a category with products fails', function () {
    $this->actingAs(User::factory()->create());
    $category = Category::factory()->create();
    Product::factory()->create(['category_id' => $category->id]);

    $response = $this->from('/admin/categories')->delete("/admin/categories/{$category->id}");

    $response->assertSessionHasErrors('error');
    $this->assertDatabaseHas('categories', ['id' => $category->id]);
});
