import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export default function LoginButton() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');

  const handleGoogleSignIn = () => {
    // For OAuth providers, NextAuth uses the `callbackUrl` parameter in the `signIn` options
    // to redirect the user back to the specified URL after successful authentication with the provider.
    // This `callbackUrl` is sent as a query parameter to the `/api/auth/signin/google` endpoint,
    // which then uses it to construct the OAuth callback correctly.
    const signInOptions: { redirect: boolean; callbackUrl?: string } = { redirect: true };

    if (callbackUrl) {
      signInOptions.callbackUrl = callbackUrl;
    } else {
      // If no specific callbackUrl is provided (e.g., user directly navigates to /login),
      // default to redirecting to /chat.
      signInOptions.callbackUrl = '/chat';
    }
    signIn('google', signInOptions);
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      className="flex items-center justify-center w-full gap-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <span className="inline-block w-5 h-5">
        <svg viewBox="0 0 48 48" fill="none">
          <g>
            <path d="M44.5 20H24v8.5h11.7C34.7 33.1 30.1 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8.1 2.9l6.1-6.1C34.5 6.5 29.6 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c10.5 0 19.5-8.5 19.5-19.5 0-1.3-.1-2.5-.3-3.5z" fill="#FFC107"/>
            <path d="M6.3 14.7l7 5.1C15.5 16.1 19.4 13.5 24 13.5c3.1 0 5.9 1.1 8.1 2.9l6.1-6.1C34.5 6.5 29.6 4.5 24 4.5c-7.2 0-13.3 4.1-16.7 10.2z" fill="#FF3D00"/>
            <path d="M24 45.5c5.6 0 10.5-1.9 14.3-5.1l-6.6-5.4c-2 1.4-4.6 2.2-7.7 2.2-6.1 0-11.3-4.1-13.2-9.6l-7 5.4C7.1 41.1 14.9 45.5 24 45.5z" fill="#4CAF50"/>
            <path d="M44.5 20H24v8.5h11.7c-1.1 3.1-3.7 5.7-7.3 7.2l.1.1 7 5.4c-2.1 2-4.8 3.3-7.5 3.3-6.1 0-11.3-4.1-13.2-9.6l-7 5.4C7.1 41.1 14.9 45.5 24 45.5c10.5 0 19.5-8.5 19.5-19.5 0-1.3-.1-2.5-.3-3.5z" fill="#1976D2"/>
          </g>
        </svg>
      </span>
      <span>Sign in with Google</span>
    </button>
  );
}
