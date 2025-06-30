import { auth } from "@/app/(auth)/auth";
import { paddle } from "@/lib/paddle";
import { redirect } from "next/navigation";
import { toast } from "sonner"; // Assuming sonner is used for toasts globally

interface CheckoutPageProps {
  params: {
    priceId: string;
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const session = await auth();
  const { priceId } = params;

  if (!priceId) {
    // This case should ideally not be reached if routing is set up correctly
    // and links provide a priceId.
    // Redirect to plans page or show an error.
    // Using toast here is problematic as this is a server component before redirect.
    // Consider redirecting with an error query param if necessary.
    console.error("Checkout attempt without priceId.");
    return redirect("/plans?error=missing_price_id");
  }

  if (!session?.user?.id) {
    // User is not authenticated, redirect to login.
    // Pass the intended checkout destination.
    return redirect(`/login?redirect=/checkout/${priceId}`);
  }

  try {
    const items = [{ price_id: priceId, quantity: 1 }];
    const customData = { userId: session.user.id };

    // Prepare checkout options
    let checkoutOptions: any = {
      items: items,
      custom_data: customData,
      // success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={paddle_transaction_id}`, // Example success URL
      // cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/plans`, // Example cancel URL
    };

    // If user has a paddle_customer_id, use it to link the transaction
    // to the existing customer in Paddle.
    if (session.user.paddleCustomerId) {
      checkoutOptions.customer_id = session.user.paddleCustomerId;
    } else if (session.user.email) {
      // If no paddle_customer_id, but we have an email, we can pass customer details
      // to create/match a customer in Paddle.
      // Note: The SDK might handle email-based customer creation/matching automatically if customer_id is omitted.
      // For explicit control, you might use:
      // checkoutOptions.customer = { email: session.user.email };
      // However, for subscriptions, Paddle often requires a customer_id.
      // It's generally better to create/retrieve a customer first if one doesn't exist.
      // For simplicity here, we'll rely on Paddle to handle customer creation if customer_id is not provided.
      // If this were a production app, ensuring a customer exists and using customer_id is more robust.
    }


    // The Paddle Node SDK v4+ typically uses paddle.transactions.create for one-off
    // and paddle.subscriptions.create for subscriptions.
    // Let's assume we are creating a transaction that might convert to a subscription.
    // The API docs state `transaction.checkout.url` is returned.
    const transaction = await paddle.transactions.create(checkoutOptions);

    if (transaction && transaction.checkout?.url) {
      redirect(transaction.checkout.url);
    } else {
      console.error("Failed to create Paddle checkout session or URL missing:", transaction);
      // Redirect to an error page or plans page with an error message
      // Toast won't work here directly before redirect.
      return redirect("/plans?error=checkout_creation_failed");
    }
  } catch (error) {
    console.error("Error creating Paddle checkout session:", error);
    // Redirect to an error page or plans page with an error message
    return redirect("/plans?error=checkout_error");
  }
}
