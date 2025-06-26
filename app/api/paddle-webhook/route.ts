import { NextResponse, type NextRequest } from 'next/server';
import { paddle } from '@/lib/paddle'; // Paddle SDK client
import { db } from '@/lib/db/queries';   // Drizzle db instance
import { user } from '@/lib/db/schema'; // User schema
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Ensure PADDLE_WEBHOOK_SECRET is set
const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;
if (!PADDLE_WEBHOOK_SECRET) {
  console.error('Missing PADDLE_WEBHOOK_SECRET environment variable');
  // Potentially throw an error or handle this case more gracefully for production
}

export async function POST(request: NextRequest) {
  if (!PADDLE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('Paddle-Signature') || '';

    let event;
    try {
      event = paddle.webhooks.unmarshal(rawBody, signature, PADDLE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('Error verifying Paddle webhook signature:', err.message);
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
    }

    // Handle the event
    if (event && event.eventType === 'transaction.completed') {
      const transactionData = event.data;
      const customerEmail = transactionData.customer?.email;
      const paddleCustomerId = transactionData.customer_id;
      const paddleSubscriptionId = transactionData.subscription_id;
      // Assuming the first item is the primary one for the plan
      const paddlePriceId = transactionData.items?.[0]?.price_id;
      const customData = transactionData.custom_data as { userId?: string } | null;
      const appUserId = customData?.userId;

      console.log(`Processing transaction.completed for email: ${customerEmail}, paddleSubscriptionId: ${paddleSubscriptionId}`);

      if (!paddleSubscriptionId || !paddleCustomerId || !paddlePriceId) {
        console.error('Webhook missing essential IDs (subscription, customer, or price)');
        return NextResponse.json({ error: 'Webhook payload missing essential IDs' }, { status: 400 });
      }

      // Determine if this is the Pro plan we expect
      // Compare paddlePriceId with your known PRO_PLAN_PRICE_ID
      // For now, we'll assume any completed transaction for a subscription makes them pro
      // const proPlanPriceId = process.env.NEXT_PUBLIC_PADDLE_PRO_PLAN_PRICE_ID;
      // if (paddlePriceId !== proPlanPriceId) {
      //   console.log(`Transaction for a different price ID (${paddlePriceId}), not updating to Pro.`);
      //   return NextResponse.json({ message: 'Transaction for non-pro plan.' }, { status: 200 });
      // }


      if (appUserId) {
        // User ID was passed in customData, update this user
        await db.update(user)
          .set({
            type: 'pro',
            paddleCustomerId: paddleCustomerId,
            paddleSubscriptionId: paddleSubscriptionId,
            paddlePriceId: paddlePriceId,
            paddleSubscriptionStatus: transactionData.status, // 'completed' for transaction, might want 'active' for subscription
          })
          .where(eq(user.id, appUserId));
        console.log(`User ${appUserId} updated to Pro.`);
      } else if (customerEmail) {
        // No userId in customData, try to find user by email
        const existingUserArray = await db.select().from(user).where(eq(user.email, customerEmail)).limit(1);
        if (existingUserArray.length > 0) {
          const existingUser = existingUserArray[0];
          await db.update(user)
            .set({
              type: 'pro',
              paddleCustomerId: paddleCustomerId,
              paddleSubscriptionId: paddleSubscriptionId,
              paddlePriceId: paddlePriceId,
              paddleSubscriptionStatus: transactionData.status,
            })
            .where(eq(user.id, existingUser.id));
          console.log(`User ${existingUser.email} (ID: ${existingUser.id}) updated to Pro.`);
        } else {
          // User does not exist, create a new user
          // This part is tricky if your system requires passwords or other fields for new users.
          // For now, we'll log this. A more robust solution might involve:
          // 1. Creating a user with a placeholder status and sending them an email to complete registration.
          // 2. Storing the Paddle transaction and having a manual process.
          // 3. If your user creation allows for users without passwords initially (e.g. social logins later)
          console.warn(`New customer via Paddle: ${customerEmail}. User not found in DB. Manual creation or different flow needed.`);
          // Example: Potentially create user if your createUser allows it without password
          // await createUser(customerEmail, 'some_default_or_generated_password_if_needed', undefined, 'pro');
          // Then update with Paddle IDs. This needs careful consideration of your auth system.
        }
      } else {
        console.error('Webhook transaction.completed missing customer email and customData.userId. Cannot process.');
        return NextResponse.json({ error: 'Missing user identification data' }, { status: 400 });
      }

      // Revalidate paths
      revalidatePath('/plans');
      revalidatePath('/chat'); // Or any other relevant paths
      // Potentially revalidate user-specific paths if any

    } else if (event && event.eventType === 'subscription.updated') {
      // Handle subscription updates, e.g., status changes, plan changes
      const subData = event.data;
      // Update paddleSubscriptionStatus, paddlePriceId if changed
      // await db.update(user)
      //   .set({
      //       paddleSubscriptionStatus: subData.status,
      //       paddlePriceId: subData.items?.[0]?.price?.id, // Check structure
      //       // Potentially update 'type' if they downgraded via Paddle UI
      //    })
      //   .where(eq(user.paddleSubscriptionId, subData.id));
      console.log(`Received subscription.updated event for ${subData.id}, status: ${subData.status}`);
    } else if (event && event.eventType === 'subscription.canceled') {
      // Handle subscription cancellations
      const subData = event.data;
      // Update user type to 'regular' or a 'cancelled_pro' state
      // Set paddleSubscriptionStatus to 'canceled'
      // await db.update(user)
      //   .set({ type: 'regular', paddleSubscriptionStatus: subData.status })
      //   .where(eq(user.paddleSubscriptionId, subData.id));
      console.log(`Received subscription.canceled event for ${subData.id}, status: ${subData.status}`);

      // Update user in DB
      const updatedUser = await db.update(user)
        .set({
          type: 'regular', // Downgrade to free/regular user
          paddleSubscriptionStatus: subData.status, // e.g., 'canceled'
          // Optionally clear paddlePriceId or set to a free plan ID if you have one
          // paddlePriceId: null,
        })
        .where(eq(user.paddleSubscriptionId, subData.id))
        .returning();

      if (updatedUser.length > 0) {
        console.log(`User ${updatedUser[0].email} (ID: ${updatedUser[0].id}) downgraded to regular due to subscription cancellation.`);
        revalidatePath('/plans');
        revalidatePath('/chat');
        // Potentially revalidate user-specific paths
        // revalidatePath(`/user/${updatedUser[0].id}`);
      } else {
        console.warn(`Could not find user with paddleSubscriptionId: ${subData.id} to process cancellation.`);
      }
    }
    // Add more event types as needed (e.g., subscription.paused, payment_failed)

    return NextResponse.json({ received: true, eventType: event?.eventType }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing Paddle webhook:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
