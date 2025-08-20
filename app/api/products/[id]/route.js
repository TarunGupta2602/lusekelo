import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request, { params }) {
  try {
    // Await the params before destructuring
    const awaitedParams = await params;
    const { id } = awaitedParams;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price, image, description, quantity, categoryid, sku, variations, supermarket_id')
      .eq('id', id)
      .single();

    if (productError) {
      console.error('Supabase error:', productError);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Fetch related products
    let relatedProducts = [];
    if (product.categoryid) {
      const { data: relatedData, error: relatedError } = await supabase
        .from('products')
        .select('id, name, price, image, description')
        .eq('categoryid', product.categoryid)
        .neq('id', id)
        .limit(10);

      if (!relatedError) {
        relatedProducts = relatedData || [];
      }
    }

    return NextResponse.json({ product, relatedProducts });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}