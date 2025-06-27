export type Plan = {
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
  priceId?: Record<string, string>;
};

export const PlansData: Omit<Plan, 'action' | 'disabled' | 'buttonText' | 'buttonVariant'>[] = [
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
    priceId: {month: "pri_01jynh4qr5g8dgy88h1gbzsrm0"}
  },
];
