// GET /api/places  -> 제주 역사문화 여행지 목록(가벼운 정보)
const { places, describe } = require('./_lib')

module.exports = async (req, res) => {
  try {
    const data = await places()
    // 하루 동안 Vercel 이 응답을 보관 -> 방문자가 많아도 공공 API 호출 횟수는 늘지 않는다
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    res.status(200).json(data)
  } catch (err) {
    res.status(502).json({ error: describe(err) })
  }
}
