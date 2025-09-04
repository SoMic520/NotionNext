'use client'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'

export default function HexoAuthButtons() {
  return (
    <div className="w-full flex justify-center md:justify-start md:w-auto mt-4 md:mt-0 md:ml-4">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-3 py-1 rounded-md border hover:bg-black/5">登录</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  )
}
