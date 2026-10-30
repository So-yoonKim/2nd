// 공공데이터포털(odcloud) "제주특별자치도_제주역사문화" 일반정보 + 위치정보 API 를 불러와 하나로 합친다.
// 인증키는 코드에 쓰지 않고 환경변수에서만 읽는다. (Vercel: Settings > Environment Variables)
//   JEJU_CULTURE_INFO_KEY      일반정보 API 키
//   JEJU_CULTURE_LOCATION_KEY  위치정보 API 키 (같은 키면 비워 두어도 된다)
const BASE = 'https://api.odcloud.kr/api'
const INFO_URL = `${BASE}/15109587/v1/uddi:56c2b3a4-4b4b-46cd-a1fa-f928ef731ffb`      // 일반정보
const LOCATION_URL = `${BASE}/15109570/v1/uddi:8781448b-81a8-487c-bc95-d26335bafa82`  // 위치정보

function keyFor(name) {
  const raw = process.env[name] || process.env.JEJU_CULTURE_INFO_KEY || process.env.JEJU_CULTURE_LOCATION_KEY || ''
  if (!raw) throw new Error('NO_KEY')
  return raw.includes('%') ? raw : encodeURIComponent(raw)       // 인코딩 키/디코딩 키 둘 다 허용
}

async function fetchAll(url, keyName) {
  const res = await fetch(`${url}?page=1&perPage=1000&returnType=JSON&serviceKey=${keyFor(keyName)}`)
  let json
  try { json = await res.json() } catch { throw new Error('BAD_RESPONSE') }
  if (!Array.isArray(json.data)) throw new Error('API_' + (json.code ?? res.status))   // 예: 등록되지 않은 인증키
  return json.data
}

const s = (v) => (v == null || v === '해당없음' ? '' : String(v).trim())
const num = (v) => (v === '' || v == null ? null : Number(v))

// 합친 전체 데이터 (인스턴스가 살아 있는 동안 1시간 보관)
let cache = null
async function all() {
  if (cache && Date.now() - cache.at < 60 * 60 * 1000) return cache.data
  const [info, loc] = await Promise.all([fetchAll(INFO_URL, 'JEJU_CULTURE_INFO_KEY'), fetchAll(LOCATION_URL, 'JEJU_CULTURE_LOCATION_KEY')])
  const where = new Map(loc.map((r) => [r['데이터 고유번호'], r]))
  const data = info.map((g) => {
    const p = where.get(g['데이터 고유번호']) || {}
    const addr = s(p['위치'])
    return {
      id: g['데이터 고유번호'], name: s(g['장소명']),
      lat: num(p['위도'] ?? g['위도']), lng: num(p['경도'] ?? g['경도']),
      zip: s(p['우편번호']), addr, city: addr.split(' ')[1] || '', crs: s(p['좌표계값']),
      url: s(p['데이터 상세보기 URL'] || g['링크']),
      cat: s(g['분류']), dir1: s(g['디렉토리1']), dir2: s(g['디렉토리2']),
      title: s(g['제목']), subtitle: s(g['부제목']), subject: s(g['주제']),
      content: s(g['내용']), toc: s(g['목차']), abstract: s(g['초록']), ref: s(g['참고문헌']),
      author: s(g['저작자']), publisher: s(g['발행자']), date: s(g['발행일']),
      type: s(g['자료유형']), form: s(g['자료형태']), lang: s(g['언어']) === 'korean' ? '한국어' : s(g['언어']),
      scope: s(g['범위']), source: s(g['출처']), contrib: s(g['기여자']),
    }
  }).filter((d) => d.lat && d.lng)
  cache = { at: Date.now(), data }
  return data
}

// 목록용: 지도·카드·필터에 필요한 가벼운 정보 + 소개글 앞부분
async function places() {
  return (await all()).map((d) => {
    const text = d.content || d.abstract
    return {
      id: d.id, name: d.name, lat: d.lat, lng: d.lng, zip: d.zip, addr: d.addr, city: d.city, url: d.url,
      cat: d.cat, dir1: d.dir1, dir2: d.dir2, title: d.title, subtitle: d.subtitle, subject: d.subject,
      snippet: text.length > 220 ? text.slice(0, 220) + '…' : text,
    }
  })
}

// 상세용: 긴 글과 나머지 정보
async function detail(id) {
  const d = (await all()).find((x) => x.id === Number(id))
  if (!d) return null
  const { content, toc, abstract, ref, author, publisher, date, type, form, lang, scope, source, contrib, crs } = d
  return { id: d.id, content, toc, abstract, ref, author, publisher, date, type, form, lang, scope, source, contrib, crs }
}

// 오류를 키 없이 사용자에게 보여 줄 말로 바꾼다
function describe(err) {
  const m = String(err && err.message)
  if (m === 'NO_KEY') return '서버에 인증키 환경변수(JEJU_CULTURE_INFO_KEY, JEJU_CULTURE_LOCATION_KEY)가 설정되지 않았습니다.'
  if (m.startsWith('API_')) return `공공데이터 API가 오류를 돌려주었습니다. (${m.slice(4)}) 인증키와 활용신청 상태를 확인하세요.`
  return '공공데이터 API에 연결하지 못했습니다.'
}

module.exports = { places, detail, describe }
