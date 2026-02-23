# Arquitectura del Sistema — Web3 Auth (Next.js 16)

---

## Índice

1. [Descripción de funciones por archivo](#1-descripción-de-funciones-por-archivo)
2. [Pseudo-código del flujo completo](#2-pseudo-código-del-flujo-completo)
3. [Diagramas de componentes](#3-diagramas-de-componentes)

---

## 1. Descripción de funciones por archivo

---

### `lib/db.ts` — Conexión a MongoDB

```
Responsabilidad: Exporta una única promesa de conexión a MongoDB
                 reutilizable en todo el servidor (patrón Singleton).
```

| Elemento | Tipo | Descripción |
|---|---|---|
| `clientPromise` | `Promise<MongoClient>` | Promesa que resuelve en un cliente MongoDB conectado. En `development` usa el objeto `global` para evitar múltiples conexiones por Hot Reload. En `production` crea una conexión nueva. |

**Lógica interna:**

```
si NODE_ENV === 'development':
    si global._mongoClientPromise no existe:
        crear new MongoClient(MONGODB_URI)
        guardar promesa en global._mongoClientPromise
    clientPromise = global._mongoClientPromise   ← reutiliza la misma

si NODE_ENV === 'production':
    crear new MongoClient(MONGODB_URI)
    clientPromise = client.connect()             ← nueva por cada deploy
```

---

### `lib/jwt.ts` — Gestión de tokens JWT

```
Responsabilidad: Crear y verificar JSON Web Tokens usando el
                 algoritmo HS256 con la clave JWT_SECRET.
```

| Función | Firma | Descripción |
|---|---|---|
| `signToken` | `(payload: JWTPayload) → Promise<string>` | Genera un JWT firmado con HS256. Incluye `iat` (issued at), `exp` (24 horas). El payload contiene `{ address }`. |
| `verifyToken` | `(token: string) → Promise<JWTPayload>` | Verifica la firma y la expiración del token. Lanza excepción si es inválido o expirado. Devuelve el payload decodificado. |

**Interfaz:**
```typescript
interface JWTPayload {
  address: string   // Dirección Ethereum en minúsculas
}
```

---

### `lib/wagmi-config.ts` — Configuración de wagmi

```
Responsabilidad: Definir las cadenas, conectores y transportes
                 que wagmi usará en toda la aplicación.
```

| Elemento | Tipo | Descripción |
|---|---|---|
| `wagmiConfig` | `Config` | Objeto de configuración creado con `createConfig()`. Define soporte para `mainnet` y `sepolia`. Habilita los conectores `metaMask()` e `injected()` (cualquier wallet EIP-1193). Usa transporte HTTP público para ambas redes. |

---

### `app/providers.tsx` — Proveedores React

```
Responsabilidad: Envolver la aplicación con los contextos globales
                 necesarios para wagmi y React Query.
```

| Función | Tipo | Descripción |
|---|---|---|
| `Providers` | `React Component` | Componente cliente (`'use client'`) que envuelve a sus hijos con `WagmiProvider` y `QueryClientProvider`. El `QueryClient` se crea con `useState` para evitar que se comparta entre requests en SSR. |

---

### `app/hooks/useAuth.ts` — Hook de autenticación

```
Responsabilidad: Orquestar el flujo completo de autenticación
                 (challenge → firma → verificación → sesión).
```

| Función / Estado | Tipo | Descripción |
|---|---|---|
| `state.loading` | `boolean` | Indica que hay una operación async en curso. Se activa al inicio de `signIn` y se desactiva al terminar (éxito o error). |
| `state.error` | `string \| null` | Mensaje de error del último intento fallido. Se limpia al iniciar un nuevo `signIn`. |
| `signIn(address)` | `async (string) → void` | Función principal. Ejecuta los 4 pasos del flujo: pide challenge, solicita firma al wallet, envía verificación al servidor, guarda el token y redirige a `/dashboard`. |
| `signOut()` | `() → void` | Elimina el token de `localStorage`, borra la cookie `token` del navegador y redirige a `/`. |

---

### `app/page.tsx` — Página de Login `/`

```
Responsabilidad: Interfaz visual para conectar el wallet y
                 disparar el flujo de autenticación.
```

| Función / Componente | Tipo | Descripción |
|---|---|---|
| `Home` | `React Component` | Componente principal de la página. Gestiona los dos estados de la UI: (1) wallet no conectado → botones de conexión, (2) wallet conectado → botón de firma. |
| `EthIcon` | `React Component` | SVG inline del logo de Ethereum (colores oficiales `#627EEA`). Recibe `className` para personalizar tamaño. |
| `Spinner` | `React Component` | SVG animado de carga con `animate-spin`. Se muestra dentro de los botones durante operaciones async. |
| `connectorIcon(name)` | `(string) → string` | Devuelve un emoji según el nombre del conector: 🦊 MetaMask, 🔵 Coinbase, 🔗 WalletConnect, 👛 genérico. |
| `shortenAddress(address)` | `(string) → string` | Trunca una dirección Ethereum a formato `0x1234...abcd` (primeros 6 + últimos 4 caracteres). |

---

### `app/dashboard/page.tsx` — Dashboard protegido `/dashboard`

```
Responsabilidad: Mostrar la información de sesión del usuario
                 autenticado. Redirige a inicio si no hay token.
```

| Función / Componente | Tipo | Descripción |
|---|---|---|
| `Dashboard` | `React Component` | Página principal del dashboard. Al montar, verifica que `localStorage` tenga un token; si no, redirige a `/`. Muestra la dirección del wallet, datos de sesión y el flujo de autenticación. |
| `CopyButton` | `React Component` | Botón reutilizable que copia texto al portapapeles con `navigator.clipboard.writeText()`. Muestra "✓ Copied" durante 1.5 segundos como feedback visual. |
| `shortenAddress(address)` | `(string) → string` | Igual que en `page.tsx`. Trunca la dirección para el nav. |
| `AUTH_STEPS` | `Array` | Constante con los 4 pasos del flujo (🔗 🖊️ 🔍 🎫) que se renderizan como una lista horizontal en la parte inferior del dashboard. |

---

### `app/api/auth/challenge/route.ts` — Endpoint GET `/api/auth/challenge`

```
Responsabilidad: Generar un nonce único por dirección y persistirlo
                 en MongoDB con TTL de 5 minutos.
```

| Función | Firma | Descripción |
|---|---|---|
| `GET` | `(req: NextRequest) → NextResponse` | Handler de la ruta. Extrae `address` del query string, valida que sea una dirección Ethereum válida con regex (`/^0x[a-fA-F0-9]{40}$/`), genera un nonce con `nanoid()`, lo guarda (o actualiza si ya existe) en MongoDB con `upsert: true`, y devuelve `{ nonce, message }`. |

**Documento MongoDB generado:**
```
{
  address:   "0xd8da6bf2..."  ← siempre lowercase
  nonce:     "P5Vnp4FLKMwN"  ← generado con nanoid()
  expiresAt: ISODate(...)     ← ahora + 5 minutos
  createdAt: ISODate(...)
}
```

---

### `app/api/auth/verify/route.ts` — Endpoint POST `/api/auth/verify`

```
Responsabilidad: Verificar la firma criptográfica, consumir el nonce
                 (single-use) y emitir un JWT si todo es válido.
```

| Función | Firma | Descripción |
|---|---|---|
| `POST` | `(req: NextRequest) → NextResponse` | Handler principal. Recibe `{ address, signature, nonce }`. Ejecuta 4 validaciones en secuencia: (1) parseo del body, (2) campos requeridos, (3) nonce vigente en MongoDB, (4) firma criptográfica con viem. Si todas pasan: elimina el nonce, genera JWT y lo envía como JSON + cookie `httpOnly`. |

**Validaciones en orden:**

```
1. body parseable como JSON         → 400 "Invalid JSON body"
2. address + signature + nonce      → 400 "address, signature... required"
3. nonce existe y expiresAt > now   → 401 "Invalid or expired nonce"
4. viem.verifyMessage() === true    → 401 "Invalid signature"
```

**Cookie emitida:**
```
Set-Cookie: token=<JWT>
  HttpOnly  → no accesible desde JS (protección XSS)
  SameSite=Lax
  Secure    → solo en producción (HTTPS)
  Max-Age=86400 (24 horas)
```

---

### `proxy.ts` — Protección de rutas (Next.js 16)

```
Responsabilidad: Interceptar todas las peticiones a /dashboard/*
                 antes de que lleguen a los componentes y verificar
                 el JWT sin importar el runtime (Node.js).
```

| Función | Firma | Descripción |
|---|---|---|
| `proxy` | `(req: NextRequest) → NextResponse` | Extrae el token desde la cookie `token` o el header `Authorization: Bearer <token>`. Si no hay token: redirige a `/`. Si el token es inválido o expirado: elimina la cookie y redirige a `/`. Si es válido: deja pasar la petición con `NextResponse.next()`. |
| `config.matcher` | `string[]` | Limita la ejecución del proxy solo a `/dashboard/:path*`. Las demás rutas no pasan por aquí. |

---

## 2. Pseudo-código del flujo completo

---

### Flujo A — Conectar wallet

```
USUARIO hace click en "Connect with MetaMask"
│
├─► wagmi.connect({ connector: metaMask() })
│       │
│       ├─► MetaMask abre popup de conexión
│       │
│       ├─► USUARIO aprueba conexión
│       │
│       └─► wagmi internamente:
│               - solicita accounts al proveedor EIP-1193
│               - guarda address en estado global de wagmi
│
└─► useAccount() devuelve { address: "0x...", isConnected: true }
        │
        └─► UI: paso 1 completado ✓ → muestra paso 2 "Authorize"
```

---

### Flujo B — Sign In (autenticación completa)

```
USUARIO hace click en "Sign in with wallet"
│
└─► useAuth.signIn(address)
    │
    ├─[1. PEDIR CHALLENGE]──────────────────────────────────────────
    │   │
    │   ├─► fetch GET /api/auth/challenge?address=0x...
    │   │
    │   └─► SERVER: challenge/route.ts → GET(req)
    │           │
    │           ├─► validar address con regex /^0x[a-fA-F0-9]{40}$/
    │           │       └─ inválido → return 400 { error }
    │           │
    │           ├─► nonce = nanoid()
    │           │       └─► genera ID único: "P5Vnp4FLKMwN-d2GSWqeX"
    │           │
    │           ├─► expiresAt = Date.now() + 5 * 60 * 1000
    │           │
    │           ├─► MongoDB.nonces.updateOne(
    │           │       filter:  { address: address.toLowerCase() }
    │           │       update:  { $set: { nonce, expiresAt, createdAt } }
    │           │       options: { upsert: true }   ← crea o reemplaza
    │           │   )
    │           │
    │           └─► return 200 {
    │                   nonce:   "P5Vnp4FLKMwN-d2GSWqeX",
    │                   message: "Sign this message to authenticate
    │                             with our app.\n\nNonce: P5Vnp4..."
    │               }
    │
    ├─[2. FIRMAR MENSAJE]───────────────────────────────────────────
    │   │
    │   ├─► wagmi.signMessageAsync({ message })
    │   │
    │   ├─► MetaMask abre popup "Signature Request"
    │   │       muestra el mensaje en texto plano al usuario
    │   │
    │   ├─► USUARIO aprueba firma
    │   │
    │   └─► MetaMask genera firma ECDSA con clave privada:
    │           signature = "0x4a3b...f7e2"  (65 bytes, 130 chars hex)
    │
    ├─[3. VERIFICAR EN SERVIDOR]────────────────────────────────────
    │   │
    │   ├─► fetch POST /api/auth/verify
    │   │       body: { address, signature, nonce }
    │   │
    │   └─► SERVER: verify/route.ts → POST(req)
    │           │
    │           ├─► parsear JSON body
    │           │       └─ error → return 400 "Invalid JSON body"
    │           │
    │           ├─► validar campos obligatorios
    │           │       └─ falta alguno → return 400
    │           │
    │           ├─► MongoDB.nonces.findOne({
    │           │       address:   address.toLowerCase(),
    │           │       nonce:     nonce,
    │           │       expiresAt: { $gt: new Date() }  ← no expirado
    │           │   })
    │           │       └─ null → return 401 "Invalid or expired nonce"
    │           │
    │           ├─► reconstruir mensaje exacto:
    │           │       message = `Sign this message...\n\nNonce: ${nonce}`
    │           │
    │           ├─► viem.verifyMessage({ address, message, signature })
    │           │       │
    │           │       ├─► internamente:
    │           │       │     hash = keccak256("\x19Ethereum Signed Message:\n" + message)
    │           │       │     recovered = ecrecover(hash, signature)
    │           │       │     return recovered.toLowerCase() === address.toLowerCase()
    │           │       │
    │           │       └─ false → return 401 "Invalid signature"
    │           │
    │           ├─► MongoDB.nonces.deleteOne({ address, nonce })
    │           │       └─► nonce de un solo uso, se consume aquí
    │           │
    │           ├─► token = jose.SignJWT({ address })
    │           │               .setProtectedHeader({ alg: 'HS256' })
    │           │               .setIssuedAt()
    │           │               .setExpirationTime('24h')
    │           │               .sign(secret)
    │           │       token = "eyJhbGci....  <Header>.<Payload>.<Signature>"
    │           │
    │           ├─► response = { token }
    │           ├─► response.cookies.set('token', token, { httpOnly, maxAge: 86400 })
    │           └─► return 200 response
    │
    └─[4. GUARDAR SESIÓN Y REDIRIGIR]───────────────────────────────
        │
        ├─► localStorage.setItem('token', token)
        │       └─► para leer en dashboard/page.tsx y mostrar en UI
        │
        │   (cookie ya fue seteada por el servidor en paso 3)
        │
        └─► router.push('/dashboard')
```

---

### Flujo C — Acceder a ruta protegida `/dashboard`

```
BROWSER navega a /dashboard
│
└─► Next.js invoca proxy.ts ANTES de renderizar la página
    │
    ├─► proxy(req)
    │   │
    │   ├─► extraer token:
    │   │       token = req.cookies.get('token')?.value
    │   │            ?? req.headers.get('Authorization')?.replace('Bearer ', '')
    │   │
    │   ├─► si token es undefined / null:
    │   │       return NextResponse.redirect('/')
    │   │
    │   ├─► jose.jwtVerify(token, secret)
    │   │       │
    │   │       ├─► verifica firma HMAC-SHA256
    │   │       ├─► verifica que exp > Date.now()
    │   │       └─► devuelve payload { address, iat, exp }
    │   │
    │   ├─► si jwtVerify lanza excepción (token inválido / expirado):
    │   │       response = NextResponse.redirect('/')
    │   │       response.cookies.delete('token')   ← limpia cookie inválida
    │   │       return response
    │   │
    │   └─► return NextResponse.next()   ← deja pasar la petición
    │
    └─► Next.js renderiza dashboard/page.tsx
        │
        ├─► useEffect: localStorage.getItem('token')
        │       └─ null → router.replace('/')   (doble protección)
        │
        └─► muestra { address, token preview, sessionExpires }
```

---

### Flujo D — Sign Out

```
USUARIO hace click en "Sign out"
│
└─► useAuth.signOut()
    │
    ├─► localStorage.removeItem('token')
    │       └─► elimina del almacenamiento del navegador
    │
    ├─► document.cookie = 'token=; Max-Age=0; path=/'
    │       └─► sobreescribe la cookie con Max-Age=0 → el browser la borra
    │           nota: no puede eliminar httpOnly cookies desde JS directamente,
    │           pero Max-Age=0 las expira inmediatamente
    │
    └─► router.push('/')
            └─► próxima visita a /dashboard será bloqueada por proxy.ts
```

---

## 3. Diagramas de componentes

### Árbol de componentes React

```
app/layout.tsx  (Server Component)
└── <Providers>                               providers.tsx
    ├── <WagmiProvider config={wagmiConfig}>  lib/wagmi-config.ts
    │   │   chains:     [mainnet, sepolia]
    │   │   connectors: [metaMask, injected]
    │   │
    │   └── <QueryClientProvider>
    │       │
    │       ├── app/page.tsx  "/"
    │       │   ├── useAccount()           wagmi
    │       │   ├── useConnect()           wagmi
    │       │   ├── useDisconnect()        wagmi
    │       │   └── useAuth()              hooks/useAuth.ts
    │       │       └── useSignMessage()   wagmi
    │       │
    │       └── app/dashboard/page.tsx  "/dashboard"
    │           ├── useAccount()           wagmi
    │           ├── useRouter()            next/navigation
    │           └── useAuth()              hooks/useAuth.ts
    │
    └── proxy.ts intercepta /dashboard/* antes del render
```

---

### Mapa de dependencias entre archivos

```
                    .env.local
                    ├── MONGODB_URI ──────────────────────┐
                    └── JWT_SECRET ───────────────────┐   │
                                                      │   │
app/layout.tsx                                        │   │
└── app/providers.tsx                                 │   │
    └── lib/wagmi-config.ts                           │   │
                                                      │   │
app/page.tsx                                          │   │
└── app/hooks/useAuth.ts                              │   │
    ├── GET /api/auth/challenge ──────────────────────┼───┼──► lib/db.ts
    └── POST /api/auth/verify ───────────┐            │   │    └── mongodb
                                         │            │   │
app/dashboard/page.tsx                   │            │   │
└── app/hooks/useAuth.ts (signOut)       │            │   │
                                         │            │   │
app/api/auth/challenge/route.ts ◄────────┘            │   │
├── nanoid                                            │   │
└── lib/db.ts ◄───────────────────────────────────────────┘
                                                      │
app/api/auth/verify/route.ts ◄────────────────────────┘
├── viem (verifyMessage)
├── lib/db.ts
└── lib/jwt.ts ──────────────────────────────── jose (HS256)
                                                      ▲
proxy.ts ─────────────────────────────────────────────┘
└── jose (jwtVerify)
    matcher: /dashboard/*
```

---

### Estado del token en el cliente

```
   Login exitoso
        │
        ├──► localStorage['token'] = "eyJhbG..."   ← leer en dashboard UI
        │
        └──► Cookie 'token' (httpOnly)  ← leer en proxy.ts
                 seteada por el servidor en Set-Cookie

   Sign out
        │
        ├──► localStorage.removeItem('token')
        │
        └──► document.cookie = 'token=; Max-Age=0'
```
