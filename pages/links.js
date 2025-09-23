export default function Links() {
  return (
    <div style={{maxWidth: 1100, margin: '0 auto', padding: '40px 16px'}}>
      <h1 style={{fontSize: 28, fontWeight: 700}}>Links OK</h1>
      <p style={{opacity: .75}}>这是测试页，看到它说明 /links 路由已经生效。</p>
    </div>
  )
}
export async function getStaticProps() {
  return { props: {}, revalidate: 60 }
}
