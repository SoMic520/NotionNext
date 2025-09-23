// /lib/links.js  或  /lib/notion/links.js
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

// 小工具：宽松匹配字段名
const pickProp = (props, names) => {
  for (const n of names) if (props?.[n]) return props[n]
  return undefined
}
const getTitle = p => (p?.title || []).map(t => t?.plain_text || '').join('')
const getRich  = p => (p?.rich_text || []).map(t => t?.plain_text || '').join('')
const getUrl   = p => p?.url || ''
const getSel   = p => p?.select?.name || ''
const getNum   = p => typeof p?.number === 'number' ? p.number : 0
const withHttps = u => !u ? '' : (/^https?:\/\//i.test(u) ? u.trim() : `https://${String(u).trim().replace(/^\/+/, '')}`)

function getAvatar(prop) {
  const f = prop?.files?.[0]
  if (f) {
    if (f.type === 'external' && f.external?.url) return withHttps(f.external.url)
    if (f.type === 'file' && f.file?.url) return f.file.url
  }
  if (prop?.url) return withHttps(prop.url) // 兼容把 Avatar 做成 URL 属性
  return null
}

export async function getLinksAndCategories() {
  if (!NOTION_TOKEN || !DB_ID) throw new Error('Missing NOTION_TOKEN or FRIENDS_DB_ID')

  // 读数据库元数据：拿 Category 选项顺序，顺便看看有没有 Status
  const db = await notion(`/databases/${DB_ID}`)
  const catMeta =
    db.properties?.Category?.select?.options ||
    db.properties?.Category?.multi_select?.options || []
  const optionOrder = catMeta.map(o => o.name)

  const hasStatus = !!pickProp(db.properties, ['Status', '状态', 'Visible', '发布', 'Published'])
  const sorts = []
  if (pickProp(db.properties, ['Weight', '权重'])) sorts.push({ property: pickName(db.properties, ['Weight','权重']), direction: 'descending' })
  if (pickProp(db.properties, ['Name','名称','标题'])) sorts.push({ property: pickName(db.properties, ['Name','名称','标题']), direction: 'ascending' })

  // 宽松生成 property 名字（用于排序）
  function pickName(props, names) { for (const n of names) if (props[n]) return n; return names[0] }

  // 宽松的状态过滤（支持 不存在 / 正常 / Normal / Published）
  const statusPropName = pickName(db.properties, ['Status','状态','Visible','发布','Published'])
  const filter = hasStatus ? {
    or: [
      { property: statusPropName, select: { equals: '正常' } },
      { property: statusPropName, select: { equals: 'Normal' } },
      { property: statusPropName, select: { equals: 'Published' } },
      { property: statusPropName, select: { equals: '公开' } }
    ]
  } : undefined

  const items = []
  let start_cursor, has_more = true
  while (has_more) {
    const body = { start_cursor, page_size: 100 }
    if (filter) body.filter = filter
    if (sorts.length) body.sorts = sorts

    const data = await notion(`/databases/${DB_ID}/query`, { method: 'POST', body: JSON.stringify(body) })

    for (const page of data.results) {
      const props = page.properties
      const pName = pickProp(props, ['Name','名称','标题'])
      const pURL  = pickProp(props, ['URL','Link','链接'])
      const pDesc = pickProp(props, ['Description','描述','简介','Desc'])
      const pAvat = pickProp(props, ['Avatar','Icon','图标'])
      const pLang = pickProp(props, ['Language','语言'])
      const pCat  = pickProp(props, ['Category','分类'])
      const pW    = pickProp(props, ['Weight','权重'])
      const pRSS  = pickProp(props, ['RSS'])

      const site = withHttps(getUrl(pURL))
      let avatar = getAvatar(pAvat)
      if (!avatar && site) { try { const u = new URL(site); avatar = `${u.origin}/favicon.ico` } catch {} }

      // 分类：支持 select / multi_select；支持“分类/Category”任一命名
      const cats = []
      if (pCat?.multi_select) cats.push(...pCat.multi_select.map(s => s.name))
      else if (pCat?.select) cats.push(pCat.select.name)

      items.push({
        Name: getTitle(pName),
        URL: site,
        Categories: cats,
        Description: getRich(pDesc),
        Avatar: avatar,
        Language: getSel(pLang),
        Weight: getNum(pW),
        RSS: withHttps(getUrl(pRSS))
      })
    }
    has_more = data.has_more
    start_cursor = data.next_cursor
  }

  // 生成最终分类列表：优先数据库选项顺序，再补实际用到的；没分类的加“未分类”
  const used = Array.from(new Set(items.flatMap(i => i.Categories || []).filter(Boolean)))
  let categories = optionOrder.filter(n => used.includes(n))
  for (const c of used) if (!categories.includes(c)) categories.push(c)
  if (items.some(i => !i.Categories?.length)) categories = [...categories, '未分类']

  return { items, categories }
}
