export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, phone, message } = body;
    if (!name || !email || !phone) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields." }), { status: 400 });
    }
    // TODO: Store application in database or send email notification
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
} 