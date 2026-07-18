<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('price', 10, 2)->default(0.00)->after('quantity');
            $table->decimal('subtotal', 10, 2)->default(0.00)->after('price');
        });

        // Backfill existing rows so historical orders don't show a $0 total.
        // Uses the product's current price since no per-item price was ever
        // recorded before these columns existed.
        DB::table('order_items')->orderBy('id')->chunkById(200, function ($items) {
            foreach ($items as $item) {
                $product = DB::table('products')->where('id', $item->product_id)->first();

                if (! $product) {
                    continue;
                }

                DB::table('order_items')->where('id', $item->id)->update([
                    'price' => $product->price,
                    'subtotal' => $product->price * $item->quantity,
                ]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['price', 'subtotal']);
        });
    }
};
