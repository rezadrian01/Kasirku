<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderItems;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderItems>
 */
class OrderItemsFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'product_id' => Product::factory(),
            'quantity' => fake()->numberBetween(1, 5),
            'notes' => null,
            'price' => 0,
            'subtotal' => 0,
        ];
    }

    /**
     * Derive price/subtotal from the linked product once it's resolved.
     * afterMaking runs before create()'s initial insert, so the row is
     * persisted with the correct values without a second UPDATE query.
     */
    public function configure(): static
    {
        return $this->afterMaking(function (OrderItems $orderItem) {
            $orderItem->price = $orderItem->product->price;
            $orderItem->subtotal = $orderItem->price * $orderItem->quantity;
        });
    }
}
