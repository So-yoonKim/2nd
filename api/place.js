// GET /api/place?id=367  -> 한 곳의 긴 글(내용·목차·초록·참고문헌)과 상세 정보
const { detail, describe } = require('./_lib')

module.exports = async (req, res) => {
  const { id } = req.query || {}
  if (!/^\d{1,10}$/.test(id || '')) return res.status(400).json({ error: 'id 가 올바르지 않습니다.' })
  try {
    const data = await detail(id)
    if (!data) return res.status(404).json({ error: '해당하는 여행지가 없습니다.' })
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    res.status(200).json(data)
  } catch (err) {
    res.status(502).json({ error: describe(err) })
  }
}
