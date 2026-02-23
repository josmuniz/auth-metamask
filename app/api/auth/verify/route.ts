import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage } from 'viem'
import clientPromise from '@/lib/db'
import { signToken } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  let body: { address?: string; signature?: string; nonce?: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { address, signature, nonce } = body

  if (!address || !signature || !nonce) {
    return NextResponse.json(
      { error: 'address, signature and nonce are required' },
      { status: 400 }
    )
  }

  const client = await clientPromise
  const db = client.db('auth_db')

  // Fetch and validate nonce — must exist and not be expired
  const storedNonce = await db.collection('nonces').findOne({
    address: address.toLowerCase(),
    nonce,
    expiresAt: { $gt: new Date() },
  })

  if (!storedNonce) {
    return NextResponse.json(
      { error: 'Invalid or expired nonce' },
      { status: 401 }
    )
  }

  // Reconstruct the exact message that was signed on the client
  const message = `Sign this message to authenticate with our app.\n\nNonce: ${nonce}`

  try {
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } catch {
    return NextResponse.json(
      { error: 'Signature verification failed' },
      { status: 401 }
    )
  }

  // Consume nonce — single use only
  await db.collection('nonces').deleteOne({
    address: address.toLowerCase(),
    nonce,
  })

  const token = await signToken({ address: address.toLowerCase() })

  // Return token in body; also set as cookie so middleware can verify
  const response = NextResponse.json({ token })
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24h
    path: '/',
  })

  return response
}
