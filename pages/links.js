export default function Links() {
  return <div>Links OK</div>
}
export async function getStaticProps() {
  return { props: {}, revalidate: 60 }
}
