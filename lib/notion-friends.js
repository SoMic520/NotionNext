// lib/notion-friends.js  —— 无需 @notionhq/client
const NOTION_TOKEN = process.env.NOTION_TOKEN
const DB_ID = process.env.FRIENDS_DB_ID
const NOTION_VERSION = '2022-06-28' // 或更高版本

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
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Notion API ${res.status}: ${text}`)
  }
  return res.json()
}

function getTitle(prop) {
  return (prop?.title || []).map(t => t?.plain_text || '').join('')
}
function getRichText(prop) {
  return (prop?.rich_text || []).map(t => t?.plain_text || '').join('')
}
function getUrl(prop) { return prop?.url || '' }
function getSelect(prop) { return prop?.select?.name || '' }
function getNumber(prop) { return typeof prop?.number === 'number' ? prop.number : 0 }
function getCheckbox(prop) { return !!prop?.checkbox }
function getDate(prop) { return prop?.date?.start || null }
function getFileUrl(prop) {
  const files = prop?.files
  if (!files || !files.length) return null
  const f = files[0]
  if (f.type === 'external') return f.external?.url || null
  if (f.type === 'file') return f.file?.url || null // 注意：Notion 签名 URL 有有效期
  return null
}

export async function getAllFriends() {
  if (!NOTION_TOKEN || !DB_ID) {
    throw new Error('Missing NOTION_TOKEN or FRIENDS_DB_ID')
  }

  const sorts = [
    { property: 'Weight', direction: 'descending' },
    { property: 'Name', direction: 'ascending' }
  ]
  const filter = { property: 'Status', select: { equals: '正常' } }

  let has_more = true
  let start_cursor = undefined
  const out = []

  while (has_more) {
    const data = await notionQueryDatabase({ sorts, filter, start_cursor, page_size: 100 })
    for (const page of data.results) {
      const p = page.properties
      const item = {
        Name: getTitle(p?.Name),
        URL: getUrl(p?.URL),
        Category: getSelect(p?.Category),
        Description: getRichText(p?.Description),
        Avatar: getFileUrl(p?.Avatar),
        Language: getSelect(p?.Language),
        Status: getSelect(p?.Status),
        Reciprocal: getCheckbox(p?.Reciprocal),
        Weight: getNumber(p?.Weight),
        RSS: getUrl(p?.RSS) || null,
        Updated: getDate(p?.Updated)
      }
      if (!item.Avatar && item.URL) {
        try {
          const u = new URL(item.URL)
          item.Avatar = `${u.origin}/favicon.ico`
        } catch {}
      }
      out.push(item)
    }
    has_more = data.has_more
    start_cursor = data.next_cursor
  }

  return out
}
