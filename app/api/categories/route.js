// app/api/categories/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client setup
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    // 1) fetch all categories
    const { data: allCats, error } = await supabase
      .from('categories')
      .select('id, name, description, image, parent_id')

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    // 2) build a lookup map and give every cat a .children array
    const map = {}
    allCats.forEach((c) => {
      map[c.id] = { ...c, children: [] }
    })

    // 3) assign each category to its parent’s .children
    allCats.forEach((c) => {
      if (c.parent_id !== null) {
        map[c.parent_id]?.children.push(map[c.id])
      }
    })

    // 4) pick out only the root categories (parent_id === null)
    const hierarchy = Object.values(map).filter((c) => c.parent_id === null)

    return NextResponse.json(hierarchy)
  } catch (err) {
    console.error('Server error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
