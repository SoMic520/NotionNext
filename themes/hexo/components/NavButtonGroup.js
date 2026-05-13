import SmartLink from '@/components/SmartLink'

/**
 * 首页导航大按钮组件
 * @param {*} props
 * @returns
 */
const NavButtonGroup = (props) => {
  const { categoryOptions } = props
  if (!categoryOptions || categoryOptions.length === 0) {
    return <></>
  }

  return (
    <nav id='home-nav-button' className={'w-full z-10 md:mt-8 px-2 py-2 mt-8 flex flex-wrap md:max-w-5xl gap-3 justify-center max-h-80 overflow-auto'}>
      {categoryOptions?.map(category => {
        return (
          <SmartLink
            key={`${category.name}`}
            title={`${category.name}`}
            href={`/category/${category.name}`}
            passHref
            className='text-center w-full sm:w-4/5 md:w-auto px-6 h-12 justify-center items-center flex border border-[#d2e3fc] cursor-pointer rounded-full bg-white/95 text-[#1967d2] font-semibold hover:bg-[#e8f0fe] hover:border-[#8ab4f8] duration-200'>
               {category.name}
            </SmartLink>
        )
      })}
    </nav>
  )
}
export default NavButtonGroup
