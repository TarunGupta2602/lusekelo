"use client";
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation'

export default function CheckoutPage() {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')  // Redirect to login if not logged in
      } else {
        setUser(user)
      }
    }
    checkUser()
  }, [router])

  if (!user) return <div>Loading...</div>

  return (
    <div>
      <h1>Checkout</h1>
      <p>Welcome to the checkout page, {user.user_metadata.full_name || user.email}!</p>
      {/* Checkout form */}
    </div>
  )
}
