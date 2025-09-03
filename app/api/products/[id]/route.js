
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

      if (!relatedError) {
        relatedProducts = (relatedData || []).map((rp) => {
          const rpReviews = rp.product_reviews || [];
          const rpAverageRating =
            rpReviews.length > 0
              ? (rpReviews.reduce((sum, review) => sum + review.rating, 0) / rpReviews.length).toFixed(1)
              : 0;
          return {
            ...rp,
            averageRating: parseFloat(rpAverageRating),
            reviewCount: rpReviews.length,
          };
        });
      }
    }

    return NextResponse.json({ product, relatedProducts });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}