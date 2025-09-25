// /pages/links.js   （若用 src 结构放 /src/pages/links.js）
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'
import { getLinksAndCategories } from '@/lib/links'

function LinksBody({ data = [], categories = [] }) {
  const groups = (categories || []).map(cat => ({
    cat,
    items: (data || [])
      .filter(x => (cat === '未分类' ? !x.Categories?.length : x.Categories?.includes(cat)))
      .sort((a, b) => (b.Weight || 0) - (a.Weight || 0) || a.Name.localeCompare(b.Name))
  }))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 12 }}>友情链接</h1>

      {(!data || data.length === 0) ? (
        <div style={{ opacity: .7 }}>暂无数据。请检查 Notion 库授权与字段（Name / URL / Category）。</div>
      ) : (
        <div style={{ display: 'grid', gap: 40 }}>
          {groups.map(({ cat, items }) => (
            <section key={cat}>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 12px' }}>{cat}</h2>
              {items.length === 0 ? (
                <div style={{ opacity: .6, fontSize: 14 }}>此分类暂无条目</div>
              ) : (
                <ul style={{
                  listStyle: 'none', padding: 0, margin: 0,
                  display: 'grid', gap: 16,
                  gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))'
                }}>
                  {items.map(it => (
                    <li key={`${cat}-${it.URL || it.Name}`} style={{
                      border: '1px solid #e5e7eb', borderRadius: 16, padding: 14
                    }}>
                      <a
                        href={it.URL || '#'}
                        target="_blank"
                        rel="noopener noreferrer nofollow external"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
                      >
                        <img
                          src={it.Avatar || '/favicon.ico'}
                          alt={it.Name}
                          loading="lazy"
                          style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                          onError={e => {
                            try {
                              if (it.URL) {
                                const u = new URL(it.URL)
                                e.currentTarget.src = `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`
                                return
                              }
                            } catch {}
                            e.currentTarget.src = '/favicon.ico'
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{it.Name}</div>
                          {it.Description && <div style={{ opacity: .7, fontSize: 12, marginTop: 2 }}>{it.Description}</div>}
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {/* 仅在 /links 隐藏 Notion 正文（当走 LayoutSlug 时，避免把原始数据库表渲染出来） */}
      <style jsx global>{`
        html.__links_hide_notion article .notion,
        html.__links_hide_notion article .notion-page {
          display: none !important;
        }
      `}</style>
    </div>
  )
}

export default function Links(props) {
  const theme = siteConfig('THEME', BLOG.THEME, props?.NOTION_CONFIG)

  // 有 slug=links 的占位页 → 用主题外壳，并隐藏 Notion 正文；否则直接渲染自定义页面
  if (props.__hasSlug) {
    // 给 html 打标，配合上面的全局样式只在 /links 隐藏 Notion 正文
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('__links_hide_notion')
    }
    return (
      <DynamicLayout theme={theme} layoutName="LayoutSlug" {...props}>
        <LinksBody data={props.items} categories={props.categories} />
      </DynamicLayout>
    )
  }

  return <LinksBody data={props.items} categories={props.categories} />
}

// ISR：稳定且快速；并探测是否存在 slug=links 占位页
export async function getStaticProps({ locale }) {
  let base = {}
  let items = []
  let categories = []
  let hasSlug = false

  try {
    base = await getGlobalData({ from: 'links', locale })
    const pages = base?.allPages || base?.pages || []
    hasSlug = Array.isArray(pages) && pages.some(p =>
      (p?.slug === 'links' || p?.slug?.value === 'links') &&
      (p?.type === 'Page' || p?.type?.value === 'Page') &&
      (p?.status === 'Published' || p?.status?.value === 'Published' || p?.status === '公开' || p?.status === '已发布')
    )
  } catch (e) {
    base = { NOTION_CONFIG: base?.NOTION_CONFIG || {} }
  }

  try {
    const r = await getLinksAndCategories()
    items = r?.items || []
    categories = r?.categories || []
  } catch (e) {
    items = []
    categories = []
  }

  return {
    props: { ...base, items, categories, __hasSlug: hasSlug },
    revalidate: 600 // 10 分钟后台增量刷新
  }
}
