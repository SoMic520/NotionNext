// /pages/links.js
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'
import getLinksAndCategories from '@/lib/links' // 默认导入

function safeHost(u) { try { return new URL(u).hostname.toLowerCase() } catch { return '' } }

function LinksBody({ data = [], categories = [] }) {
  const groups = (categories || []).map(cat => ({
    cat,
    items: (data || [])
      .filter(x => (cat === '未分类' ? !(x.Categories && x.Categories.length) : (x.Categories || []).includes(cat)))
      .sort((a, b) => (b.Weight || 0) - (a.Weight || 0) || String(a.Name || '').localeCompare(String(b.Name || '')))
  }))

  return (
    <div className="wrap">
      <header className="hd">
        <h1>友情链接</h1>
        <p>精选站点，按分类归纳。悬停查看简介，点击将在新窗口打开。</p>
      </header>

      {(!data || data.length === 0) ? (
        <div className="empty">暂无数据。请检查 Notion 库授权与字段（Name / URL / Category）。</div>
      ) : (
        <div className="groups">
          {groups.map(({ cat, items }) => (
            <section key={cat} className="group">
              <div className="group-head">
                <h2 className="group-title">{cat}</h2>
                <span className="group-count">共 {items.length} 个</span>
              </div>

              {items.length === 0 ? (
                <div className="group-empty">此分类暂无条目</div>
              ) : (
                <ul className="cards">
                  {items.map(it => {
                    const host = it.URL ? safeHost(it.URL) : ''
                    // 兜底：Avatar → DuckDuckGo → /favicon.ico → Google S2 → 本地
                    const iconDuck = host ? `https://icons.duckduckgo.com/ip3/${host.replace(/^www\./,'')}.ico` : '/favicon.ico'
                    const iconRoot = host ? `https://${host}/favicon.ico` : '/favicon.ico'
                    const iconS2   = host ? `https://www.google.com/s2/favicons?sz=64&domain=${host}` : '/favicon.ico'
                    const initial  = it.Avatar || iconDuck

                    return (
                      <li key={`${cat}-${it.URL || it.Name}`}>
                        <a className="card" href={it.URL || '#'} target="_blank" rel="noopener noreferrer nofollow external" aria-label={it.Name}>
                          <div className="icon">
                            <img
                              src={initial}
                              alt={it.Name}
                              title={host || it.Name}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              data-fallback="0"
                              onError={e => {
                                const step = Number(e.currentTarget.dataset.fallback || '0')
                                if (step === 0) { e.currentTarget.dataset.fallback = '1'; e.currentTarget.src = iconRoot }
                                else if (step === 1) { e.currentTarget.dataset.fallback = '2'; e.currentTarget.src = iconS2 }
                                else if (step === 2) { e.currentTarget.dataset.fallback = '3'; e.currentTarget.src = '/favicon.ico' }
                              }}
                            />
                          </div>

                          <div className="meta">
                            <div className="name">{it.Name}</div>
                            {it.Description && <p className="desc">{it.Description}</p>}
                            {host && <div className="host">{host.replace(/^www\./, '')}</div>}
                          </div>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <style jsx>{`
        :root{
          --bg:#fff;--txt:#0b1220;--sub:#334155;--muted:#64748b;
          --box:#dfe3ea; /* 卡片边框色（方框） */
          --boxHover:#7aa2ff; /* 悬停时边框高亮 */
          --line:#e5e7eb; --shadow:16,24,40; --radius:12px;
        }
        @media (prefers-color-scheme: dark){
          :root{ --bg:#0b1220; --txt:#e5e7eb; --sub:#cbd5e1; --muted:#94a3b8; --box:#263244; --boxHover:#4aa8ff; --line:#1f2937; --shadow:0,0,0 }
        }

        .wrap{ max-width:1080px; margin:0 auto; padding:32px 16px 56px; background:var(--bg) }
        .hd h1{ margin:0; font-size:28px; font-weight:800; color:var(--txt) }
        .hd p{ margin:8px 0 0; font-size:14px; color:var(--muted) }

        .empty{ margin-top:16px; padding:20px; border:1px dashed var(--box); border-radius:var(--radius); color:var(--muted); text-align:center }

        .groups{ display:flex; flex-direction:column; gap:28px; margin-top:10px }
        .group-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px }
        .group-title{ margin:0; font-size:18px; font-weight:700; color:var(--txt) }
        .group-count{ font-size:12px; color:var(--muted) }
        .group-empty{ border:1px solid var(--box); border-radius:var(--radius); padding:12px 14px; color:var(--muted); font-size:14px }

        .cards{ list-style:none; padding:0; margin:0; display:grid; gap:12px; grid-template-columns:repeat(1,minmax(0,1fr)) }
        @media(min-width:560px){ .cards{ grid-template-columns:repeat(2,minmax(0,1fr)) } }
        @media(min-width:900px){ .cards{ grid-template-columns:repeat(3,minmax(0,1fr)) } }

        /* —— 关键：整体“方框卡片”样式 —— */
        .card{
          position:relative; display:flex; gap:12px; align-items:flex-start;
          padding:12px 14px; background:#fff; border:1px solid var(--box); border-radius:var(--radius);
          text-decoration:none;
          transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease, background-color .18s ease;
          box-shadow: 0 1px 2px rgba(var(--shadow), .03);
        }
        @media (prefers-color-scheme: dark){ .card{ background:#0d1424 } }
        .card:hover{
          border-color: var(--boxHover);
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(var(--shadow), .06);
        }
        .card:focus-visible{ outline:none; box-shadow: 0 0 0 2px var(--boxHover) }

        /* 左侧图标保持小方块（与截图一致） */
        .icon{
          flex:0 0 auto; width:44px; height:44px;
          border-radius:10px; overflow:hidden;
          background:#fff; border:1px solid var(--box);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.5);
        }
        @media (prefers-color-scheme: dark){ .icon{ background:#0f172a } }
        .icon img{ width:100%; height:100%; object-fit:cover; display:block }

        .meta{ min-width:0 }
        .name{ color:var(--txt); font-weight:800; font-size:16px; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
        .desc{ margin:4px 0 0; color:var(--sub); font-size:13px; line-height:1.6; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden }
        .host{ margin-top:6px; font-size:12px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
      `}</style>

      <style jsx global>{`
        html.__links_hide_notion article .notion,
        html.__links_hide_notion article .notion-page { display:none !important; }
      `}</style>
    </div>
  )
}

export default function Links(props) {
  const theme = siteConfig('THEME', BLOG.THEME, props?.NOTION_CONFIG)
  if (props.__hasSlug) {
    if (typeof document !== 'undefined') document.documentElement.classList.add('__links_hide_notion')
    return (
      <DynamicLayout theme={theme} layoutName="LayoutSlug" {...props}>
        <LinksBody data={props.items} categories={props.categories} />
      </DynamicLayout>
    )
  }
  return <LinksBody data={props.items} categories={props.categories} />
}

// ISR
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
    const r = await getLinksAndCategories({ debug: false })
    items = r?.items || []
    categories = r?.categories || []
  } catch (e) {
    items = []
    categories = []
  }

  return { props: { ...base, items, categories, __hasSlug: hasSlug }, revalidate: 600 }
}
