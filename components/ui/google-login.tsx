'use client';

import { signIn } from 'next-auth/react';

export default function LoginButton() {
  return (
    <button
      onClick={async () => {
        // 'use server';
        await signIn('google', {
          redirect: true,
          redirect_uri: '/auth/callback/google',
          redirectTo: '/'
        }
        )
      }}
      className="rounded-md bg-white px-4 py-2 text-black hover:bg-gray-100"
    >
      Sign in with Google
    </button>
  );
}