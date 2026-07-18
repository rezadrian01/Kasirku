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
            'status' => 'pending',
            'payment_method' => fake()->randomElement(['cash', 'midtrans']),
            'transaction_id' => 'TEST-'.fake()->unique()->numerify('##########'),
            'paid_at' => null,
            'notes' => null,
        ];
    }

    /**
     * A payment that has actually been paid.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'paid_at' => now(),
        ]);
    }

    /**
     * A payment that failed or was cancelled.
     */
    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'failed',
            'paid_at' => null,
        ]);
    }
}
