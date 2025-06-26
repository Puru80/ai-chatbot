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
    revalidatePath('/plans'); // For pricing page (e.g., to hide upgrade button)
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

// Interface for the cancelProSubscription action state
export interface CancelProSubscriptionActionState {
  status: 'idle' | 'success' | 'failed' | 'unauthenticated' | 'not_pro_user' | 'missing_subscription_id';
  error?: string;
}

// Server action to cancel a user's Pro subscription
export const cancelProSubscription = async (
  _prevState: CancelProSubscriptionActionState,
  _formData: FormData, // Not used, but common for server actions
): Promise<CancelProSubscriptionActionState> => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { status: 'unauthenticated', error: 'User is not authenticated.' };
    }

    // Fetch the user from DB to get their Paddle subscription ID
    const currentUserArray = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
    if (currentUserArray.length === 0) {
      return { status: 'failed', error: 'User not found.' };
    }
    const currentUser = currentUserArray[0];

    if (currentUser.type !== 'pro') {
      return { status: 'not_pro_user', error: 'User is not on a Pro plan.' };
    }

    if (!currentUser.paddleSubscriptionId) {
      return { status: 'missing_subscription_id', error: 'Paddle subscription ID not found for user.' };
    }

    // Import paddle dynamically as it's not available during build time for server actions
    // and to avoid issues if not configured.
    const { paddle } = await import('@/lib/paddle');

    // Cancel the subscription in Paddle
    // You might want to choose 'next_billing_period' instead of 'immediately'
    // depending on your business logic.
    await paddle.subscriptions.cancel(currentUser.paddleSubscriptionId, { effectiveFrom: 'immediately' });

    // Paddle will send a 'subscription.canceled' webhook.
    // The webhook handler will update the user's status in the database.
    // For immediate UI feedback, we can optimistically update here or rely on revalidation after webhook.
    // For now, we'll rely on the webhook and revalidation.

    // Revalidate paths to update UI
    revalidatePath('/plans');
    revalidatePath('/chat'); // Or other relevant paths

    return { status: 'success' };

  } catch (error: any) {
    console.error('Cancel Pro Subscription action failed:', error);
    let errorMessage = 'An unknown error occurred during cancellation.';
    if (error.message) {
      errorMessage = error.message;
    }
    // Check for Paddle specific errors if possible, e.g. error.type from Paddle SDK
    return { status: 'failed', error: errorMessage };
  }
};
