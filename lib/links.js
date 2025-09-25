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
    <div className="links-wrap">
      <header className="top">
        <h1>友情链接</h1>
        <p>精选站点，按分类归纳。悬停查看简介，点击将在新窗口打开。</p>
      </header>

      {(!data || data.length === 0) ? (
        <div className="empty">
          暂无数据。请检查 Notion 库授权与字段（Name / URL / Category）。
        </div>
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
                  {items.map(it => (
                    <li key={`${cat}-${it.URL || it.Name}`}>
                      <a
                        className="card"
                        href={it.URL || '#'}
                        target="_blank"
                        rel="noopener noreferrer nofollow external"
                        aria-label={it.Name}
                      >
                        <div className="icon">
                          <img
                            src={it.Avatar || '/favicon.ico'}
                            alt={it.Name}
                            loading="lazy"
                            onError={e => {
                              try {
                                if (it.URL) {
                                  const u = new URL(it.URL)
                                  e.currentTarget.src = `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`
                                } else {
                                  e.currentTarget.src = '/favicon.ico'
                                }
                              } catch {
                                e.currentTarget.src = '/favicon.ico'
                              }
                            }}
                          />
                        </div>

                        <div className="meta">
                          <div className="name">{it.Name}</div>
                          {it.Description && <p className="desc">{it.Description}</p>}
                          {it.URL && (
                            <div className="host">
                              {(() => {
                                try {
                                  return new URL(it.URL).hostname.replace(/^www\./, '')
                                } catch { return '' }
                              })()}
                            </div>
                          )}
                        </div>

                        <div className="shine" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {/* 样式：纯 styled-jsx，无需全站依赖 */}
      <style jsx>{`
        :root {
          --bg: #ffffff;
          --card: #ffffffcc;
          --txt: #0f172a;
          --sub: #475569;
          --muted: #64748b;
          --line: #e5e7eb;
          --ring: 66, 153, 225;    /* focus ring rgb */
          --glow: 59, 130, 246;     /* 蓝色光晕 */
          --shadow: 16, 24, 40;     /* 阴影颜色基 */
          --radius: 16px;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --bg: #0b1220;
            --card: #0b1220cc;
            --txt: #e5e7eb;
            --sub: #cbd5e1;
            --muted: #94a3b8;
            --line: #1f2937;
            --glow: 56, 189, 248;  /* 暗色更清亮 */
            --shadow: 0, 0, 0;
          }
        }

        .links-wrap {
          max-width: 1080px;
          margin: 0 auto;
          padding: 40px 16px 56px;
          background: var(--bg);
        }
        .top h1 {
          margin: 0;
          font-size: 28px;
          line-height: 1.25;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--txt);
        }
        .top p {
          margin: 8px 0 0;
          font-size: 14px;
          color: var(--muted);
        }

        .empty {
          margin-top: 16px;
          padding: 28px 20px;
          border: 1px dashed var(--line);
          border-radius: calc(var(--radius) + 4px);
          color: var(--muted);
          text-align: center;
          backdrop-filter: blur(6px);
        }

        .groups { display: flex; flex-direction: column; gap: 36px; margin-top: 12px; }
        .group-head {
          margin-bottom: 10px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .group-title {
          font-size: 18px; font-weight: 700; color: var(--txt); margin: 0;
        }
        .group-count { font-size: 12px; color: var(--muted); }

        .group-empty {
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 14px 16px;
          color: var(--muted);
          font-size: 14px;
        }

        .cards {
          list-style: none; padding: 0; margin: 0;
          display: grid; gap: 14px;
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
        @media (min-width: 520px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (min-width: 880px) { .cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }

        .card {
          position: relative;
          display: flex; gap: 12px; align-items: flex-start;
          padding: 14px;
          border-radius: var(--radius);
          text-decoration: none;
          background: radial-gradient(1200px 200px at top right, rgba(var(--glow), 0.04), transparent 45%),
                      var(--card);
          border: 1px solid var(--line);
          box-shadow:
            0 1px 1px rgba(var(--shadow), 0.04),
            0 8px 16px rgba(var(--shadow), 0.06);
          transform: translateZ(0); /* 使GPU加速更丝滑 */
          transition:
            transform .25s ease, box-shadow .25s ease, border-color .25s ease, background .25s ease;
          will-change: transform, box-shadow;
        }
        .card:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow:
            0 2px 4px rgba(var(--shadow), 0.08),
            0 14px 28px rgba(var(--shadow), 0.10),
            0 24px 48px rgba(var(--glow), 0.08);
          border-color: rgba(var(--glow), .35);
          background: radial-gradient(1000px 160px at top right, rgba(var(--glow), 0.08), transparent 50%),
                      var(--card);
        }
        .card:focus-visible {
          outline: none;
          box-shadow:
            0 0 0 2px rgba(var(--ring), .9),
            0 10px 22px rgba(var(--shadow), .10);
        }

        .icon {
          flex: 0 0 auto;
          width: 44px; height: 44px;
          border-radius: 10px;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,0));
          border: 1px solid var(--line);
          transform: translateZ(0);
        }
        .icon img {
          width: 100%; height: 100%; object-fit: cover;
          opacity: 0; animation: fadeIn .3s ease-out forwards;
          display: block;
        }

        .meta { min-width: 0; }
        .name {
          color: var(--txt);
          font-weight: 700;
          font-size: 15px;
          line-height: 1.3;
          letter-spacing: .01em;
          margin-top: 1px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .desc {
          margin: 6px 0 0;
          color: var(--sub);
          font-size: 12px; line-height: 1.6;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .host {
          margin-top: 8px;
          font-size: 11px;
          color: var(--muted);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* 右上角轻微高光饰条（悬停显现） */
        .shine {
          pointer-events: none;
          position: absolute; inset: 0;
          border-radius: inherit;
          background:
            linear-gradient(135deg, rgba(var(--glow), .0) 40%, rgba(var(--glow), .18) 60%, rgba(var(--glow), .0) 80%);
          opacity: 0;
          transition: opacity .28s ease;
          mask: radial-gradient(200px 120px at 95% 5%, #000 20%, transparent 60%);
        }
        .card:hover .shine { opacity: 1; }

        @keyframes fadeIn { to { opacity: 1 } }

        /* 减少动效：尊重系统设置 */
        @media (prefers-reduced-motion: reduce) {
          .card, .card:hover { transition: none !important; transform: none !important; box-shadow: none !important; }
          .icon img { animation: none !important; opacity: 1 !important; }
        }
      `}</style>

      {/* 仅在 /links 隐藏 Notion 正文（当走 LayoutSlug 时，避免把原始数据库表渲染出来） */}
      <style jsx global>{`
        html.__links_hide_notion article .notion,
        html.__links_hide_notion article .notion-page { display: none !important; }
      `}</style>
    </div>
  )
}

export default function Links(props) {
  const theme = siteConfig('THEME', BLOG.THEME, props?.NOTION_CONFIG)

  // 有 slug=links 的占位页 → 用主题外壳，并隐藏 Notion 正文；否则直接渲染自定义页面
  if (props.__hasSlug) {
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
    revalidate: 600
  }
}
