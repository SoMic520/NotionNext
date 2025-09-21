// notion/links.js
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

const t=p=> (p?.title||[]).map(x=>x?.plain_text||'').join('')
const rich=p=> (p?.rich_text||[]).map(x=>x?.plain_text||'').join('')
const url=p=> p?.url || ''
const sel=p=> p?.select?.name || ''
const num=p=> typeof p?.number==='number' ? p.number : 0

const withHttps = u => !u ? '' : (/^https?:\/\//i.test(u) ? u.trim() : `https://${String(u).trim().replace(/^\/+/, '')}`)
function pickAvatar(prop){
  const f = prop?.files?.[0]
  if (f) {
    if (f.type==='external' && f.external?.url) return withHttps(f.external.url)
    if (f.type==='file' && f.file?.url) return f.file.url
  }
  if (prop?.url) return withHttps(prop.url)
  return null
}

export async function getLinksAndCategories() {
  if (!NOTION_TOKEN || !DB_ID) throw new Error('Missing NOTION_TOKEN or FRIENDS_DB_ID')

  const db = await notion(`/databases/${DB_ID}`)
  const opt = db.properties?.Category?.select?.options || db.properties?.Category?.multi_select?.options || []
  const optionOrder = opt.map(o => o.name)

  const hasStatus = !!db.properties?.Status
  const hasWeight = !!db.properties?.Weight

  const filter = hasStatus ? { property: 'Status', select: { equals: '正常' } } : undefined
  const sorts = []
  if (hasWeight) sorts.push({ property: 'Weight', direction: 'descending' })
  sorts.push({ property: 'Name', direction: 'ascending' })

  const items=[]
  let start_cursor, has_more=true
  while (has_more){
    const body={ start_cursor, page_size:100 }
    if (filter) body.filter=filter
    if (sorts.length) body.sorts=sorts
    const data = await notion(`/databases/${DB_ID}/query`, { method:'POST', body: JSON.stringify(body) })
    for (const page of data.results){
      const p = page.properties
      const site = withHttps(url(p?.URL))
      let avatar = pickAvatar(p?.Avatar)
      if (!avatar && site){ try{ const u=new URL(site); avatar=`${u.origin}/favicon.ico` }catch{} }

      const catProp = p?.Category
      const cats = catProp?.multi_select ? catProp.multi_select.map(s=>s.name) : [sel(catProp)].filter(Boolean)

      items.push({
        Name: t(p?.Name),
        URL: site,
        Categories: cats,
        Description: rich(p?.Description),
        Avatar: avatar,
        Language: sel(p?.Language),
        Weight: num(p?.Weight),
        RSS: withHttps(url(p?.RSS))
      })
    }
    has_more = data.has_more
    start_cursor = data.next_cursor
  }

  const used = Array.from(new Set(items.flatMap(i=>i.Categories||[]).filter(Boolean)))
  let categories = optionOrder.filter(n=>used.includes(n))
  for (const c of used) if (!categories.includes(c)) categories.push(c)
  if (items.some(i=>!i.Categories?.length)) categories = [...categories, '未分类']

  return { items, categories }
}
