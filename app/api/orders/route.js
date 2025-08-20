import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(req.headers.get('authorization')?.split('Bearer ')[1]);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'User not found. Please log in again.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        quantity,
        total_amount,
        payment_id,
        status,
        created_at,
        products!inner(
          name,
          description
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: 'Error fetching order history: ' + error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ orders: data || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Unexpected error: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(req) {
  try {
    const { orderId } = await req.json();
    const { data: { user }, error: userError } = await supabase.auth.getUser(req.headers.get('authorization')?.split('Bearer ')[1]);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'User not found. Please log in again.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
      .eq('user_id', user.id);

    if (error) {
      return new Response(JSON.stringify({ error: 'Error deleting order: ' + error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Order deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Unexpected error: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}