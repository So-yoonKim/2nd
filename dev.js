// 내 컴퓨터에서 미리 보기: node dev.js  ->  http://localhost:3000
// (Vercel 에 올리면 이 파일은 쓰이지 않고, api/ 폴더가 자동으로 서버 함수가 된다)
const fs = require('fs')
const http = require('http')
const path = require('path')

// .env 의 값을 process.env 로 읽기 (이 파일은 .gitignore 로 GitHub 에 올라가지 않는다)
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=')
    if (i > 0 && !line.startsWith('#')) process.env[line.slice(0, i).trim()] ??= line.slice(i + 1).trim()
  }
} catch {}

const routes = { '/api/places': require('./api/places'), '/api/place': require('./api/place') }

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const handler = routes[url.pathname]
  if (handler) {
    req.query = Object.fromEntries(url.searchParams)
    res.status = (code) => { res.statusCode = code; return res }
    res.json = (obj) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)) }
    return handler(req, res)
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.end(fs.readFileSync(path.join(__dirname, 'index.html')))
  }
  if (url.pathname === '/fallback.json') {   // 연습 모드용 1단계 파일 데이터 (Vercel 에서는 정적 파일로 제공됨)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    return res.end(fs.readFileSync(path.join(__dirname, 'fallback.json')))
  }
  res.statusCode = 404; res.end('Not found')
}).listen(3000, () => console.log('http://localhost:3000'))
