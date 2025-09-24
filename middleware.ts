export default function Links(){ 
  return <div style={{padding:40, fontSize:20}}>Links OK</div> 
}

// 用 ISR 生成静态，避免运行时慢请求影响
export async function getStaticProps(){
  return { props:{}, revalidate: 600 }
}
