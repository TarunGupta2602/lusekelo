import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use the service role key for admin actions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { name, email, avatar_base64 } = await req.json();
    let finalAvatarUrl = null;
    // If avatar_base64 is provided, upload to Supabase Storage
    if (avatar_base64) {
      const buffer = Buffer.from(avatar_base64, 'base64');
      const fileExt = 'png';
      const fileName = `avatars/${email.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, buffer, { contentType: 'image/png' });
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        finalAvatarUrl = publicUrlData.publicUrl;
      }
    }
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }
    // 1. Create the user in Supabase Auth (users table)
    const password = Math.random().toString(36).slice(-12) + "A1!aB2@";
    console.log('Generated vendor password:', password);
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, avatar_url: finalAvatarUrl }
    });
    console.log('User creation result:', userData, userError);
    if (userError || !userData || !userData.user) {
      return NextResponse.json({ error: userError?.message || "Unknown error creating user." }, { status: 400 });
    }
    const id = userData.user.id;
    const updated_at = new Date().toISOString();
    // 2. Upsert into profiles with the same id and set role to 'vendor'
    const { error } = await supabase
      .from("profiles")
      .upsert([
        {
          id,
          full_name: name,
          avatar_url: finalAvatarUrl,
          role: "vendor",
          updated_at,
          email
        }
      ], { onConflict: ["id"] });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Return the password in the response for admin use
    return NextResponse.json({ success: true, password });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}