import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? '')

export async function proxy(req: NextRequest) {
  const token =
    req.cookies.get('token')?.value ??
    req.headers.get('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  try {
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    const response = NextResponse.redirect(new URL('/', req.url))
    response.cookies.delete('token')
    return response
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
