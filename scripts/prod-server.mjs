import http from 'node:http'
import { readFileSync, createReadStream, existsSync } from 'node:fs'
import { resolve, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

import httpProxy from 'http-proxy'

const __filename = fileURLToPath(import.meta.url)
const __dirname = resolve(__filename, '..')

const rootDir = resolve(__dirname, '..')
const distDir = resolve(rootDir, 'dist')

const port = Number.parseInt(process.env.PORT || '4173', 10)
const backendOrigin = (process.env.JFRONT_BACKEND_ORIGIN || 'https://jback.zynix.us').replace(/\/+$/, '')

const backendUrl = new URL(backendOrigin)

const proxy = httpProxy.createProxyServer({
  target: backendOrigin,
  changeOrigin: true,
  secure: true,
  xfwd: false,
})

proxy.on('proxyReq', (proxyReq) => {
  // Some upstreams (and Cloudflare) will reject requests if X-Forwarded-Host is a different hostname.
  // Since this proxy sits in front of a Cloudflare-protected origin, do not leak the public host upstream.
  proxyReq.removeHeader('x-forwarded-host')
  proxyReq.removeHeader('x-forwarded-proto')
  proxyReq.removeHeader('x-forwarded-port')
  proxyReq.removeHeader('x-forwarded-for')
})

proxy.on('error', (err, _req, res) => {
  try {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`Bad gateway: ${err?.message || 'proxy error'}`)
  } catch {
    // ignore
  }
})

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

function sendFile(res, filePath) {
  const ext = extname(filePath).toLowerCase()
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  })
  createReadStream(filePath).pipe(res)
}

function isProxyPath(urlPath) {
  return urlPath.startsWith('/api') || urlPath.startsWith('/admin') || urlPath.startsWith('/media')
}

function rewriteCsrfHeaders(req) {
  // Make the upstream see a self-consistent origin/referer.
  // This helps Django's CSRF middleware (strict referer checks) when your frontend is on a different hostname.
  const upstreamBase = `${backendUrl.protocol}//${backendUrl.host}`
  if (req.headers.origin) req.headers.origin = upstreamBase
  if (req.headers.referer) {
    try {
      const u = new URL(req.headers.referer)
      u.protocol = backendUrl.protocol
      u.host = backendUrl.host
      req.headers.referer = u.toString()
    } catch {
      req.headers.referer = upstreamBase
    }
  }
}

const server = http.createServer((req, res) => {
  const startedAt = Date.now()

  res.on('finish', () => {
    const ms = Date.now() - startedAt
    // eslint-disable-next-line no-console
    console.log(`${req.method || 'GET'} ${req.url || ''} -> ${res.statusCode} (${ms}ms)`) 
  })

  if (!req.url) {
    res.writeHead(400)
    res.end('Bad request')
    return
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = url.pathname

  if (isProxyPath(pathname)) {
    rewriteCsrfHeaders(req)
    proxy.web(req, res)
    return
  }

  // Static files
  let filePath = join(distDir, pathname)
  if (pathname === '/' || pathname === '') filePath = join(distDir, 'index.html')

  // Prevent path traversal
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  if (existsSync(filePath)) {
    try {
      sendFile(res, filePath)
    } catch {
      res.writeHead(500)
      res.end('Internal server error')
    }
    return
  }

  // SPA fallback for client-side routes
  const indexPath = join(distDir, 'index.html')
  try {
    const index = readFileSync(indexPath)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
    res.end(index)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Jfront prod server listening on http://127.0.0.1:${port}`)
  // eslint-disable-next-line no-console
  console.log(`Proxying /api,/admin,/media -> ${backendOrigin}`)
})
