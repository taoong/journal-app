import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const OURA_CLIENT_ID = process.env.OURA_CLIENT_ID
const OURA_CLIENT_SECRET = process.env.OURA_CLIENT_SECRET
const OURA_REDIRECT_URI = process.env.OURA_REDIRECT_URI || 'http://localhost:3000/api/oauth/oura/callback'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  // Generate OAuth URL
  const authUrl = new URL('https://cloud.ouraring.com/oauth/authorize')
  authUrl.searchParams.set('client_id', OURA_CLIENT_ID || '')
  authUrl.searchParams.set('redirect_uri', OURA_REDIRECT_URI)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'daily sleep heartrate')
  authUrl.searchParams.set('state', userId)

  return NextResponse.redirect(authUrl.toString())
}
