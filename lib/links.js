// /pages/links.js   （若用 src 结构放 /src/pages/links.js）
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'
import { getLinksAndCategories } from '@/lib/links'
import { useEffect } from 'react'

function LinksBody({ data = [], categories = [] }) {
  const groups = (categories || []).map(cat => ({
    cat,
    items: (data || [])
      .filter(x => (cat === '未分类' ? !x.Categories?.length : x.Categories?.includes(cat)))
      .sort((a, b) => (b.Weight || 0) - (a.Weight || 0) || a.Name.localeCompare(b.Name))
  }))

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 py-10">
      {/* 顶部标题区 */}
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          友情链接
        </h1>
        <p className="mt-2 text-sm text-gray-600/90 dark:text-gray-400/90">
          精选站点，按分类归纳。鼠标悬停可查看简介，点击将新窗口打开。
        </p>
      </header>

      {/* 空态 */}
      {(!data || data.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400">暂无数据。请检查 Notion 库授权与字段（Name / URL / Category）。</div>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map(({ cat, items }) => (
            <section key={cat} className="group">
              {/* 分组标题 */}
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {cat}
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  共 {items.length} 个
                </span>
              </div>

              {/* 分组内容 */}
              {items.length === 0 ? (
                <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 p-4 text-sm text-gray-500 dark:text-gray-400">
                  此分类暂无条目
                </div>
              ) : (
                <ul
                  className="
                    grid gap-4 sm:gap-5
                    grid-cols-1 xs:grid-cols-2 md:grid-cols-3
                  "
                >
                  {items.map(it => (
                    <li key={`${cat}-${it.URL || it.Name}`}>
                      <a
                        href={it.URL || '#'}
                        target="_blank"
                        rel="noopener noreferrer nofollow external"
                        aria-label={it.Name}
                        className={`
                          group/card relative block h-full
                          rounded-2xl border border-gray-200 dark:border-gray-800
                          bg-white/80 dark:bg-gray-900/60
                          shadow-sm dark:shadow-none
                          backdrop-blur-sm
                          transition-all duration-300
                          hover:-translate-y-0.5 hover:shadow-lg
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60
                        `}
                      >
                        <div className="p-4 sm:p-5 flex items-start gap-3.5">
                          {/* 头像/图标 */}
                          <div className="
                            relative shrink-0
                            rounded-xl overflow-hidden
                            ring-1 ring-gray-200/80 dark:ring-gray-800/80
                            bg-white dark:bg-gray-900
                            transition-transform duration-300
                            group-hover/card:scale-[1.03]
                          ">
                            <img
                              src={it.Avatar || '/favicon.ico'}
                              alt={it.Name}
                              loading="lazy"
                              className="
                                h-10 w-10 sm:h-11 sm:w-11 object-cover
                                opacity-0 animate-[fadeIn_.3s_ease-out_forwards]
                              "
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

                          {/* 文本区 */}
                          <div className="min-w-0">
                            <div className="
                              text-[15px] font-semibold leading-tight
                              text-gray-900 dark:text-gray-100
                              line-clamp-1
                              transition-colors duration-200
                              group-hover/card:text-gray-900 dark:group-hover/card:text-gray-50
                            ">
                              {it.Name}
                            </div>
                            {it.Description && (
                              <p className="
                                mt-1 text-xs sm:text-[13px] leading-relaxed
                                text-gray-600 dark:text-gray-400 line-clamp-2
                              ">
                                {it.Description}
                              </p>
                            )}
                            {/* URL 展示（弱化） */}
                            {it.URL && (
                              <div className="mt-2 text-[11px] sm:text-xs text-gray-500/90 dark:text-gray-400/80 line-clamp-1">
                                {new URL(it.URL).hostname.replace(/^www\./, '')}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 卡片底部的细分割线 + 轻微高亮饰条 */}
                        <div className="
                          h-px w-full bg-gradient-to-r from-transparent via-gray-200/80 to-transparent
                          dark:via-gray-800/80
                        " />
                        <div className="
                          absolute inset-x-0 -bottom-px h-px
                          bg-gradient-to-r from-transparent via-blue-400/0 to-transparent
                          opacity-0 group-hover/card:opacity-60 transition-opacity duration-300
                        " />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {/* 动画弱化：尊重系统的减少动效设置 */}
      <style jsx global>{`
        @keyframes fadeIn { to { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) {
          .group-hover\\:card\\:scale-\\[1\\.03\\] { transform: none !important; }
          .hover\\:-translate-y-0\\.5 { transform: none !important; }
          .transition-all, .transition-transform, .transition-colors, .transition-opacity { transition: none !important; }
          .animate-\\[fadeIn_.3s_ease-out_forwards\\] { animation: none !important; opacity: 1 !important; }
        }

        /* 仅在 /links 隐藏 Notion 正文（当走 LayoutSlug 时） */
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
    // 客户端给 html 打标，隐藏正文
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
