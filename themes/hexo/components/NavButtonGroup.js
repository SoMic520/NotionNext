import SmartLink from '@/components/SmartLink'
// 新增引入
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'

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
    <nav
      id='home-nav-button'
      className={
        'w-full z-10 md:h-72 md:mt-6 xl:mt-32 px-5 py-2 mt-8 flex flex-wrap md:max-w-6xl space-y-2 md:space-y-0 md:flex justify-center max-h-80 overflow-auto'
      }
    >
      {categoryOptions?.map((category) => {
        return (
          <SmartLink
            key={`${category.name}`}
            title={`${category.name}`}
            href={`/category/${category.name}`}
            passHref
            className='text-center shadow-text w-full sm:w-4/5 md:mx-6 md:w-40 md:h-14 lg:h-20 h-14 justify-center items-center flex border-2 cursor-pointer rounded-lg glassmorphism hover:bg-white hover:text-black duration-200 hover:scale-105 transform'
          >
            {category.name}
          </SmartLink>
        )
      })}

      {/* 在这里插入登录/用户按钮 */}
      <div className="w-full flex justify-center md:justify-start md:w-auto mt-4 md:mt-0 md:ml-4">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="px-3 py-1 rounded-md border hover:bg-black/5">
              登录
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </nav>
  )
}
export default NavButtonGroup
