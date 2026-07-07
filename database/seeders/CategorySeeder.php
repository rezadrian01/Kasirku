<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (['Makanan', 'Minuman', 'Snack', 'Dessert'] as $name) {
            Category::firstOrCreate(['name' => $name]);
        }
    }
}
