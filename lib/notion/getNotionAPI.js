import { NotionAPI as NotionLibrary } from 'notion-client'
import BLOG from '@/blog.config'

const DEFAULT_API_BASE_URL = 'https://www.notion.so/api/v3'

const notionAPI = getNotionAPI()

function sanitizeApiBaseUrl(rawUrl) {
  const apiBaseUrl = (rawUrl || '').toString().trim()

  if (!apiBaseUrl) {
    return DEFAULT_API_BASE_URL
  }

  // Notion now rejects collection queries against workspace vanity domains.
  if (apiBaseUrl.includes('.notion.site')) {
    console.warn(
      '[Notion API] Detected notion.site API host, falling back to https://www.notion.so/api/v3 to avoid 406 responses.'
    )
    return DEFAULT_API_BASE_URL
  }

  return apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl
}

function getNotionAPI() {
  return new NotionLibrary({
    apiBaseUrl: sanitizeApiBaseUrl(BLOG.API_BASE_URL), // https://[xxxxx].notion.site/api/v3
    activeUser: BLOG.NOTION_ACTIVE_USER || null,
    authToken: BLOG.NOTION_TOKEN_V2 || null,
    userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    kyOptions: {
      mode: 'cors',
      hooks: {
        beforeRequest: [
          request => {
            const url = request.url.toString()
            if (url.includes('/api/v3/syncRecordValues')) {
              return new Request(
                url.replace(
                  '/api/v3/syncRecordValues',
                  '/api/v3/syncRecordValuesMain'
                ),
                request
              )
            }
            return request
          }
        ]
      }
    }
  })
}

export default notionAPI
