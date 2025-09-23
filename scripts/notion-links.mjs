// Node 18+
// 环境变量：NOTION_TOKEN, FRIENDS_DB_ID
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

const NOTION_TOKEN = process.env.NOTION_TOKEN
const DB_ID = process.env.FRIENDS_DB_ID
const NOTION_VERSION = '2022-06-28'
if (!NOTION_TOKEN || !DB_ID) {
  console.error('❌ 请设置 NOTION_TOKEN 和 FRIENDS_DB_ID'); process.exit(1)
}

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

const t=p=> (p?.title||[]).map(x=>x?.plain_text||'').join('')
const rich=p=> (p?.rich_text||[]).map(x=>x?.plain_text||'').join('')
const url=p=> p?.url || ''
const withHttps = u => !u ? '' : (/^https?:\/\//i.test(u) ? u.trim() : `https://${String(u).trim().replace(/^\/+/, '')}`)

function pick(props, names){ for (const n of names) if (props?.[n]) return props[n] }
function pickAvatar(prop){
  const f = prop?.files?.[0]
  if (f) {
    if (f.type==='external' && f.external?.url) return withHttps(f.external.url)
    if (f.type==='file' && f.file?.url) return f.file.url
  }
  if (prop?.url) return withHttps(prop.url)
  return null
}

async function main() {
  // 读元数据拿分类选项顺序
  const db = await notion(`/databases/${DB_ID}`)
  const opt = db.properties?.Category?.select?.options || db.properties?.Category?.multi_select?.options || []
  const catOrder = opt.map(o => o.name)

  // 宽松状态过滤（无 Status 就不过滤）
  const statusKey = ['Status','状态','Published','公开','Visible','发布'].find(k => db.properties?.[k])
  const filter = statusKey ? {
    or: [
      { property: statusKey, select: { equals: '正常' } },
      { property: statusKey, select: { equals: 'Normal' } },
      { property: statusKey, select: { equals: 'Published' } },
      { property: statusKey, select: { equals: '公开' } }
    ]
  } : undefined

  const items = []
  let start_cursor, has_more = true
  while (has_more) {
    const body = { page_size: 100, start_cursor }
    if (filter) body.filter = filter
    const data = await notion(`/databases/${DB_ID}/query`, { method:'POST', body: JSON.stringify(body) })
    for (const page of data.results) {
      const p = page.properties
      const pName = pick(p, ['Name','名称','标题'])
      const pURL  = pick(p, ['URL','Link','链接'])
      const pDesc = pick(p, ['Description','描述','简介','Desc'])
      const pAvat = pick(p, ['Avatar','Icon','图标'])
      const pCat  = pick(p, ['Category','分类'])

      const site = withHttps(url(pURL))
      let avatar = pickAvatar(pAvat)
      if (!avatar && site) { try { const u = new URL(site); avatar = `${u.origin}/favicon.ico` } catch {} }

      const cats = []
      if (pCat?.multi_select) cats.push(...pCat.multi_select.map(s=>s.name))
      else if (pCat?.select) cats.push(pCat.select.name)
      if (!cats.length) cats.push('未分类')

      items.push({ name: t(pName), url: site, description: rich(pDesc), avatar, categories: cats })
    }
    has_more = data.has_more
    start_cursor = data.next_cursor
  }

  // 分组（按数据库设定顺序优先）
  const used = Array.from(new Set(items.flatMap(i=>i.categories)))
  const order = [...catOrder.filter(n=>used.includes(n)), ...used.filter(n=>!catOrder.includes(n))]
  const groups = order.map(cat => ({ cat, items: items.filter(i=>i.categories.includes(cat)) }))

  const out = 'source/_data/links.json'
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, JSON.stringify({ groups }, null, 2), 'utf8')
  console.log(`✅ 已生成 ${out}：${items.length} 条，${groups.length} 组`)
}
main().catch(e=>{ console.error(e); process.exit(1) })
