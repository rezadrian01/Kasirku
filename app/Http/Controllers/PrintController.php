<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Mike42\Escpos\Printer;
use Mike42\Escpos\PrintConnectors\FilePrintConnector;

class PrintController extends Controller
{
    public function index(Request $request)
    {
        // Check if request contains items (JSON) or text (query parameter)
        if ($request->has('items')) {
            $items = $request->input('items');
            $paid = $request->input('paid', 0); // Get paid amount, default to 0

            // Validate items
            if (empty($items) || !is_array($items)) {
                return response()->json(['error' => 'Items array is required'], 400);
            }

            // Validate paid amount
            if ($paid <= 0) {
                return response()->json(['error' => 'Paid amount is required and must be greater than 0'], 400);
            }

            // Format items to text with payment info
            $formattedText = $this->formatItemsToText($items, $paid);
            $result = $this->printReceipt($formattedText);
        } else {
            // Fallback to old method (text parameter)
            $text = $request->query('text') ?? $request->get('text');

            // Validate if text is empty
            if (empty($text)) {
                return response()->json(['error' => 'Text parameter or items array is required'], 400);
            }

            $result = $this->printReceipt($text);
        }

        if ($result['success']) {
            return response()->json(['message' => 'Print job initiated'], 200);
        } else {
            return response()->json(['error' => $result['message']], 500);
        }
    }

    private function formatItemsToText($items, $paid = 0)
    {
        $formattedText = "";
        $subtotal = 0;

        // Format each item
        foreach ($items as $item) {
            $name = $item['name'] ?? '';
            $quantity = $item['quantity'] ?? 1;
            $price = $item['price'] ?? 0;
            $totalPrice = $quantity * $price;

            // Add to subtotal
            $subtotal += $totalPrice;

            // Format: Item Name (qty) | Total Price
            $itemLine = $name . " (" . $quantity . "x)";
            $priceFormatted = "Rp " . number_format($totalPrice, 0, ',', '.');

            $formattedText .= $itemLine . "|" . $priceFormatted . "\n";
        }

        // Calculate tax
        $taxRate = config('pos.tax_rate');
        $tax = $subtotal * $taxRate;
        $total = $subtotal + $tax;

        // Add summary to text
        $formattedText .= "SUMMARY\n";
        $formattedText .= "Subtotal|Rp " . number_format($subtotal, 0, ',', '.') . "\n";
        $formattedText .= "Pajak (" . ($taxRate * 100) . "%)|Rp " . number_format($tax, 0, ',', '.') . "\n";
        $formattedText .= "TOTAL|Rp " . number_format($total, 0, ',', '.') . "\n";

        // Add payment info if provided
        if ($paid > 0) {
            $change = $paid - $total;
            $formattedText .= "PAYMENT\n";
            $formattedText .= "Bayar|Rp " . number_format($paid, 0, ',', '.') . "\n";
            $formattedText .= "Kembali|Rp " . number_format($change, 0, ',', '.') . "\n";
        }

        return $formattedText;
    }

    private function printReceipt($text)
    {
        try {
            $connector = new FilePrintConnector("/dev/usb/lp0");
            $printer = new Printer($connector);

            // Header
            $this->printHeader($printer);

            // Content (text dari parameter)
            $this->printContent($printer, $text);

            // Footer
            $this->printFooter($printer);

            $printer->cut();
            $printer->close();

            return [
                'success' => true,
                'message' => 'Printed successfully'
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    private function printHeader($printer)
    {
        // Logo or brand name
        $printer->setJustification(Printer::JUSTIFY_CENTER);
        $printer->selectPrintMode(Printer::MODE_DOUBLE_WIDTH | Printer::MODE_DOUBLE_HEIGHT);
        $printer->text("KASIRKU\n");
        $printer->selectPrintMode();

        // Tagline
        $printer->text("Point of Sale System\n");
        $printer->text("================================\n");

        // Store info
        $printer->setJustification(Printer::JUSTIFY_LEFT);
        $printer->text("Alamat: Jl. Contoh No. 123\n");
        $printer->text("Telp: (021) 1234-5678\n");
        $printer->text("Email: info@kasirku.com\n");

        $printer->setJustification(Printer::JUSTIFY_CENTER);
        $printer->text("================================\n");

        // Date and time with Indonesia timezone
        $printer->setJustification(Printer::JUSTIFY_LEFT);
        $datetime = new \DateTime('now', new \DateTimeZone('Asia/Jakarta'));
        $printer->text("Tanggal: " . $datetime->format('d/m/Y H:i:s') . " WIB\n");
        $printer->text("Kasir: Admin\n");
        $printer->text("--------------------------------\n\n");
    }

    private function printContent($printer, $text)
    {
        // Content area
        $printer->setJustification(Printer::JUSTIFY_CENTER);
        $printer->selectPrintMode(Printer::MODE_EMPHASIZED);
        $printer->text("DETAIL TRANSAKSI\n");
        $printer->selectPrintMode();
        $printer->text("--------------------------------\n");

        // Main content from parameter with proper formatting
        $printer->setJustification(Printer::JUSTIFY_LEFT);

        // Parse items with separator |
        $lines = explode("\n", $text);
        $summaryStarted = false;
        $paymentStarted = false;

        foreach ($lines as $lineIndex => $line) {
            $line = trim($line);
            if (empty($line)) continue;

            // Check if summary section starts
            if ($line === "SUMMARY") {
                $summaryStarted = true;
                $printer->text("--------------------------------\n");
                continue;
            }

            // Check if payment section starts
            if ($line === "PAYMENT") {
                $paymentStarted = true;
                $printer->text("--------------------------------\n");
                continue;
            }

            if (strpos($line, '|') !== false) {
                $parts = explode('|', $line);
                $leftSide = trim($parts[0]);
                $rightSide = trim($parts[1]);

                // If in summary section and item is TOTAL, make it bold
                if ($summaryStarted && strpos($leftSide, 'TOTAL') !== false) {
                    $printer->selectPrintMode(Printer::MODE_EMPHASIZED);
                    $this->printFormattedLine($printer, $leftSide . ":", $rightSide);
                    $printer->selectPrintMode();
                } else {
                    $this->printFormattedLine($printer, $leftSide . ":", $rightSide);
                }
            } else {
                $printer->text($line . "\n");
            }
        }

        // Only show static payment info if no dynamic payment data was provided
        if (!$paymentStarted) {
            $printer->text("--------------------------------\n");
            $this->printFormattedLine($printer, "Bayar:", "Rp  30,000");
            $this->printFormattedLine($printer, "Kembali:", "Rp   2,500");
        }

        $printer->text("--------------------------------\n\n");
    }

    private function printFooter($printer)
    {
        // Thank you message
        $printer->setJustification(Printer::JUSTIFY_CENTER);
        $printer->text("Terima kasih atas kunjungan Anda\n");
        $printer->text("Barang yang sudah dibeli\n");
        $printer->text("tidak dapat dikembalikan\n\n");

        // QR Code atau info tambahan
        $printer->text("Follow us:\n");
        $printer->text("@kasirku_official\n");
        $printer->text("www.kasirku.com\n\n");

        // Separator
        $printer->text("================================\n");
        $printer->text("Powered by KASIRKU POS v1.0\n");
        $printer->text("================================\n\n");
    }

    private function printFormattedLine($printer, $item, $price, $width = 32)
    {
        $priceLength = strlen($price);
        $maxItemLength = $width - $priceLength - 1; // 1 space minimum

        // If item name fits in one line
        if (strlen($item) <= $maxItemLength) {
            $spacesNeeded = $width - strlen($item) - $priceLength;
            if ($spacesNeeded < 1) $spacesNeeded = 1;

            $printer->text($item . str_repeat(' ', $spacesNeeded) . $price . "\n");
        } else {
            // Item name is too long, wrap to multiple lines
            $words = explode(' ', $item);
            $currentLine = '';
            $lines = [];

            foreach ($words as $word) {
                if (strlen($currentLine . ' ' . $word) <= $maxItemLength) {
                    $currentLine .= ($currentLine ? ' ' : '') . $word;
                } else {
                    if ($currentLine) {
                        $lines[] = $currentLine;
                        $currentLine = $word;
                    } else {
                        // Single word is too long, truncate it
                        $lines[] = substr($word, 0, $maxItemLength - 3) . '...';
                        $currentLine = '';
                    }
                }
            }
            if ($currentLine) {
                $lines[] = $currentLine;
            }

            // Print all lines except the last one (without price)
            for ($i = 0; $i < count($lines) - 1; $i++) {
                $printer->text($lines[$i] . "\n");
            }

            // Print last line with price aligned to the right
            $lastLine = $lines[count($lines) - 1];
            $spacesNeeded = $width - strlen($lastLine) - $priceLength;
            if ($spacesNeeded < 1) $spacesNeeded = 1;

            $printer->text($lastLine . str_repeat(' ', $spacesNeeded) . $price . "\n");
        }
    }

    private function formatMenuItem($item, $price, $width = 32)
    {
        $itemLength = strlen($item);
        $priceLength = strlen($price);
        $spacesNeeded = $width - $itemLength - $priceLength;

        // Ensure minimum 1 space
        if ($spacesNeeded < 1) {
            $spacesNeeded = 1;
        }

        return $item . str_repeat(' ', $spacesNeeded) . $price;
    }
}
