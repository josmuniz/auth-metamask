import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import clientPromise from '@/lib/db'

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      { error: 'Valid Ethereum address required' },
      { status: 400 }
    )
  }

  const nonce = nanoid()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 min TTL

  const client = await clientPromise
  const db = client.db('auth_db')

  await db.collection('nonces').updateOne(
    { address: address.toLowerCase() },
    { $set: { nonce, expiresAt, createdAt: new Date() } },
    { upsert: true }
  )

  const message = `Sign this message to authenticate with our app.\n\nNonce: ${nonce}`

  return NextResponse.json({ nonce, message })
}
