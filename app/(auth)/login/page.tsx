'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation'; // Added useSearchParams
import { useActionState, useEffect, useState } from 'react';
import { toast } from '@/components/toast';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';

import { login, type LoginActionState } from '../actions';
import { useSession } from 'next-auth/react';
import LoginButton from '@/components/ui/google-login';

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Get search params

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: 'idle',
    },
  );

  const { update: updateSession } = useSession();

  useEffect(() => {
    if (state.status === 'failed') {
      toast({
        type: 'error',
        description: 'Invalid credentials!',
      });
    } else if (state.status === 'invalid_data') {
      toast({
        type: 'error',
        description: 'Failed validating your submission!',
      });
    } else if (state.status === 'success') {
      setIsSuccessful(true);
      const redirectUrl = searchParams.get('redirect'); // Get redirect URL from query params

      if (redirectUrl) {
        // Redirect to the specified URL after login
        router.push(redirectUrl);
      } else {
        // updateSession().then(() => {
        //   router.refresh();
        // });

        router.push('/checkout/pri_01jynh4qr5g8dgy88h1gbzsrm0');
      }
    }
  }, [router, state.status, updateSession, searchParams]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get('email') as string);
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Sign In</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Use your email and password to sign in
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful}>Sign in</SubmitButton>
          <LoginButton/>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {"Don't have an account? "}
            <Link
              href={searchParams.get('redirect') ? `/register?redirect=${searchParams.get('redirect')}` : "/register"}
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Sign up
            </Link>
            {' for free.'}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
