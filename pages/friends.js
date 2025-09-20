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
  const filtered = (data || []).filter(d => CATS.includes(d.Category))
  return { props: { data: filtered, debug }, revalidate: 3600 }
}

export default function FriendsPage({ data, debug }) {
  const groups = CATS.map(cat => ({
    cat,
    items: (data || [])
      .filter(f => f.Category === cat)
      .sort((a, b) => (b.Weight || 0) - (a.Weight || 0) || a.Name.localeCompare(b.Name))
  }))

  const isEmpty = (data || []).length === 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Head>
        <title>友情链接｜Friends</title>
        <meta name="description" content="SoMic Studio 友情链接" />
      </Head>

      <h1 className="text-3xl font-bold mb-3">友情链接</h1>
      <p classNam
