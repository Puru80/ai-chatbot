import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, ArrowLeft } from "lucide-react";
import type { UserType } from "@/app/(auth)/auth";

// Keep Plan type definition here or move to a shared types file if used elsewhere
export type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonVariant: "outline" | "default";
  popular: boolean;
  action?: () => void; // Optional: Define specific actions for buttons
  disabled?: boolean;
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
  const staticPlansData: Omit<Plan, 'action' | 'disabled' | 'buttonText' | 'buttonVariant'>[] = [
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
    // TODO: Add logic for upgrade/downgrade actions if needed, e.g., via props
    return {
      ...p,
      buttonText: "Get Started", // Default, can be customized via props or more logic
      buttonVariant: p.popular ? "default" : "outline" as const,
      disabled: false, // Can be managed by specific plan logic or props
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">{title}</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">{description}</p>
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
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-slate-600 ml-2">/{plan.period}</span>
              </div>
              <CardDescription className="text-base mt-2">{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {plan.features.map((feature, featureIndex) => (
                <div key={featureIndex} className="flex items-center space-x-3">
                  <Check className="size-5 text-green-600 shrink-0" />
                  <span className="text-slate-700">{feature}</span>
                </div>
              ))}
            </CardContent>

            <CardFooter className="pt-8">
              <Button
                variant={plan.buttonVariant}
                className={`w-full ${plan.buttonVariant === "default" && !plan.disabled ? "bg-blue-600 hover:bg-blue-700" : ""} ${plan.disabled ? "bg-slate-200 text-slate-500 cursor-not-allowed hover:bg-slate-200" : ""}`}
                size="lg"
                disabled={plan.disabled}
                // onClick={plan.action} // Actions would be passed or handled based on context
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
