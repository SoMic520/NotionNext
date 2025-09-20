import { useMemo, useState } from 'react'

/** 推荐页（UI 优化版） */
export default function LayoutRecommend (props) {
  // 允许 posts / allPages 兜底（别改）
  const posts = (props?.posts && props.posts.length
    ? props.posts
    : (props?.allPages && props.allPages.length ? props.allPages : []))

  /** ------- 数据规范化 / 过滤 ------- */
  // 标准化 recommend => string[]
  const normalizeRecommend = (p) => {
    let v = p?.recommend
    if (!v && p?.ext && typeof p.ext === 'object') v = p.ext.recommend
    if (!v) return []
    if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean)
    if (typeof v === 'string') {
      return v.split(',').map(s => s.trim()).filter(Boolean)
    }
    return []
  }

  const allPublishedPosts = useMemo(() => {
    return (posts || []).filter(p => p?.type === 'Post' && p?.status === 'Published')
  }, [posts])

  const recPosts = useMemo(() => {
    return allPublishedPosts.filter(p => normalizeRecommend(p).length > 0)
  }, [allPublishedPosts])

  // Tabs & 计数
  const tabCounts = useMemo(() => {
    const map = new Map()
    recPosts.forEach(p => {
      normalizeRecommend(p).forEach(t => map.set(t, (map.get(t) || 0) + 1))
    })
    return map
  }, [recPosts])

  const tabs = useMemo(() => Array.from(tabCounts.keys()), [tabCounts])
  const [selected, setSelected] = useState(null)      // 当前选中的推荐类别
  const [q, setQ] = useState('')                      // 本地搜索

  const filtered = useMemo(() => {
    let list = recPosts
    if (selected) list = list.filter(p => normalizeRecommend(p).includes(selected))
    if (q.trim()) {
      const key = q.trim().toLowerCase()
      list = list.filter(p => (p?.title || '').toLowerCase().includes(key))
    }
    return list
  }, [recPosts, selected, q])

  const getDate = p =>
    p?.publishDay || p?.date?.start_date || p?.lastEditedDay || ''

  // 诊断条（需要时改成 false 关闭）
  const SHOW_DIAG = false
  const stat = {
    total: posts.length,
    hasRecommend: recPosts.length ? recPosts.length : 0,
    ok: recPosts.length
  }

  /** ----------------- UI ----------------- */
  return (
    <div className='max-w-4xl mx-auto px-4 py-6'>
      <h1 className='text-3xl font-extrabold tracking-tight mb-4'>推荐文章</h1>

      {/* 顶部筛选条：吸附 + 卡片 + 毛玻璃 */}
      <div className='sticky top-16 z-20 mb-6'>
        <div className='backdrop-blur bg-white/70 dark:bg-black/40 border border-gray-200/60 dark:border-white/10 shadow-sm rounded-2xl px-4 py-3 flex flex-col gap-3'>
          {/* 统计 + 搜索 */}
          <div className='flex flex-col md:flex-row md:items-center gap-3'>
            <div className='text-sm text-gray-600 dark:text-gray-300'>
              共 <b>{allPublishedPosts.length}</b> 篇文章，
              含 <code className='px-1 rounded bg-gray-100 dark:bg-white/10'>recommend</code>：
              <b>{recPosts.length}</b>{selected ? `，当前「${selected}」：${filtered.length}` : ''}
            </div>

            <div className='grow' />

            <div className='flex items-center gap-2'>
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder='搜索标题...'
                className='w-56 md:w-72 text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10'
              />
              {q && (
                <button
                  onClick={() => setQ('')}
                  className='text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'>
                  清空
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className='flex flex-wrap gap-2'>
            <button
              onClick={() => setSelected(null)}
              className={
                'px-3 py-1.5 rounded-2xl border text-sm transition ' +
                (!selected
                  ? 'bg-black text-white dark:bg-white dark:text-black border-black/10 dark:border-white/10'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:bg-gray-200/70 dark:hover:bg-white/20')
              }>
              全部
              <span className='ml-2 text-xs opacity-80'>{recPosts.length}</span>
            </button>

            {tabs.map(t => {
              const active = selected === t
              const count = tabCounts.get(t) || 0
              return (
                <button
                  key={t}
                  onClick={() => setSelected(t)}
                  title={t}
                  className={
                    'px-3 py-1.5 rounded-2xl border text-sm transition ' +
                    (active
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black/10 dark:border-white/10'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:bg-gray-200/70 dark:hover:bg-white/20')
                  }>
                  {t}
                  <span className='ml-2 text-xs opacity-80'>{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {SHOW_DIAG && (
        <div className='text-xs mb-4 rounded-md border px-3 py-2 bg-gray-50 dark:bg-gray-800 dark:border-white/10 text-gray-600 dark:text-gray-300'>
          全部文章：<b>{stat.total}</b>，含 recommend：<b>{stat.hasRecommend}</b>，
          最终可展示：<b>{stat.ok}</b>
        </div>
      )}

      {/* 列表 */}
      <div className='rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden'>
        {filtered.length === 0 && (
          <div className='py-16 text-center text-sm text-gray-500 dark:text-gray-400'>
            暂无匹配的推荐文章
          </div>
        )}

        <ul className='divide-y divide-gray-200/70 dark:divide-white/10'>
          {filtered.map(p => (
            <li key={p.id}>
              <a
                href={p?.slug ? `/${p.slug}` : `/post/${p.id}`}
                className='group flex items-center justify-between px-5 py-4 md:px-6 md:py-5 hover:bg-gray-50 dark:hover:bg-white/5 transition'>
                <div className='min-w-0 pr-4'>
                  <div className='text-lg md:text-xl font-medium text-blue-600 dark:text-blue-400 group-hover:underline line-clamp-2'>
                    {p.title}
                  </div>
                </div>
                <div className='shrink-0 text-sm tabular-nums text-gray-500 dark:text-gray-400'>
                  {getDate(p)}
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
