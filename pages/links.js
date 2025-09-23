// /pages/links.js   (src 结构的话放 src/pages/links.js)
export default function Links () {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-3">Links OK</h1>
      <p className="opacity-70 text-sm">这里先用测试文案。确认位置正确后，再换成正式 UI。</p>
    </div>
  )
}
export async function getStaticProps () {
  return { props: {}, revalidate: 60 }
}
