import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service_role key to bypass RLS for updates
);

export async function POST(req) {
  try {
    const { id } = await req.json();
    const authHeader = req.headers.get('authorization');
    console.log('Approve KYC called for vendor id:', id, 'Auth header:', !!authHeader);

    if (!id) {
      console.error('Missing vendor id');
      return NextResponse.json({ error: 'Missing vendor ID' }, { status: 400 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Authenticate user with the provided token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('User authentication failed:', userError?.message);
      return NextResponse.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 });
    }

    // Verify the user is an admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || profile?.role !== 'admin') {
      console.error('Admin role check failed:', profileError?.message || 'User is not an admin');
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Check if the vendor exists before updating
    const { data: vendor, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError || !vendor) {
      console.error('Vendor not found:', fetchError?.message);
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Perform the update
    const { data, error } = await supabase
      .from('profiles')
      .update({ kyc_status: 'approved' })
      .eq('id', id)
      .select();
    console.log('Supabase update result:', { data, error });

    if (error) {
      console.error('Supabase update error:', error.message);
      return NextResponse.json({ error: `Failed to update KYC status: ${error.message}` }, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.warn('No rows updated for vendor id:', id);
      return NextResponse.json({ error: 'No vendor updated' }, { status: 404 });
    }

    return NextResponse.json({ success: true, updated: data }, { status: 200 });
  } catch (err) {
    console.error('Unexpected server error:', err);
    return NextResponse.json({ error: `Unexpected server error: ${err.message}` }, { status: 500 });
  }
}