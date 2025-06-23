import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, Check, Sparkles, Zap, Shield, ArrowLeft } from "lucide-react" // Added ArrowLeft
import { auth } from "@/app/(auth)/auth"
import type { UserType } from "@/app/(auth)/auth"

type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonVariant: "outline" | "default";
  popular: boolean;
  action?: () => void;
  disabled?: boolean;
};

interface PlansPageProps {
  searchParams?: {
    from?: string;
  };
}

export default async function PlansPage({ searchParams }: PlansPageProps) { // Added searchParams prop
  const session = await auth();
  const userType: UserType | undefined = session?.user?.type;

  const fromSource = searchParams?.from;
  let backLink = "/chat";
  let backText = "Back to Chat";

  if (fromSource === "home") {
    backLink = "/";
    backText = "Back to Home";
  }

  const staticPlansData = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for trying out our AI chat",
      features: ["5 messages per day", "Basic AI model access", "Standard response time", "Prompt Enhancer"],
      buttonText: "Get Started",
      buttonVariant: "outline" as const,
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
      buttonText: "Get Started",
      buttonVariant: "default" as const,
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
    if (p.name === "Pro" && (userType === "regular")) {
      // This is where an "Upgrade to Pro" button could be specifically set up
      // For now, it will show "Get Started" as per current non-disabled logic
    }
    return p;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <Bot className="size-8 text-blue-600" />
          <span className="text-xl font-bold text-slate-900">Askro</span>
        </div>

        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              Overview
            </Link>
            <Link
              href="/plans" // Keep this as /plans, not with query params for the nav itself
              className="text-slate-700 hover:text-slate-900 font-medium transition-colors border-b-2 border-blue-500"
            >
              Plans
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Choose Your Plan</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Select the perfect plan for your AI conversation needs. Upgrade or downgrade at any time.
          </p>
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
                  onClick={plan.action}
                >
                  {plan.buttonText}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Back Button Section - Added */}
        <div className="max-w-4xl mx-auto w-full flex justify-center mt-12">
          <Button asChild variant="outline" className="text-lg px-8 py-6 hover:scale-105 transition-transform duration-200">
            <Link href={backLink}>
              <ArrowLeft className="size-5 mr-2" />
              {backText}
            </Link>
          </Button>
        </div>

        {/* Features Comparison - this section can remain as is */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Why Choose ChatAI Pro?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
              <div className="mx-auto bg-blue-100 size-16 rounded-full flex items-center justify-center">
                <Sparkles className="size-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Enhanced Prompts</h3>
              <p className="text-slate-600">
                Our proprietary technology automatically optimizes your prompts for better AI understanding and
                responses.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="mx-auto bg-green-100 size-16 rounded-full flex items-center justify-center">
                <Zap className="size-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Lightning Fast</h3>
              <p className="text-slate-600">
                Optimized infrastructure ensures rapid response times while maintaining the highest quality of AI
                responses.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="mx-auto bg-purple-100 size-16 rounded-full flex items-center justify-center">
                <Shield className="size-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Secure & Private</h3>
              <p className="text-slate-600">
                Your conversations are encrypted and never stored. We prioritize your privacy and data security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
