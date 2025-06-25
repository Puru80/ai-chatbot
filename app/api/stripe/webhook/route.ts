import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { db } from '@/lib/db/queries';
import { user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('Stripe-Signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      // Fulfill the purchase...
      console.log('Checkout session completed:', session);
      // TODO: Update user type to 'pro' and store Stripe customer/subscription IDs
      if (session.metadata?.userId && session.subscription) {
        await db
          .update(user)
          .set({
            type: 'pro',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
           })
          .where(eq(user.id, session.metadata.userId));
      }
      break;
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      // Handle subscription cancellation...
      console.log('Subscription deleted:', subscription);
      // TODO: Update user type to 'regular'
      await db
        .update(user)
        .set({ type: 'regular', stripeSubscriptionId: null }) // Clear subscription ID
        .where(eq(user.stripeCustomerId!, subscription.customer as string)); // Find user by customer ID
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
