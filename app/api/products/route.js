// app/api/products/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(req) {
  const { searchParams } = new URL(req.url)

  // Fetch products where categoryid is 1 (Electronics) or 2 (Breakfast)
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('categoryid', [1, 2]) // Filter products with categoryid = 1 or 2

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Server error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
