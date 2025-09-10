
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Supported currencies
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'];
const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};

// Mock cache (in production, use Redis or Supabase table)
let exchangeRateCache = {};
let lastCacheUpdate = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

async function getExchangeRates(currency) {
  if (!SUPPORTED_CURRENCIES.includes(currency.toUpperCase())) {
    return { rate: 1, symbol: CURRENCY_SYMBOLS['USD'] };
  }

  const now = Date.now();
  if (
    exchangeRateCache[currency] &&
    lastCacheUpdate &&
    now - lastCacheUpdate < CACHE_TTL
  ) {
    return {
      rate: exchangeRateCache[currency],
      symbol: CURRENCY_SYMBOLS[currency.toUpperCase()],
    };
  }

  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }
    const rateData = await response.json();
    const rate = rateData.rates[currency.toUpperCase()] || 1;
    exchangeRateCache[currency] = rate;
    lastCacheUpdate = now;
    return { rate, symbol: CURRENCY_SYMBOLS[currency.toUpperCase()] };
  } catch (error) {
    console.error('Currency conversion error:', error);
    return { rate: 1, symbol: CURRENCY_SYMBOLS['USD'] }; // Fallback to USD
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const currency = (searchParams.get('currency') || 'USD').toUpperCase();

    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      return NextResponse.json(
        { error: `Unsupported currency: ${currency}. Supported: ${SUPPORTED_CURRENCIES.join(', ')}` },
        { status: 400 }
      );
    }

    const { rate, symbol } = await getExchangeRates(currency);
    return NextResponse.json({ rate, symbol });
  } catch (error) {
    console.error('Error fetching exchange rate:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate', details: error.message },
      { status: 500 }
    );
  }
}
