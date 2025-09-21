// lib/notion-friends.js
const NOTION_TOKEN = process.env.NOTION_TOKEN
const DB_ID = process.env.FRIENDS_DB_ID
const NOTION_VERSION = '2022-06-28'

async function query(payload) {
  const r = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload || {})
  })
  if (!r.ok) throw new Error(`Notion ${r.status}: ${await r.text()}`)
  return r.json()
}

// ------- helpers -------
const pickTitle = p => (p?.title || []).map(t => t?.plain_text || '').join('')
const pickRich  = p => (p?.rich_text || []).map(t => t?.plain_text || '').join('')
const pickUrl   = p => p?.url || ''

function withHttps(u) {
  if (!u) return ''
  const s = u.trim()
  if (/^https?:\/\//i.test(s)) return s
  return `https://${s.replace(/^\/+/, '')}`
}

function pickAvatar(p) {
  // 兼容 Files & media / External / URL 三种
  // 1) Files & media
  const f = p?.files?.[0]
  if (f) {
    if (f.type === 'external' && f.external?.url) return withHttps(f.external.url)
    if (f.type === 'file' && f.file?.url) return f.file.url // notion签名URL
  }
  // 2) URL 属性
  if (p?.url) return withHttps(p.url)
  return null
}

function canonCategory(name) {
  if (!name) return '未分类'
  const key = name.replace(/[()（）\s]/g, '').toLowerCase()
  if (key.includes('学术/机构')) return '学术 / 机构（Academia & Institutes）'
  if (key.includes('科研导航/工具')) return '科研导航 / 工具（Research Tools & Navigation）'
  if (key.includes('教育资源/课程') || key.includes('learning')) return '教育资源 / 课程（Learning）'
  if (key.includes('个人博客/创作者') || key.includes('personalblogs')) return '个人博客 / 创作者（Personal Blogs）'
  return '未分类'
}

export async function getAllFriends() {
  if (!NOTION_TOKEN || !DB_ID) throw new Error('Missing NOTION_TOKEN or FRIENDS_DB_ID')

  const filter = { property: 'Status', select: { equals: '正常' } }
  const sorts = [
    { property: 'Weight', direction: 'descending' },
    { property: 'Name',   direction: 'ascending' }
  ]

  let out = [], start_cursor, has_more = true
  while (has_more) {
    const data = await query({ filter, sorts, start_cursor, page_size: 100 })
    for (const page of data.results) {
      const p = page.properties
      const site = withHttps(pickUrl(p?.URL))
      let avatar = pickAvatar(p?.Avatar)
      if (!avatar && site) {
        try { const u = new URL(site); avatar = `${u.origin}/favicon.ico` } catch {}
      }
      out.push({
        Name:        pickTitle(p?.Name),
        URL:         site,
        Category:    canonCategory(p?.Category?.select?.name || ''),
        Description: pickRich(p?.Description),
        Avatar:      avatar,
        Language:    p?.Language?.select?.name || '',
        Status:      p?.Status?.select?.name || '',
        Reciprocal:  !!p?.Reciprocal?.checkbox,
        Weight:      typeof p?.Weight?.number === 'number' ? p.Weight.number : 0,
        RSS:         withHttps(p?.RSS?.url || ''),
        Updated:     p?.Updated?.date?.start || null
      })
    }
    has_more = data.has_more
    start_cursor = data.next_cursor
  }
  return out
}
