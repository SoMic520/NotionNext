const NOTION_TOKEN = process.env.NOTION_TOKEN
const DB_ID = process.env.FRIENDS_DB_ID
const NOTION_VERSION = '2022-06-28' // 或更高

async function notionQueryDatabase(payload) {
  const res = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload || {})
  })
  if (!res.ok) throw new Error(`Notion ${res.status}: ${await res.text()}`)
  return res.json()
}

function title(p){return (p?.title||[]).map(t=>t.plain_text||'').join('')}
function rich(p){return (p?.rich_text||[]).map(t=>t.plain_text||'').join('')}
const url = p => p?.url || ''
const sel = p => p?.select?.name || ''
const num = p => typeof p?.number === 'number' ? p.number : 0
const chk = p => !!p?.checkbox
const date = p => p?.date?.start || null
function fileUrl(p){
  const f=p?.files?.[0]; if(!f) return null
  return f.type==='external' ? f.external?.url : (f.type==='file'? f.file?.url : null)
}

export async function getAllFriends() {
  if (!NOTION_TOKEN || !DB_ID) throw new Error('Missing NOTION_TOKEN or FRIENDS_DB_ID')

  const filter = { property: 'Status', select: { equals: '正常' } }
  const sorts = [
    { property: 'Weight', direction: 'descending' },
    { property: 'Name', direction: 'ascending' }
  ]

  let out=[], has_more=true, start_cursor
  while (has_more) {
    const data = await notionQueryDatabase({ filter, sorts, start_cursor, page_size: 100 })
    for (const page of data.results) {
      const p = page.properties
      let avatar = fileUrl(p?.Avatar)
      const site = url(p?.URL)
      if (!avatar && site) {
        try { avatar = new URL(site).origin + '/favicon.ico' } catch {}
      }
      out.push({
        Name: title(p?.Name),
        URL: site,
        Category: sel(p?.Category),
        Description: rich(p?.Description),
        Avatar: avatar,
        Language: sel(p?.Language),
        Status: sel(p?.Status),
        Reciprocal: chk(p?.Reciprocal),
        Weight: num(p?.Weight),
        RSS: url(p?.RSS) || null,
        Updated: date(p?.Updated)
      })
    }
    has_more = data.has_more
    start_cursor = data.next_cursor
  }
  return out
}
