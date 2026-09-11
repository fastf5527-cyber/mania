const http = require("http");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;
const SOURCE = "https://auntymaza.pw";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function decodeHtml(text) {
  return String(text || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

async function fetchSource(url, extraHeaders = {}) {
  return fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      Referer: `${SOURCE}/`,
      ...extraHeaders,
    },
  });
}

async function listIndian(page, search) {
  const params = new URLSearchParams({
    per_page: "24",
    page: String(page || 1),
    _fields: "id,date,slug,link,title,meta",
  });
  if (search) params.set("search", search);

  const res = await fetchSource(`${SOURCE}/wp-json/wp/v2/posts?${params}`);
  if (!res.ok) {
    throw new Error(`Listing failed (${res.status})`);
  }

  const posts = await res.json();
  const totalPages = Number(res.headers.get("x-wp-totalpages") || 1);

  return {
    success: true,
    page: Number(page || 1),
    hasMore: Number(page || 1) < totalPages,
    data: posts.map((post) => ({
      id: post.slug,
      title: decodeHtml(post.title?.rendered || "Untitled"),
      image: post.meta?.fifu_image_url || "",
      date: (post.date || "").slice(0, 10),
      link: post.link,
    })),
  };
}

function extractMp4(html) {
  const source = html.match(/<source[^>]+src=["']([^"']+\.mp4[^"']*)["']/i);
  if (source) return source[1];
  const href = html.match(/href=["'](https?:\/\/[^"']+\.mp4[^"']*)["']/i);
  if (href) return href[1];
  return "";
}

async function getIndianStream(slug) {
  const url = `${SOURCE}/${encodeURIComponent(slug).replace(/%2F/g, "/")}/`;
  const res = await fetchSource(url);
  if (!res.ok) {
    throw new Error(`Video page failed (${res.status})`);
  }
  const html = await res.text();
  const mp4 = extractMp4(html);
  if (!mp4) {
    throw new Error("No playable MP4 found on this video");
  }
  return mp4;
}

async function proxyBinary(req, res, targetUrl, fallbackType) {
  const headers = {
    "User-Agent": UA,
    Referer: `${SOURCE}/`,
    Accept: "*/*",
  };
  if (req.headers.range) headers.Range = req.headers.range;

  const upstream = await fetch(targetUrl, { headers, redirect: "follow" });
  const outHeaders = {
    "Content-Type": upstream.headers.get("content-type") || fallbackType,
    "Cache-Control": "public, max-age=300",
    "Accept-Ranges": upstream.headers.get("accept-ranges") || "bytes",
  };
  const length = upstream.headers.get("content-length");
  const range = upstream.headers.get("content-range");
  if (length) outHeaders["Content-Length"] = length;
  if (range) outHeaders["Content-Range"] = range;

  res.writeHead(upstream.status, outHeaders);
  if (!upstream.body) {
    res.end();
    return;
  }
  Readable.fromWeb(upstream.body).pipe(res);
}

function serveStatic(req, res) {
  let filePath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (filePath === "/") filePath = "/index.html";
  const full = path.normalize(path.join(ROOT, filePath));
  if (!full.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(full, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const type = MIME[path.extname(full).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(full).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname === "/api/indian") {
      const page = url.searchParams.get("page") || "1";
      const search = (url.searchParams.get("q") || "").trim();
      const data = await listIndian(page, search);
      json(res, 200, data);
      return;
    }

    if (url.pathname === "/api/indian/play") {
      const slug = (url.searchParams.get("id") || "").replace(/^\/+|\/+$/g, "");
      if (!slug) {
        json(res, 400, { success: false, message: "Missing id" });
        return;
      }
      const mp4 = await getIndianStream(slug);
      json(res, 200, {
        success: true,
        stream: `/api/indian/stream?url=${encodeURIComponent(mp4)}`,
      });
      return;
    }

    if (url.pathname === "/api/indian/stream") {
      const target = url.searchParams.get("url") || "";
      if (!/^https?:\/\//i.test(target)) {
        json(res, 400, { success: false, message: "Invalid stream url" });
        return;
      }
      await proxyBinary(req, res, target, "video/mp4");
      return;
    }

    if (url.pathname === "/api/indian/thumb") {
      const target = url.searchParams.get("url") || "";
      if (!/^https?:\/\//i.test(target)) {
        json(res, 400, { success: false, message: "Invalid thumb url" });
        return;
      }
      await proxyBinary(req, res, target, "image/jpeg");
      return;
    }

    serveStatic(req, res);
  } catch (err) {
    if (!res.headersSent) {
      json(res, 500, { success: false, message: err.message || "Server error" });
    }
  }
});

server.listen(PORT, () => {
  console.log(`Video player running at http://localhost:${PORT}`);
  console.log("Indian section: http://localhost:" + PORT + " (Indian tab)");
});
