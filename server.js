// HTTPS OTA Server for Ameba OTA UI
// Run: npm run https
//
// Generates HTTP or HTTPS server depending on certificate availability:
// - If server.key + server.crt exist → HTTPS (port 443 or PORT env)
// - Otherwise → HTTP (port 3000 or PORT env)

const { createServer } = require("https");
const { createServer: createHttpServer } = require("http");
const { parse } = require("url");
const next = require("next");
const fs = require("fs");
const path = require("path");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = parseInt(process.env.PORT || "443", 10);
const httpsPort = parseInt(process.env.HTTPS_PORT || "443", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const keyPath = path.resolve(__dirname, "server.key");
const certPath = path.resolve(__dirname, "server.crt");

app.prepare().then(() => {
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    // ── HTTPS mode ──────────────────────────────────────────────
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };

    createServer(httpsOptions, async (req, res) => {
      const parsedUrl = parse(req.url, true);
      try {
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error handling request:", err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    }).listen(httpsPort, hostname, () => {
      console.log("");
      console.log("  > HTTPS OTA Server is running");
      console.log(`  > URL: https://0.0.0.0:${httpsPort}`);
      console.log(`  > UI:  https://localhost:${httpsPort}`);
      console.log(`  > OTA: https://<your-ip>:${httpsPort}/api/uploadfile`);
      console.log("");
    });
  } else {
    // ── HTTP mode (fallback) ────────────────────────────────────
    const httpPort = parseInt(process.env.HTTP_PORT || "3000", 10);

    createHttpServer(async (req, res) => {
      const parsedUrl = parse(req.url, true);
      try {
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error handling request:", err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    }).listen(httpPort, hostname, () => {
      console.log("");
      console.log("  > HTTP OTA Server is running");
      console.log("  > (no server.key / server.crt found — using HTTP)");
      console.log(`  > URL: http://0.0.0.0:${httpPort}`);
      console.log(`  > UI:  http://localhost:${httpPort}`);
      console.log(`  > OTA: http://<your-ip>:${httpPort}/api/uploadfile`);
      console.log("");
      console.log("  To enable HTTPS, place server.key and server.crt");
      console.log("  in this directory, or run: bash setup-https.sh");
      console.log("");
    });
  }
});
