'use client'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'

export default function HexoAuthButtons() {
  return (
    <div className="flex items-center">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="h-9 px-3 text-sm rounded-md border hover:bg-black/5">
            登录
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  )
}
