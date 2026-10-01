# ameba-OTA-UI

Web UI for managing Ameba OTA firmware updates. Supports both HTTP and HTTPS.

- **HTTP** — default, no setup needed: run `npm start`
- **HTTPS** — auto-detected when `server.key` + `server.crt` are present: run `npm run https`

Currently tested on Ubuntu 22.04 with the Arduino SDK.

---

## Environment Setup

1. Clone this repository

   ```sh
   git clone https://github.com/Ameba-AIoT/ameba-OTA-UI.git
   ```

2. Install curl (if you haven't) and nvm

   ```sh
   sudo apt install curl
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   ```

3. Export nvm path

   ```sh
   export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
   ```

4. Install Node.js (e.g., v18.20.3) and npm 10.8.1:

   ```sh
   nvm install v18.20.3
   npm install npm@10.8.1 -g
   ```

5. Check the installed versions:

   ```sh
   node -v
   npm -v
   ```

6. Install dependencies:

   ```sh
   cd ameba-OTA-UI/
   npm install
   ```
   
7. WSL mirrored networking (optional):

   Open or create your global configuration file at %UserProfile%\.wslconfig on Windows.
   Add
   ```sh
   [wsl2]
   networkingMode=mirrored
   ```
   Run wsl --shutdown in PowerShell to restart your instances.
   
---

## Running the Server

### HTTP (quick start, no certificate needed)

```sh
npm run build
npm start
```

The server starts on **http://localhost:3000**.

### HTTPS (recommended for device OTA)

#### Quick start (automated)

```sh
bash setup-https.sh
```

The script will:
1. Prompt for your server IP and port
2. Build the Next.js app
3. Generate a self-signed SSL certificate
4. Start the HTTPS server

#### Manual setup

1. Generate a self-signed certificate:

   ```sh
   openssl req -x509 -newkey rsa:2048 \
       -keyout server.key -out server.crt \
       -days 365 -nodes \
       -subj "/CN=192.168.1.100"
   ```

   Replace `192.168.1.100` with your PC's IP address.

2. Build and start the HTTPS server:

   ```sh
   npm run build
   npm run https
   ```

#### Verify

```sh
curl -k https://192.168.1.100:443/api/firmwareinfo
curl -kI https://192.168.1.100:443/api/uploadfile
```

The manifest response describes the uploaded firmware, including its build ID,
board model, size, and SHA-256 hash. The download response includes
`Content-Length` for reliable OTA transfers.

---

## Usage

1. Open the web UI: `https://<server-ip>:443/`
2. Upload a firmware binary (`ota.bin`)
3. The server validates that the file is no larger than 4 MiB and contains an
   `AMB82_BUILD_ID=<build-id>` marker.
4. Configure your Ameba device to query:
   ```
   https://<server-ip>:443/api/firmwareinfo
   ```
5. After validating the manifest, the device downloads the firmware from:
   ```
   https://<server-ip>:443/api/uploadfile
   ```
6. The device reports its OTA state and successful boot through
   `/api/connectedclients`.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/firmwareinfo` | Return the uploaded firmware manifest |
| GET | `/api/uploadfile` | Download the uploaded firmware with `Content-Length` |
| POST | `/api/uploadfile` | Validate and upload an AMB82-MINI firmware file |
| DELETE | `/api/uploadfile` | Delete the uploaded firmware |
| GET | `/api/connectedclients` | List devices seen within the last 4.5 seconds |
| POST | `/api/connectedclients` | Register device OTA state, build, model, and boot health |

### Firmware manifest

`GET /api/firmwareinfo` returns `available: false` when no firmware is stored.
When an upload is available, the response has this shape:

```json
{
  "available": true,
  "boardModel": "AMB82-MINI",
  "buildId": "AVSYNC-20260930-28",
  "size": 3198980,
  "sha256": "<64 lowercase hexadecimal characters>"
}
```

Responses use `Cache-Control: no-store` so devices always validate against the
current upload.

### Device status

Devices register with `POST /api/connectedclients` using JSON fields such as:

```json
{
  "OTA_state": "IDLE",
  "buildId": "AVSYNC-20260930-28",
  "boardModel": "AMB82-MINI",
  "healthy": true
}
```

The status list is currently kept in server memory and is cleared when the
server restarts.
