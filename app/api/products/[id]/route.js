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

  // Check cache
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

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const currency = (searchParams.get('currency') || 'USD').toUpperCase();

    // Validate currency
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      return NextResponse.json(
        { error: `Unsupported currency: ${currency}. Supported: ${SUPPORTED_CURRENCIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Await the params before destructuring
    const awaitedParams = await params;
    const { id } = awaitedParams;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Fetch product with reviews
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        image,
        description,
        quantity,
        categoryid,
        sku,
        variations,
        supermarket_id,
        product_reviews (
          id,
          rating,
          feedback,
          created_at,
          user_id
        )
      `)
      .eq('id', id)
      .eq('approval_status', 'approved')
      .single();

    if (productError || !productData) {
      console.error('Supabase error:', productError);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get exchange rate and symbol
    const { rate: conversionRate, symbol } = await getExchangeRates(currency);

    // Convert main product price
    const originalMainPrice = parseFloat(productData.price);
    if (isNaN(originalMainPrice)) {
      return NextResponse.json({ error: 'Invalid product price' }, { status: 500 });
    }
    productData.price = originalMainPrice * conversionRate;
    productData.original_price = originalMainPrice;
    productData.currency = currency;
    productData.currency_symbol = symbol;

    // Convert variations prices if present
    if (productData.variations) {
      productData.variations = productData.variations.map((v) => {
        const originalVPrice = parseFloat(v.price);
        if (isNaN(originalVPrice)) {
          console.warn(`Invalid price for variation in product ${id}`);
          return v;
        }
        return {
          ...v,
          price: originalVPrice * conversionRate,
          original_price: originalVPrice,
          currency,
          currency_symbol: symbol,
        };
      });
    }

    // Calculate average rating for product
    const reviews = productData.product_reviews || [];
    const averageRating =
      reviews.length > 0
        ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
        : 0;
    const reviewCount = reviews.length;

    const product = {
      ...productData,
      averageRating: parseFloat(averageRating),
      reviewCount,
      reviews,
    };

    // Fetch related products with reviews
    let relatedProducts = [];
    if (product.categoryid) {
      const { data: relatedData, error: relatedError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          image,
          description,
          quantity,
          product_reviews (rating)
        `)
        .eq('categoryid', product.categoryid)
        .neq('id', id)
        .eq('approval_status', 'approved')
        .limit(10);

      if (!relatedError && relatedData) {
        relatedProducts = relatedData.map((rp) => {
          const originalRpPrice = parseFloat(rp.price);
          if (isNaN(originalRpPrice)) {
            console.warn(`Invalid price for related product ${rp.id}`);
            return rp;
          }
          const convertedRpPrice = originalRpPrice * conversionRate;
          const rpWithPrices = {
            ...rp,
            price: convertedRpPrice,
            original_price: originalRpPrice,
            currency,
            currency_symbol: symbol,
          };
          const rpReviews = rpWithPrices.product_reviews || [];
          const rpAverageRating =
            rpReviews.length > 0
              ? (rpReviews.reduce((sum, review) => sum + review.rating, 0) / rpReviews.length).toFixed(1)
              : 0;
          return {
            ...rpWithPrices,
            averageRating: parseFloat(rpAverageRating),
            reviewCount: rpReviews.length,
          };
        });
      } else if (relatedError) {
        console.error('Error fetching related products:', relatedError);
      }
    }

    return NextResponse.json({ product, relatedProducts });
  } catch (error) {
    console.error('Error fetching product:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch product data', details: error.message },
      { status: 500 }
    );
  }
}