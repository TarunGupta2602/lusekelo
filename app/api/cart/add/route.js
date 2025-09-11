// app/api/cart/add/route.js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, product_id, quantity, name, price, image, variation, supermarket_id } = body;

    if (!product_id || !quantity || !name || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newItem = {
      itemId,
      product_id,
      quantity,
      name,
      price,
      image,
      variation: variation || null,
      supermarket_id,
    };

    // Fetch existing cart
    const { data: existingCartData, error: fetchError } = await supabase
      .from('carts')
      .select('store_carts')
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching cart:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
    }

    let cart = existingCartData?.store_carts || [];

    // Check for existing item
    const existingItemIndex = cart.findIndex((item) => item.itemId === itemId);
    if (existingItemIndex !== -1) {
      cart[existingItemIndex].quantity += quantity;
    } else {
      cart.push(newItem);
    }

    // Upsert cart
    const { error: upsertError } = await supabase
      .from('carts')
      .upsert(
        {
          user_id: user.id,
          store_carts: cart,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      console.error('Error updating cart:', upsertError);
      return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Product added to cart!' });
  } catch (err) {
    console.error('Error in add to cart API:', err);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}