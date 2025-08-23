import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase with anon key for public access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email, role, business_name, business_logo, tin, bank_account, mobile_money, kyc_documents, kyc_status')
      .eq('role', 'vendor');

    if (error) {
      console.error('Error fetching vendors:', error.message);
      return NextResponse.json({ error: `Failed to fetch vendors: ${error.message}` }, { status: 500 });
    }

    console.log('Fetched vendors:', data);
    return NextResponse.json(data || [], { status: 200 });
  } catch (err) {
    console.error('Unexpected error in /api/vendors:', err.message);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}