<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductPhotos;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $menu = [
            'Makanan' => [
                ['name' => 'Nasi Goreng Spesial', 'price' => 25000],
                ['name' => 'Mie Ayam Bakso', 'price' => 20000],
                ['name' => 'Ayam Geprek', 'price' => 22000],
            ],
            'Minuman' => [
                ['name' => 'Es Teh Manis', 'price' => 5000],
                ['name' => 'Es Jeruk', 'price' => 7000],
                ['name' => 'Kopi Susu', 'price' => 12000],
            ],
            'Snack' => [
                ['name' => 'Kentang Goreng', 'price' => 15000],
                ['name' => 'Tahu Crispy', 'price' => 10000],
            ],
            'Dessert' => [
                ['name' => 'Es Krim Coklat', 'price' => 13000],
                ['name' => 'Pudding Karamel', 'price' => 11000],
            ],
        ];

        foreach ($menu as $categoryName => $products) {
            $category = Category::where('name', $categoryName)->first();

            if (! $category) {
                continue;
            }

            foreach ($products as $productData) {
                $product = Product::firstOrCreate(
                    ['name' => $productData['name']],
                    ['category_id' => $category->id, 'price' => $productData['price']],
                );

                if ($product->photos()->doesntExist()) {
                    ProductPhotos::create([
                        'product_id' => $product->id,
                        'url' => 'https://picsum.photos/seed/'.urlencode($product->id).'/640/480',
                        'is_primary' => true,
                    ]);
                }
            }
        }
    }
}
