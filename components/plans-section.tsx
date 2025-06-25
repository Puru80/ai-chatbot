"use client"; // Add this line to make it a client component

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, ArrowLeft, Loader2 } from "lucide-react"; // Added Loader2
import type { UserType } from "@/app/(auth)/auth";
import { createCheckoutSession, cancelSubscription, type CreateCheckoutSessionActionState, type CancelSubscriptionActionState } from '@/app/(auth)/actions';
import { useTransition, useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useSearchParams } from 'next/navigation'; // For reading query params
import { toast } from "@/components/ui/use-toast"; // For showing toast messages

// Keep Plan type definition here or move to a shared types file if used elsewhere
export type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonVariant: "outline" | "default" | "destructive"; // Added destructive variant
  popular: boolean;
  action?: () => void; // Optional: Define specific actions for buttons
  disabled?: boolean;
  isPro?: boolean; // Added to identify Pro plan
  isCancel?: boolean; // Added to identify Cancel button
};

interface PlansSectionProps {
  userType?: UserType; // Make userType optional as it might not always be available or needed for display
  showBackButton?: boolean;
  backButtonLink?: string;
  backButtonText?: string;
  title?: string;
  description?: string;
}

export function PlansSection({
                               userType,
                               showBackButton = false,
                               backButtonLink = "/chat",
                               backButtonText = "Back to Chat",
                               title = "Choose Your Plan",
                               description = "Select the perfect plan for your AI conversation needs. Upgrade or downgrade at any time.",
                             }: PlansSectionProps) {
  const [isPendingUpgrade, startUpgradeTransition] = useTransition();
  const [isPendingCancel, startCancelTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      toast({
        title: "Checkout Status",
        description: "Welcome back! If your payment was successful, your plan will be updated shortly.",
      });
      // Optionally, remove session_id from URL to prevent re-triggering
      // window.history.replaceState(null, '', window.location.pathname);
    }
  }, [searchParams]);


  const handleUpgrade = async () => {
    setActionError(null);
    startUpgradeTransition(async () => {
      const result = await createCheckoutSession({ status: 'idle' }, new FormData());

      if (result.status === 'success' && result.sessionId) {
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);
        if (stripe) {
          const { error } = await stripe.redirectToCheckout({ sessionId: result.sessionId });
          if (error) {
            setActionError(error.message || 'Failed to redirect to Stripe.');
            toast({ title: "Error", description: error.message || "Could not redirect to payment.", variant: "destructive" });
          }
        } else {
          setActionError('Stripe.js failed to load.');
          toast({ title: "Error", description: "Payment gateway failed to load.", variant: "destructive" });
        }
      } else {
        setActionError(result.error || 'Failed to initiate upgrade.');
        toast({ title: "Upgrade Error", description: result.error || "Could not initiate upgrade.", variant: "destructive" });
      }
    });
  };

  const handleCancelSubscription = async () => {
    setActionError(null);
    startCancelTransition(async () => {
      const result = await cancelSubscription({ status: 'idle' }, new FormData());
      if (result.status === 'success') {
        toast({
          title: "Subscription Canceled",
          description: "Your Pro plan subscription has been canceled. You will retain Pro access until the end of your current billing period.",
        });
        // UI will update once webhook processes and revalidation occurs
      } else {
        setActionError(result.error || 'Failed to cancel subscription.');
        toast({
          title: "Cancellation Error",
          description: result.error || "Could not cancel subscription. Please try again or contact support.",
          variant: "destructive",
        });
      }
    });
  };


  const staticPlansData: Omit<Plan, 'action' | 'disabled' | 'buttonText' | 'buttonVariant' | 'isPro' | 'isCancel'>[] = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for trying out our AI chat",
      features: ["5 messages per day", "Basic AI model access", "Standard response time", "Prompt Enhancer"],
      popular: false,
    },
    {
      name: "Pro",
      price: "$15",
      period: "per month",
      description: "Best for regular users and professionals",
      features: [
        "50 messages per day",
        "Premium AI models (GPT-4, Gemini)",
        "Enhance Prompt feature",
        "Priority response time",
      ],
      popular: true,
    },
  ];

  const plans: Plan[] = staticPlansData.map(p => {
    const isCurrentUserPro = userType === "pro";
    const isCurrentPlanPro = p.name === "Pro";

    if (isCurrentPlanPro) { // Pro Plan Card
      if (isCurrentUserPro) { // User is Pro
        return {
          ...p,
          isPro: true,
          buttonText: isPendingCancel ? "Cancelling..." : "Cancel Subscription",
          buttonVariant: "destructive" as const,
          disabled: isPendingCancel,
          action: handleCancelSubscription,
          isCancel: true,
        };
      } else { // User is not Pro, show Upgrade
        return {
          ...p,
          isPro: true,
          buttonText: isPendingUpgrade ? "Processing..." : "Upgrade to Pro",
          buttonVariant: "default" as const,
          disabled: isPendingUpgrade,
          action: handleUpgrade,
        };
      }
    } else { // Free Plan Card
      return {
        ...p,
        isPro: false,
        buttonText: userType === "regular" ? "Current Plan" : "Get Started",
        buttonVariant: "outline" as const,
        disabled: userType === "regular",
      };
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{title}</h1>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto">{description}</p>
      </div>

      {actionError && (
        <div className="mb-8 max-w-md mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative ${plan.popular && !plan.isCancel ? "border-blue-500 shadow-xl scale-105" : "border-slate-200"} ${(plan.disabled && !plan.isPro && !plan.isCancel) ? "opacity-75" : ""}`}
          >
            {plan.popular && !plan.disabled && !plan.isCancel && (
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
                className={`w-full
                  ${plan.buttonVariant === "default" && !plan.disabled ? "bg-blue-600 hover:bg-blue-700" : ""}
                  ${plan.buttonVariant === "destructive" && !plan.disabled ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                  ${plan.disabled ? "bg-slate-200 text-slate-500 cursor-not-allowed hover:bg-slate-200" : ""}`}
                size="lg"
                disabled={plan.disabled || (isPendingUpgrade && plan.isPro && !plan.isCancel) || (isPendingCancel && plan.isCancel)}
                onClick={plan.action}
              >
                {(isPendingUpgrade && plan.isPro && !plan.isCancel) || (isPendingCancel && plan.isCancel) ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
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
