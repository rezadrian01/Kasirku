<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
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
            'amount' => fake()->numberBetween(10000, 500000),
            'status' => fake()->randomElement(['pending', 'completed', 'failed']),
            'payment_method' => fake()->randomElement(['cash', 'midtrans']),
            'transaction_id' => 'TEST-'.fake()->unique()->numerify('##########'),
            'paid_at' => now(),
            'notes' => null,
        ];
    }
}
