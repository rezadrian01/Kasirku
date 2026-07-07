<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Tax Rate
    |--------------------------------------------------------------------------
    |
    | The tax rate applied to order subtotals, expressed as a decimal
    | (e.g. 0.1 = 10%). Used by checkout, admin order creation, and
    | receipt printing so the rate only needs to change in one place.
    |
    */

    'tax_rate' => (float) env('POS_TAX_RATE', 0.1),

];
