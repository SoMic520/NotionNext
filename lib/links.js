// /lib/links.js  （Node 20 内置 fetch，可直接用）
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

const pick = (props, names) => { for (const n of names) if (props?.[n]) return props[n] }
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

  // 读数据库元数据，拿分类选项顺序
  const db = await notion(`/databases/${DB_ID}`)
  const opt = db.properties?.Category?.select?.options || db.properties?.Category?.multi_select?.options || []
  const optionOrder = opt.map(o => o.name)

  // 宽松状态过滤（没有就不筛）
  const statusKey = ['Status','状态','Visible','发布','Published'].find(k => db.properties?.[k])
  const filter = statusKey ? {
    or: [
      { property: statusKey, select: { equals: '正常' } },
      { property: statusKey, select: { equals: 'Normal' } },
      { property: statusKey, select: { equals: 'Published' } },
      { property: statusKey, select: { equals: '公开' } }
    ]
  } : undefined

  const sorts = []
  if (db.properties?.Weight) sorts.push({ property: 'Weight', direction: 'descending' })
  if (db.properties?.Name)   sorts.push({ property: 'Name', direction: 'ascending'  })

  const items=[]
  let start_cursor, has_more=true
  while (has_more){
    const body={ page_size:100, start_cursor }
    if (filter) body.filter = filter
    if (sorts.length) body.sorts = sorts

    const data = await notion(`/databases/${DB_ID}/query`, { method:'POST', body: JSON.stringify(body) })
    for (const page of data.results){
      const p = page.properties
      const pName = pick(p, ['Name','名称','标题'])
      const pURL  = pick(p, ['URL','Link','链接'])
      const pDesc = pick(p, ['Description','描述','简介','Desc'])
      const pAvat = pick(p, ['Avatar','Icon','图标'])
      const pLang = pick(p, ['Language','语言'])
      const pCat  = pick(p, ['Category','分类'])
      const pW    = pick(p, ['Weight','权重'])
      const pRSS  = pick(p, ['RSS'])

      const site = withHttps(url(pURL))
      let avatar = pickAvatar(pAvat)
      if (!avatar && site){ try{ const u=new URL(site); avatar=`${u.origin}/favicon.ico` }catch{} }

      const cats = []
      if (pCat?.multi_select) cats.push(...pCat.multi_select.map(s=>s.name))
      else if (pCat?.select) cats.push(pCat.select.name)

      items.push({
        Name: t(pName),
        URL: site,
        Categories: cats,
        Description: rich(pDesc),
        Avatar: avatar,
        Language: sel(pLang),
        Weight: num(pW),
        RSS: withHttps(url(pRSS))
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
