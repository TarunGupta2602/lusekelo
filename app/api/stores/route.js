// app/api/stores/route.js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client with server-side environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
  try {
    const { data, error } = await supabase
      .from('supermarkets')
      .select(`
        id,
        name,
        main_image,
        gallery_images,
        vendor_id,
        address,
        created_at,
        price
      `);
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch stores', details: error.message }, { status: 500 });
    }
    return NextResponse.json(data || [], { status: 200 });
  } catch (err) {
    console.error('Server error in /api/stores:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
} 