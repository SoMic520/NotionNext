import Head from 'next/head'
import { getAllFriends } from '@/lib/notion-friends'

const CATS = [
  '学术 / 机构（Academia & Institutes）',
  '科研导航 / 工具（Research Tools & Navigation）',
  '教育资源 / 课程（Learning）',
  '个人博客 / 创作者（Personal Blogs）'
]

export async function getStaticProps() {
  let data = [], debug = { ok: true }
  try {
    if (!process.env.NOTION_TOKEN || !process.env.FRIENDS_DB_ID) {
      debug = { ok: false, reason: 'ENV_MISSING' }
    } else {
      data = await getAllFriends()
      if (!Array.isArray(data) || data.length === 0) {
        debug = { ok: false, reason: 'EMPTY_OR_FILTERED' }
      }
    }
  } catch (e) {
    debug = { ok: false, reason: 'QUERY_ERROR', message: String(e?.message || e) }
  }
  // 只保留四大类
  const filtered = (data || []).filter(d => CATS.includes(d.Category))
  return { props: { data: filtered, debug }, revalidate: 3600 }
}

export default function FriendsPage({ data, debug }) {
  const groups = CATS.map(cat => ({
    cat,
    items: (data || [])
      。filter(f => f。Category === cat)
      。sort((a, b) => (b.Weight || 0) - (a.Weight || 0) || a.Name.localeCompare(b.Name))
  }))

  const isEmpty = (data || []).length === 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Head>
        <title>友情链接｜Friends</title>
        <meta name="description" content="SoMic Studio 友情链接" />
      </Head>

      <h1 className="text-3xl font-bold mb-3">友情链接</h1>
      <p className="text-sm mb-6 opacity-80">
        互链标准：学术 / 教育 / 科研相关；失联 30 天暂时下架；提交：站点名 / 链接 / 简介 / 图标 / 分类。
      </p>

      {!debug.ok && (
        <div className="mb-6 text-sm p-3 rounded-lg border">
          <div className="font-medium">提示：当前未显示友链</div>
          <div className="opacity-80 mt-1">原因：{debug.reason}</div>
          {debug.message && <pre className="mt-2 text-xs whitespace-pre-wrap opacity-70">{debug.message}</pre>}
          <div className="mt-2 text-xs opacity-70">
            自检：访问 <a className="underline" href="/api/friends-test">/api/friends-test</a>，两个值都应为 ✅ set。
          </div>
        </div>
      )}

      {isEmpty ? (
        <div className="text-sm opacity-70">
          暂无友链可显示。请在 Notion 数据库中添加至少一条 <b>Status=正常</b> 且 <b>Category</b> 为四大类之一的记录。
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(({ cat, items }) => (
            <section key={cat}>
              <h2 className="text-2xl font-semibold mb-4">{cat}</h2>
              {items.length === 0 ? (
                <div className="text-sm opacity-60">此分类暂为空</div>
              ) : (
                <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(item => (
                    <li key={item.URL} className="border rounded-2xl p-4 hover:shadow transition">
                      <a href={item.URL} target="_blank" rel="noreferrer" className="flex items-center gap-3">
                        <img src={item.Avatar || '/favicon.ico'} alt={item.Name} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <div className="font-medium">{item.Name}</div>
                          <div className="text-xs opacity-70 line-clamp-2">{item.Description}</div>
                        </div>
                      </a>
                      <div className="mt-3 text-xs opacity-60">{item.RSS ? <a className="underline" href={item.RSS} target="_blank" rel="noreferrer">RSS</a> : ' '}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
