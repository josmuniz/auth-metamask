'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useAuth } from './hooks/useAuth'

function EthIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M16 2L6 16.5L16 21.5L26 16.5L16 2Z" fill="#627EEA" opacity="0.8" />
      <path d="M16 2L6 16.5L16 21.5V2Z" fill="#627EEA" />
      <path d="M16 23.5L6 18L16 30L26 18L16 23.5Z" fill="#627EEA" opacity="0.8" />
      <path d="M16 23.5L6 18L16 30V23.5Z" fill="#627EEA" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function connectorIcon(name: string) {
  if (name.toLowerCase().includes('metamask')) return '🦊'
  if (name.toLowerCase().includes('coinbase')) return '🔵'
  if (name.toLowerCase().includes('walletconnect')) return '🔗'
  return '👛'
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function Home() {
  const { address, isConnected } = useAccount()
  const { connectors, connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { signIn, loading, error } = useAuth()

  const step = isConnected ? 2 : 1

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-indigo-900/20 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm px-4">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/10 ring-1 ring-indigo-500/20">
            <EthIcon className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Web3 Auth</h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in with your Ethereum wallet</p>
        </div>

        {/* Step indicators */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[
            { n: 1, label: 'Connect' },
            { n: 2, label: 'Sign' },
          ].map(({ n, label }, i, arr) => (
            <div key={n} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                    step >= n ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {step > n ? (
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : n}
                </div>
                <span className={`text-[10px] ${step >= n ? 'text-indigo-400' : 'text-zinc-600'}`}>
                  {label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div className={`mb-3 h-px w-10 transition-all duration-300 ${step > n ? 'bg-indigo-600' : 'bg-zinc-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-sm">
          {!isConnected ? (
            <>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Step 1 — Choose wallet
              </p>
              <div className="flex flex-col gap-2">
                {connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => connect({ connector })}
                    disabled={isConnecting}
                    className="group flex items-center gap-3 rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-200 transition-all hover:border-indigo-500/40 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-700 text-lg transition-colors group-hover:bg-zinc-600">
                      {connectorIcon(connector.name)}
                    </span>
                    <span className="flex-1 text-left">{connector.name}</span>
                    {isConnecting ? (
                      <Spinner />
                    ) : (
                      <svg className="h-4 w-4 text-zinc-600 transition group-hover:text-zinc-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Step 2 — Authorize
              </p>

              {/* Address badge */}
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-zinc-800/80 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
                  {address ? address.slice(2, 4).toUpperCase() : '??'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-zinc-500">Connected as</p>
                  <p className="font-mono text-sm text-zinc-200">
                    {address ? shortenAddress(address) : '—'}
                  </p>
                </div>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-950/50 px-4 py-3 text-sm text-red-400 ring-1 ring-red-900/50">
                  <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                onClick={() => address && signIn(address)}
                disabled={loading}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Spinner />
                    <span>Waiting for signature…</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span>Sign in with wallet</span>
                  </>
                )}
              </button>

              <button
                onClick={() => disconnect()}
                className="w-full rounded-xl px-4 py-2 text-xs text-zinc-600 transition hover:text-zinc-400"
              >
                Use a different wallet
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-700">
          Your signature only proves ownership — no transaction is submitted.
        </p>
      </div>
    </div>
  )
}
