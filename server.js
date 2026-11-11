import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".ico": "image/x-icon",
};

// Route handlers for Vercel serverless functions
const apiRoutes = {
  "/developer": () => import("./api/developer.js"),
  "/api/developer": () => import("./api/developer.js"),
  "/api/ca": () => import("./api/ca.js"),
  "/api/admin/login": () => import("./api/admin/login.js"),
  "/api/admin/config": () => import("./api/admin/config.js"),
  "/api/admin/logout": () => import("./api/admin/logout.js"),
};

function enhanceResponse(res) {
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (data) {
    this.setHeader("Content-Type", "application/json; charset=utf-8");
    this.end(JSON.stringify(data));
    return this;
  };
  res.send = function (data) {
    if (typeof data === "object" && !Buffer.isBuffer(data)) {
      return this.json(data);
    }
    this.end(data);
    return this;
  };
}

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) {
        req.body = {};
        return resolve();
      }
      const contentType = req.headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        try {
          req.body = JSON.parse(body);
        } catch {
          req.body = body;
        }
      } else {
        req.body = body;
      }
      resolve();
    });
  });
}

function serveStaticFile(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("404 Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Support HTTP Range requests for video streaming (mp4)
    const range = req.headers.range;
    if (range && ext === ".mp4") {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType,
      });
      file.pipe(res);
      return;
    }

    res.writeHead(200, {
      "Content-Length": stats.size,
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  enhanceResponse(res);

  const url = new URL(req.url, `http://${req.headers.host || "localhost:3000"}`);
  let pathname = decodeURIComponent(url.pathname);

  // Check API routes
  if (apiRoutes[pathname]) {
    await parseBody(req);
    try {
      const module = await apiRoutes[pathname]();
      const handler = module.default;
      return await handler(req, res);
    } catch (error) {
      console.error(`API Error on ${pathname}:`, error);
      res.statusCode = 500;
      return res.json({ error: "Internal Server Error" });
    }
  }

  // Handle static files
  if (pathname === "/") {
    pathname = "/index.html";
  }

  const safePath = path.normalize(path.join(__dirname, pathname));
  if (!safePath.startsWith(__dirname)) {
    res.statusCode = 403;
    return res.end("Access Denied");
  }

  serveStaticFile(req, res, safePath);
});

server.listen(PORT, () => {
  console.log(`\n🚀 SufTTY web is running at: http://localhost:${PORT}`);
  console.log(`   - Homepage:  http://localhost:${PORT}/`);
  console.log(`   - Developer: http://localhost:${PORT}/developer\n`);
});
