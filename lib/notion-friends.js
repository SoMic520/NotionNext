// lib/notion-friends.js
const NOTION_TOKEN = process.env.NOTION_TOKEN
const DB_ID = process.env.FRIENDS_DB_ID
const NOTION_VERSION = '2022-06-28'

async function notion(path, init = {}) {
  const r = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  })
  if (!r.ok) throw new Error(`Notion ${r.status}: ${await r.text()}`)
  return r.json()
}

const pickTitle = p => (p?.title || []).map(t => t?.plain_text || '').join('')
const pickRich  = p => (p?.rich_text || []).map(t => t?.plain_text || '').join('')
const pickUrl   = p => p?.url || ''
const pickSel   = p => p?.select?.name || ''
const pickNum   = p => typeof p?.number === 'number' ? p.number : 0
const pickDate  = p => p?.date?.start || null
const pickChk   = p => !!p?.checkbox

function withHttps(u) {
  if (!u) return ''
  const s = String(u).trim()
  if (/^https?:\/\//i.test(s)) return s
  return `https://${s.replace(/^\/+/, '')}`
}

function pickAvatar(prop) {
  // 优先 Files & media；兼容 URL 属性
  const f = prop?.files?.[0]
  if (f) {
    if (f.type === 'external' && f.external?.url) return withHttps(f.external.url)
    if (f.type === 'file' && f.file?.url) return f.file.url // Notion 临时签名 URL
  }
  if (prop?.url) return withHttps(prop.url)
  return null
}

export async function getFriendsAndCategories() {
  if (!NOTION_TOKEN || !DB_ID) throw new Error('Missing NOTION_TOKEN or FRIENDS_DB_ID')

  // 1) 拿数据库属性（用于获取 Category 选项顺序）
  const db = await notion(`/databases/${DB_ID}`)
  const optionOrder = (db.properties?.Category?.select?.options || []).map(o => o.name)

  // 2) 拉全量记录（Status=正常；Weight desc, Name asc）
  const filter = { property: 'Status', select: { equals: '正常' } }
  const sorts  = [
    { property: 'Weight', direction: 'descending' },
    { property: 'Name',   direction: 'ascending' }
  ]

  const items = []
  let has_more = true, start_cursor
  while (has_more) {
    const data = await notion(`/databases/${DB_ID}/query`, {
      method: 'POST',
      body: JSON.stringify({ filter, sorts, start_cursor, page_size: 100 })
    })
    for (const page of data.results) {
      const p = page.properties
      const site = withHttps(pickUrl(p?.URL))
      let avatar = pickAvatar(p?.Avatar)
      if (!avatar && site) {
        try { const u = new URL(site); avatar = `${u.origin}/favicon.ico` } catch {}
      }
      items.push({
        Name:        pickTitle(p?.Name),
        URL:         site,
        Category:    pickSel(p?.Category) || '',
        Description: pickRich(p?.Description),
        Avatar:      avatar,
        Language:    pickSel(p?.Language),
        Status:      pickSel(p?.Status),
        Reciprocal:  pickChk(p?.Reciprocal),
        Weight:      pickNum(p?.Weight),
        RSS:         withHttps(pickUrl(p?.RSS)),
        Updated:     pickDate(p?.Updated)
      })
    }
    has_more = data.has_more
    start_cursor = data.next_cursor
  }

  // 3) 由“数据库选项顺序”+“实际用到的分类”生成最终分类列表
  const used = Array.from(new Set(items.map(i => i.Category).filter(Boolean)))
  let categories = optionOrder.filter(n => used.includes(n))
  for (const c of used) if (!categories.includes(c)) categories.push(c) // 兜底：表里有但选项里没配置的
  if (items.some(i => !i.Category)) categories = [...categories, '未分类']

  return { items, categories }
}
