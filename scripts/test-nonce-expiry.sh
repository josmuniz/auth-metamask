#!/usr/bin/env bash
# Valida visualmente el ciclo de vida de un nonce:
#   1. Crea nonce (challenge)
#   2. Muestra nonce en MongoDB
#   3. Fuerza expiración en DB
#   4. Intenta verificar → debe responder "Invalid or expired nonce"

set -euo pipefail

BASE_URL="http://localhost:3000"
# Dirección Ethereum de prueba (formato válido, no necesita fondos)
ADDRESS="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
ADDRESS_LOWER=$(echo "$ADDRESS" | tr '[:upper:]' '[:lower:]')

SEP="─────────────────────────────────────────"

echo ""
echo "$SEP"
echo "  TEST: Ciclo de vida del nonce"
echo "$SEP"

# ── 1. Solicitar challenge ──────────────────────────────────────────────────
echo ""
echo "▶ 1/4  Solicitando challenge para ${ADDRESS:0:10}…"
RESPONSE=$(curl -s "${BASE_URL}/api/auth/challenge?address=${ADDRESS}")
echo "   Respuesta del servidor:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

NONCE=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['nonce'])" 2>/dev/null || echo "")
if [ -z "$NONCE" ]; then
  echo "   ✗ No se pudo extraer el nonce. ¿Está corriendo el servidor?"
  exit 1
fi
echo "   Nonce: $NONCE"

# ── 2. Mostrar nonce en MongoDB ─────────────────────────────────────────────
echo ""
echo "▶ 2/4  Estado actual en MongoDB:"
docker exec mongodb-auth mongosh auth_db --quiet --eval \
  "printjson(db.nonces.findOne({ address: '${ADDRESS_LOWER}' }))" 2>/dev/null

# ── 3. Forzar expiración ────────────────────────────────────────────────────
echo ""
echo "▶ 3/4  Forzando expiración (expiresAt → epoch 0)…"
docker exec mongodb-auth mongosh auth_db --quiet --eval \
  "const r = db.nonces.updateOne(
     { address: '${ADDRESS_LOWER}' },
     { \$set: { expiresAt: new Date(0) } }
   );
   print('   Documentos modificados: ' + r.modifiedCount);" 2>/dev/null

echo "   Nonce en DB tras la modificación:"
docker exec mongodb-auth mongosh auth_db --quiet --eval \
  "printjson(db.nonces.findOne({ address: '${ADDRESS_LOWER}' }))" 2>/dev/null

# ── 4. Intentar verificar con nonce expirado ────────────────────────────────
echo ""
echo "▶ 4/4  Intentando verificar con nonce expirado…"
VERIFY=$(curl -s -X POST "${BASE_URL}/api/auth/verify" \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"${ADDRESS}\",\"signature\":\"0xfake\",\"nonce\":\"${NONCE}\"}")
echo "   Respuesta del servidor:"
echo "$VERIFY" | python3 -m json.tool 2>/dev/null || echo "$VERIFY"

echo ""
echo "$SEP"
if echo "$VERIFY" | grep -q "expired"; then
  echo "  ✅  PASS — el servidor rechazó el nonce expirado correctamente"
else
  echo "  ✗   FAIL — respuesta inesperada"
fi
echo "$SEP"
echo ""
