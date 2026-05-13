import Head from 'next/head'
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import getLinksAndCategories from '@/lib/links'

const DEFAULT_LINKS_DB_ID = '2755906f3c428088928dfc62610854dc'

function normalizeUrl(value) {
  const raw = String(value || '').trim().replace(/[)\]\}，。；、？！,.;:]+$/g, '')
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^\/\//.test(raw)) return `https:${raw}`
  return `https://${raw.replace(/^\/+/, '')}`
}

function getHost(value) {
  try {
    return new URL(normalizeUrl(value)).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function getFallbackIcon(value) {
  const host = getHost(value)
  if (!host) return '/favicon.ico'
  return `https://icons.duckduckgo.com/ip3/${host}.ico`
}

function sortItems(list = []) {
  return [...list].sort((a, b) => {
    const weight = (b.Weight || 0) - (a.Weight || 0)
    if (weight !== 0) return weight
    return String(a.Name || '').localeCompare(String(b.Name || ''), 'zh-Hans-CN')
  })
}

function LinkIcon({ item }) {
  const src = item.Avatar || item.Logo || getFallbackIcon(item.URL)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={item.Name || ''}
      loading='lazy'
      referrerPolicy='no-referrer'
      onError={event => {
        const img = event.currentTarget
        if (img.dataset.fallback === 'local') return
        if (img.dataset.fallback === 'remote') {
          img.dataset.fallback = 'local'
          img.src = '/favicon.ico'
          return
        }
        img.dataset.fallback = 'remote'
        img.src = getFallbackIcon(item.URL)
      }}
    />
  )
}

function LinkCard({ item }) {
  const url = normalizeUrl(item.URL)
  const host = getHost(item.URL)

  return (
    <a
      className='link-card'
      href={url || '#'}
      target='_blank'
      rel='noopener noreferrer nofollow external'
      title={item.Name}>
      <span className='link-icon'>
        <LinkIcon item={item} />
      </span>
      <span className='link-main'>
        <strong>{item.Name}</strong>
        {item.Description && <small className='desc'>{item.Description}</small>}
        {host && <small className='host'>{host}</small>}
      </span>
    </a>
  )
}

function LinksBody({ data = [], categories = [], debug }) {
  const safeData = Array.isArray(data) ? data : []
  const safeCategories = Array.isArray(categories) ? categories.filter(Boolean) : []
  const visibleCategories = safeCategories.length > 0
    ? safeCategories
    : Array.from(new Set(safeData.flatMap(item => item.Categories || []).filter(Boolean)))

  const groups = visibleCategories.map(category => ({
    category,
    items: sortItems(
      safeData.filter(item =>
        category === '未分类'
          ? !(item.Categories && item.Categories.length)
          : (item.Categories || []).includes(category)
      )
    )
  }))

  return (
    <div className='links-page'>
      <header className='links-header'>
        <h1>友情链接</h1>
        <p>悬停查看站点信息，点击卡片在新标签打开。</p>
      </header>

      {safeData.length === 0 ? (
        <div className='links-empty'>
          暂无数据。请检查 Notion 友链库授权与字段（Name / URL / Category），以及 FRIENDS_DB_ID / NOTION_LINKS_DB_ID 配置。
          {debug?.error && <pre>{debug.error}</pre>}
          {debug?.__debug && <pre>{JSON.stringify(debug.__debug, null, 2)}</pre>}
        </div>
      ) : (
        <div className='links-groups'>
          {groups.map(({ category, items }) => (
            <section key={category} className='links-group'>
              <div className='group-head'>
                <h2>{category}</h2>
                <span>共 {items.length} 个</span>
              </div>
              {items.length > 0 ? (
                <div className='cards'>
                  {items.map(item => (
                    <LinkCard key={`${category}-${item.id || item.URL || item.Name}`} item={item} />
                  ))}
                </div>
              ) : (
                <div className='group-empty'>此分类暂无条目</div>
              )}
            </section>
          ))}
        </div>
      )}

      <style jsx>{`
        .links-page {
          width: 100%;
          padding: 2rem 0 4rem;
          color: #0f172a;
        }
        :global(.dark) .links-page {
          color: #e5e7eb;
        }
        .links-header {
          margin-bottom: 22px;
        }
        .links-header h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.25;
          font-weight: 900;
          letter-spacing: .02em;
        }
        .links-header p {
          margin: 8px 0 0;
          font-size: 14px;
          color: #64748b;
        }
        :global(.dark) .links-header p {
          color: #94a3b8;
        }
        .links-groups {
          display: flex;
          flex-direction: column;
          gap: 34px;
        }
        .group-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }
        .group-head h2 {
          margin: 0;
          font-size: 20px;
          line-height: 1.35;
          font-weight: 850;
        }
        .group-head span {
          flex: none;
          font-size: 12px;
          color: #64748b;
        }
        .cards {
          display: grid;
          grid-template-columns: repeat(2, minmax(220px, 1fr));
          gap: 18px 24px;
        }
        .links-empty,
        .group-empty {
          padding: 18px 20px;
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          color: #64748b;
          line-height: 1.8;
        }
        .links-empty pre {
          margin: 14px 0 0;
          overflow: auto;
          text-align: left;
          white-space: pre-wrap;
          font-size: 12px;
        }
        :global(.link-card) {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-height: 88px;
          padding: 12px 14px;
          border-radius: 16px;
          text-decoration: none;
          color: inherit;
          background: transparent;
          transition: transform .22s ease, box-shadow .22s ease, background .22s ease;
        }
        :global(.link-card:hover) {
          transform: translateY(-2px);
          background: rgba(255,255,255,.72);
          box-shadow: 0 10px 28px rgba(15, 23, 42, .08);
        }
        :global(.dark .link-card:hover) {
          background: rgba(15,23,42,.65);
          box-shadow: 0 10px 28px rgba(0, 0, 0, .24);
        }
        :global(.link-icon) {
          flex: 0 0 auto;
          width: 52px;
          height: 52px;
          border-radius: 14px;
          overflow: hidden;
          background: #f1f5f9;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        :global(.link-icon img) {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }
        :global(.link-main) {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        :global(.link-main strong) {
          font-size: 16px;
          line-height: 1.35;
          font-weight: 850;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        :global(.link-main small) {
          display: block;
          line-height: 1.55;
          color: #64748b;
        }
        :global(.link-main .desc) {
          font-size: 13px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        :global(.link-main .host) {
          margin-top: 1px;
          font-size: 12px;
          letter-spacing: .01em;
        }
        :global(.dark .link-main small) {
          color: #94a3b8;
        }
        @media (max-width: 900px) {
          .cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default function Links(props) {
  const siteTitle = siteConfig('TITLE', BLOG.TITLE, props?.NOTION_CONFIG) || BLOG?.TITLE || 'Site'
  const pageTitle = `${siteTitle} | 友情链接`

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name='description' content='友情链接' />
      </Head>
      <LinksBody data={props.items} categories={props.categories} debug={props.debug} />
    </>
  )
}

export async function getStaticProps({ locale }) {
  let base = {}
  let items = []
  let categories = []
  let debug = null

  try {
    base = await fetchGlobalAllData({ from: 'links', locale })
  } catch (error) {
    console.warn('[links] fetchGlobalAllData failed', error)
    base = { NOTION_CONFIG: {} }
  }

  const notionConfig = base?.NOTION_CONFIG || {}
  const linksDbId =
    notionConfig.FRIENDS_DB_ID ||
    notionConfig.NOTION_LINKS_DB_ID ||
    process.env.FRIENDS_DB_ID ||
    process.env.NOTION_LINKS_DB_ID ||
    DEFAULT_LINKS_DB_ID

  try {
    const result = await getLinksAndCategories({
      debug: process.env.FRIENDS_DEBUG === '1',
      FRIENDS_DB_ID: linksDbId,
      NOTION_LINKS_DB_ID: linksDbId
    })
    items = result?.items || []
    categories = result?.categories || []
    debug = result?.__debug ? { __debug: result.__debug } : null
  } catch (error) {
    console.warn('[links] getLinksAndCategories failed', error)
    debug = process.env.NODE_ENV !== 'production' ? { error: error.message } : null
  }

  return {
    props: {
      ...base,
      items,
      categories,
      debug
    },
    revalidate: 600
  }
}
