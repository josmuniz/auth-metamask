'use client'

import { useAccount } from 'wagmi'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={copy}
      className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium text-zinc-600 transition hover:bg-zinc-700 hover:text-zinc-300"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

const AUTH_STEPS = [
  { label: 'Connected wallet', icon: '🔗' },
  { label: 'Signed challenge', icon: '✍️' },
  { label: 'Server verified', icon: '🔍' },
  { label: 'JWT issued', icon: '🎫' },
]

export default function Dashboard() {
  const { address } = useAccount()
  const { signOut } = useAuth()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (!stored) {
      router.replace('/')
    } else {
      setToken(stored)
    }
  }, [router])

  if (!token) return null

  const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top nav */}
      <header className="border-b border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 ring-1 ring-indigo-500/20">
              <svg viewBox="0 0 32 32" fill="none" className="h-4 w-4">
                <path d="M16 2L6 16.5L16 21.5L26 16.5L16 2Z" fill="#627EEA" opacity="0.8" />
                <path d="M16 2L6 16.5L16 21.5V2Z" fill="#627EEA" />
                <path d="M16 23.5L6 18L16 30L26 18L16 23.5Z" fill="#627EEA" opacity="0.8" />
                <path d="M16 23.5L6 18L16 30V23.5Z" fill="#627EEA" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">Web3 Auth</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-zinc-700/50 bg-zinc-800/50 px-3 py-1.5 sm:flex">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[8px] font-bold text-white">
                {address ? address.slice(2, 4).toUpperCase() : '??'}
              </div>
              <span className="font-mono text-xs text-zinc-300">
                {address ? shortenAddress(address) : '—'}
              </span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <button
              onClick={signOut}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Authenticated via Ethereum wallet signature.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Wallet card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/10">
                <svg className="h-4 w-4 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-zinc-200">Wallet</span>
              <span className="ml-auto rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                Connected
              </span>
            </div>

            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
              {address ? address.slice(2, 4).toUpperCase() : '??'}
            </div>

            <p className="mb-1 text-[10px] text-zinc-500">Address</p>
            <div className="flex items-start gap-1">
              <p className="break-all font-mono text-xs leading-relaxed text-zinc-300">
                {address ?? 'Unknown'}
              </p>
              {address && <CopyButton text={address} />}
            </div>
          </div>

          {/* Session card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/10">
                <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-zinc-200">Session</span>
              <span className="ml-auto rounded-full bg-indigo-900/40 px-2 py-0.5 text-[10px] font-medium text-indigo-400">
                JWT · 24 h
              </span>
            </div>

            <p className="mb-1 text-[10px] text-zinc-500">Expires approximately</p>
            <p className="mb-4 text-xs text-zinc-300">{sessionExpires}</p>

            <p className="mb-1 text-[10px] text-zinc-500">Token preview</p>
            <div className="flex items-start gap-1">
              <p className="flex-1 break-all font-mono text-[10px] leading-relaxed text-zinc-600">
                {token.slice(0, 52)}…
              </p>
              <CopyButton text={token} />
            </div>
          </div>
        </div>

        {/* Auth flow */}
        <div className="mt-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-6">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Authentication flow
          </p>
          <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
            {AUTH_STEPS.map((step, i) => (
              <li key={i} className="flex items-center gap-2 sm:flex-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-sm">
                  {step.icon}
                </div>
                <span className="text-xs text-zinc-400">{step.label}</span>
                {i < AUTH_STEPS.length - 1 && (
                  <svg className="ml-auto hidden h-4 w-4 text-zinc-700 sm:block" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  )
}
