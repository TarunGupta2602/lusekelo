
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mock exchange rates (replace with actual API call or database in production)
const exchangeRates = {
  USD: { rate: 1, symbol: '$' },
  EUR: { rate: 0.90, symbol: '€' },
  GBP: { rate: 0.76, symbol: '£' },
  INR: { rate: 83.50, symbol: '₹' },
};

async function getExchangeRates(currency) {
  if (!exchangeRates[currency]) {
    throw new Error('Unsupported currency');
  }
  return exchangeRates[currency];
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const currency = searchParams.get('currency') || 'USD';

  try {
    // Fetch products where categoryid is 1 (Electronics) or 2 (Breakfast)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('categoryid', [1, 2]);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // Get exchange rate for the requested currency
    const { rate, symbol } = await getExchangeRates(currency);

    // Convert prices to the requested currency
    const convertedProducts = data.map(product => ({
      ...product,
      price: product.price * rate, // Keep as number
      currency,
      symbol,
    }));

    return NextResponse.json(convertedProducts);
  } catch (err) {
    console.error('Server error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
