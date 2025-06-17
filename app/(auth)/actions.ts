'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { createUser, getUser, db } from '@/lib/db/queries'; // Added db
import { user } from '@/lib/db/schema'; // Added user schema
import { auth, signIn } from './auth'; // Added auth

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data';
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const [existingUser] = await getUser(validatedData.email); // Renamed to existingUser for clarity

    if (existingUser) {
      return { status: 'user_exists' } as RegisterActionState;
    }
    await createUser(validatedData.email, validatedData.password);
    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};

// Interface for the upgradeToPro action state
export interface UpgradeActionState {
  status: 'idle' | 'success' | 'failed' | 'unauthenticated' | 'in_progress';
  error?: string; // Optional error message
}

// Server action to upgrade a user to 'pro'
export const upgradeToPro = async (
  _prevState: UpgradeActionState, // Previous state, not used but required by useFormState
  _formData: FormData, // FormData, not used in this action but common for server actions
): Promise<UpgradeActionState> => {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { status: 'unauthenticated', error: 'User is not authenticated.' };
    }

    // Update user type to 'pro' in the database
    const result = await db
      .update(user)
      .set({ type: 'pro' })
      .where(eq(user.id, session.user.id))
      .returning({ updatedId: user.id });

    if (result.length === 0) {
      return { status: 'failed', error: 'Failed to update user type.' };
    }

    // Revalidate paths to update UI components that depend on user type
    revalidatePath('/'); // For header button
    revalidatePath('/pricing'); // For pricing page (e.g., to hide upgrade button)
    // Revalidate other paths if necessary, e.g., a user profile page
    // revalidatePath('/profile');

    return { status: 'success' };
  } catch (error) {
    console.error('Upgrade to Pro action failed:', error);
    if (error instanceof Error) {
      return { status: 'failed', error: error.message };
    }
    return { status: 'failed', error: 'An unknown error occurred.' };
  }
};
