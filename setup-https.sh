#!/bin/bash
# ============================================================================
#  HTTPS OTA Server Setup — ameba-OTA-UI
#  Generates a self-signed certificate and starts the Next.js server
#  with HTTPS support.
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── Configuration ──────────────────────────────────────────────────────────
# Detect local IP
DETECTED_IP=$(ip -4 addr show 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -n1)
if [ -z "$DETECTED_IP" ]; then
    DETECTED_IP="192.168.1.100"
fi

echo ""
echo "============================================"
echo "  Ameba OTA UI — HTTPS Server Setup"
echo "============================================"
echo ""

# Load saved config
CONFIG_FILE="$SCRIPT_DIR/.ota-server-config"
SAVED_IP=""
SAVED_PORT=""
OTA_FILE="ota.bin"
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

# Prompt for IP
DEFAULT_IP="${SAVED_IP:-$DETECTED_IP}"
read -p "Server IP [$DEFAULT_IP]: " SERVER_IP
SERVER_IP="${SERVER_IP:-$DEFAULT_IP}"

# Prompt for port
DEFAULT_PORT="${SAVED_PORT:-443}"
read -p "HTTPS port [$DEFAULT_PORT]: " SERVER_PORT
SERVER_PORT="${SERVER_PORT:-$DEFAULT_PORT}"

# Save config
cat > "$CONFIG_FILE" <<EOF
SAVED_IP="$SERVER_IP"
SAVED_PORT="$SERVER_PORT"
OTA_FILE="$OTA_FILE"
EOF

# ── Check prerequisites ──────────────────────────────────────────────────
echo ""
echo "Checking prerequisites..."

# OpenSSL
if ! command -v openssl &>/dev/null; then
    echo "[ERROR] OpenSSL not found. Install it:"
    echo "        sudo apt install openssl"
    exit 1
fi

# Node.js
if ! command -v node &>/dev/null; then
    echo "[ERROR] Node.js not found. Install nvm and Node.js:"
    echo "        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    echo "        nvm install 18"
    exit 1
fi

# npm dependencies
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing npm dependencies..."
    npm install
fi

# ── Build the Next.js app ────────────────────────────────────────────────
echo ""
echo "Building the Next.js app..."
npm run build

# ── Generate self-signed certificate ─────────────────────────────────────
if [ -f "server.key" ] || [ -f "server.crt" ]; then
    echo ""
    echo "[INFO] Certificate files already exist."
    read -p "Overwrite? (y/N): " OVERWRITE
    if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
        echo "[SKIP] Keeping existing certificate."
    else
        echo "Generating self-signed certificate for $SERVER_IP..."
        openssl req -x509 -newkey rsa:2048 \
            -keyout server.key -out server.crt \
            -days 365 -nodes \
            -subj "/CN=$SERVER_IP"
        echo "[OK] Certificate generated."
    fi
else
    echo ""
    echo "Generating self-signed certificate for $SERVER_IP..."
    openssl req -x509 -newkey rsa:2048 \
        -keyout server.key -out server.crt \
        -days 365 -nodes \
        -subj "/CN=$SERVER_IP"
    echo "[OK] Certificate generated."
fi

# ── Start the HTTPS server ───────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Starting HTTPS OTA Server"
echo ""
echo "  URL:  https://$SERVER_IP:$SERVER_PORT"
echo "  UI:   https://$SERVER_IP:$SERVER_PORT"
echo "  OTA:  https://$SERVER_IP:$SERVER_PORT/api/uploadfile"
echo ""
echo "  Press Ctrl+C to stop"
echo "============================================"
echo ""

HTTPS_PORT="$SERVER_PORT" NODE_ENV=production node server.js
