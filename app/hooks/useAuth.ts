'use client'

import { useState } from 'react'
import { useSignMessage } from 'wagmi'
import { useRouter } from 'next/navigation'

interface AuthState {
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ loading: false, error: null })
  const { signMessageAsync } = useSignMessage()
  const router = useRouter()

  async function signIn(address: string) {
    setState({ loading: true, error: null })

    try {
      // 1. Request challenge from server
      const challengeRes = await fetch(
        `/api/auth/challenge?address=${encodeURIComponent(address)}`
      )
      if (!challengeRes.ok) {
        const { error } = await challengeRes.json()
        throw new Error(error ?? 'Failed to get challenge')
      }
      const { nonce, message } = await challengeRes.json()

      // 2. Sign the challenge with the connected wallet
      const signature = await signMessageAsync({ message })

      // 3. Send address + signature + nonce to server for verification
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, nonce }),
      })
      if (!verifyRes.ok) {
        const { error } = await verifyRes.json()
        throw new Error(error ?? 'Verification failed')
      }
      const { token } = await verifyRes.json()

      // 4. Persist token in localStorage (cookie is set by the server)
      localStorage.setItem('token', token)

      router.push('/dashboard')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Authentication failed'
      setState({ loading: false, error: message })
    } finally {
      setState((s) => ({ ...s, loading: false }))
    }
  }

  function signOut() {
    localStorage.removeItem('token')
    // Clear the httpOnly cookie via a simple fetch or by deleting manually
    document.cookie = 'token=; Max-Age=0; path=/'
    router.push('/')
  }

  return { ...state, signIn, signOut }
}
