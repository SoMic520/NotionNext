 'use client'
 import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
 import { useGlobal } from '@/lib/global'

 export 默认 function HexoAuthButtons() {
   const { locale } = useGlobal()
+  const tSignIn = locale?.SIGN_IN || 'Sign In'

   return (
     <div className="flex items-center">
       <SignedOut>
         <SignInButton mode="modal">
-          <button className="h-9 px-3 text-sm rounded-md border hover:bg-black/5">
-            {locale?.LOGIN || 'Sign In'}
-          </button>
+          <button className="h-9 px-3 text-sm rounded-md border hover:bg-black/5">
+            {tSignIn}
+          </button>
         </SignInButton>
       </SignedOut>
       <SignedIn>
         <UserButton afterSignOutUrl="/" userProfileMode="navigation" />
       </SignedIn>
     </div>
   )
 }
