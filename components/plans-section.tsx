'use client'

import Link from "next/link";
import { useRouter } from "next/navigation"; // Added for redirection
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, ArrowLeft } from "lucide-react";
import type { UserType } from "@/app/(auth)/auth";
import type {Plan} from "@/constants/plans"
import {PlansData} from "@/constants/plans";
import type { Session } from "next-auth"; // Import Session type
import { useActionState, useEffect, useTransition } from "react"; // For server action
import { toast } from "sonner"; // For feedback
import { cancelProSubscription, type CancelProSubscriptionActionState } from "@/app/(auth)/actions";
// import {Paddle} from "@paddle/paddle-node-sdk"; // Import the action

interface PlansSectionProps {
  userType?: UserType;
  session?: Session | null;
  showBackButton?: boolean;
  backButtonLink?: string;
  backButtonText?: string;
  title?: string;
  description?: string;
}

export function PlansSection({
                               userType,
                               session, // Destructure session
                               showBackButton = false,
                               backButtonLink = "/chat",
                               backButtonText = "Back to Chat",
                               title = "Choose Your Plan",
                               description = "Select the perfect plan for your AI conversation needs. Upgrade or downgrade at any time.",
                             }: PlansSectionProps) {
  const router = useRouter(); // Added for redirection
  const [isPending, startTransition] = useTransition();

  const [cancelActionState, cancelAction] = useActionState<CancelProSubscriptionActionState, FormData>(
    cancelProSubscription,
    { status: 'idle' },
  );

  useEffect(() => {
    if (cancelActionState.status === 'success') {
      toast.success("Subscription cancelled successfully. You are now on the Free plan.");
      // The webhook will update the user record, and revalidation should refresh UI.
      // router.refresh(); // Or rely on revalidatePath from action
    } else if (cancelActionState.status === 'failed') {
      toast.error(`Cancellation failed: ${cancelActionState.error || 'Unknown error'}`);
    } else if (cancelActionState.status === 'not_pro_user') {
      toast.error("You are not currently on a Pro plan.");
    } else if (cancelActionState.status === 'missing_subscription_id') {
      toast.error("Could not find your subscription ID to cancel.");
    } else if (cancelActionState.status === 'unauthenticated') {
      toast.error("You need to be logged in to cancel a subscription.");
      router.push('/login');
    }
  }, [cancelActionState, router]);

  const handleCancelPro = () => {
    startTransition(() => {
      // FormData is not strictly needed by the action but is part of useActionState's pattern
      cancelAction(new FormData());
    });
  };

  const plans: Plan[] = PlansData.map(p => {
    const isCurrent =
      (p.name === "Pro" && userType === "pro") ||
      (p.name === "Free" && (userType === "regular"));

    if (isCurrent) {
      return {
        ...p,
        buttonText: "Current Plan",
        buttonVariant: "outline" as const,
        disabled: true,
      };
    }

    let action = undefined;
    let buttonText = "Get Started"; // Default
    let disabled = false;

    if (p.name === "Free" && !userType) { // Not logged in, Free plan
      action = () => router.push('/register');
    } else if (p.name === "Pro") { // Pro plan
      buttonText = userType === "regular" ? "Upgrade to Pro" : "Get Pro"; // Handles logged-in regular and non-logged-in
      const proPlanPriceId = p.priceId;

      action = () => {
        const proPriceId = proPlanPriceId ? proPlanPriceId['month'] : null;
        if (!proPriceId) {
          toast.error("Pro plan price ID is not configured.");
          return;
        }

        if (!session) {
          // User is not logged in. Redirect to login with redirect URL to checkout.
          router.push(`/login?redirect=/checkout/${proPriceId}`);
        } else {
          // User is logged in. Redirect directly to checkout.
          router.push(`/checkout/${proPriceId}`);
        }
      };
    } else if (p.name === "Free" && userType === "pro") { // Logged in as Pro, Free plan
      // Action for downgrading to Free (implies cancellation)
      buttonText = "Downgrade to Free";
      action = handleCancelPro;
      disabled = isPending; // Disable button while action is pending
    }

    return {
      ...p,
      buttonText,
      buttonVariant: p.popular && !isCurrent ? "default" : "outline" as const,
      disabled: disabled || isCurrent, // isCurrent implies disabled
      action,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{title}</h1>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto">{description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative ${plan.popular ? "border-blue-500 shadow-xl scale-105" : "border-slate-200"} ${plan.disabled ? "opacity-75" : ""}`}
          >
            {plan.popular && !plan.disabled && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-600 text-white px-4 py-1">
                  <Sparkles className="size-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-bold text-gray-400">{plan.name}</CardTitle>
              <div className="mt-4 pt-6">
                <span className="text-4xl font-bold text-slate-100">{plan.price}</span>
                <span className="text-slate-100 ml-2">/{plan.period}</span>
              </div>
              <CardDescription className="text-base mt-2">{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {plan.features.map((feature, featureIndex) => (
                <div key={featureIndex} className="flex items-center space-x-3">
                  <Check className="size-5 text-green-600 shrink-0" />
                  <span className="text-slate-100">{feature}</span>
                </div>
              ))}
            </CardContent>

            <CardFooter className="pt-8">
              <Button
                variant={plan.buttonVariant}
                className={`w-full ${plan.buttonVariant === "default" && !plan.disabled ? "bg-blue-600 hover:bg-blue-700" : ""} ${plan.disabled ? "bg-slate-200 text-slate-500 cursor-not-allowed hover:bg-slate-200" : ""}`}
                size="lg"
                disabled={plan.disabled}
                onClick={plan.action} // Use the action from the plan object
              >
                {plan.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {showBackButton && (
        <div className="max-w-4xl mx-auto w-full flex justify-center mt-12">
          <Button asChild variant="outline" className="text-lg px-8 py-6 hover:scale-105 transition-transform duration-200">
            <Link href={backButtonLink!}>
              <ArrowLeft className="size-5 mr-2" />
              {backButtonText}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
