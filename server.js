// Production server: serves the built dist/ folder on $PORT with SPA fallback,
// so /admin and /dj still load on refresh. No dependencies beyond Node itself.
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('./dist', import.meta.url)))
const port = Number(process.env.PORT) || 3000

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

async function isFile(path) {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

function send(res, path) {
  res.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream')
  createReadStream(path).pipe(res)
}

createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  const filePath = normalize(join(root, pathname))

  if (filePath !== root && !filePath.startsWith(root + sep)) {
    res.writeHead(403).end('Forbidden')
    return
  }

  if (await isFile(filePath)) {
    send(res, filePath)
    return
  }

  // Missing asset files should 404, not return HTML.
  if (extname(pathname)) {
    res.writeHead(404).end('Not found')
    return
  }

  // Unknown paths (e.g. /admin) fall back to index.html for the client router.
  send(res, join(root, 'index.html'))
}).listen(port, () => {
  console.log(`CheerSpot listening on port ${port}`)
})
