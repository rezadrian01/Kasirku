<?php

namespace Database\Factories;

use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'table_number' => fake()->numberBetween(1, 20),
            'status' => fake()->randomElement(['pending', 'completed', 'cancelled']),
            'customer_name' => fake()->name(),
        ];
    }
}
