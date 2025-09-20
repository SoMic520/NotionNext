import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const DB_ID = process.env.FRIENDS_DB_ID

export async function getAllFriends() {
  const res = await notion.databases.query({
    database_id: DB_ID,
    filter: { property: 'Status', select: { equals: '正常' } },
    sorts: [
      { property: 'Weight', direction: 'descending' },
      { property: 'Name', direction: 'ascending' }
    ]
  })

  return res.results.map(row => {
    const p = row.properties
    return {
      name: p.Name?.title?.[0]?.plain_text || '',
      url: p.URL?.url || '',
      category: p.Category?.select?.name || '',
      desc: p.Description?.rich_text?.[0]?.plain_text || '',
      avatar: p.Avatar?.files?.[0]?.external?.url ||
              p.Avatar?.files?.[0]?.file?.url ||
              (p.URL?.url ? new URL(p.URL.url).origin + '/favicon.ico' : ''),
      weight: p.Weight?.number || 0
    }
  })
}
