import Link from "next/link";
import { auth } from "@/app/(auth)/auth";
import type { UserType } from "@/app/(auth)/auth";
import { Bot, Sparkles, Zap, Shield } from "lucide-react";
import { PlansSection } from "@/components/plans-section";
import {headers} from "next/headers";

interface PlansPageProps {
  searchParams?: {
    from?: string;
  };
}

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const session = await auth();
  const userType: UserType | undefined = session?.user?.type;

  const referer = (await headers()).get('referer');
  const isFromChat = referer ? new URL(referer).pathname === '/chat' : false;
  const showMinimalHeader = !!session?.user && isFromChat;

  const fromSource = (await searchParams)?.from;
  let backLink = "/chat"; // Default back link if user is logged in
  let backText = "Back to Chat";
  // Show back button if user is logged in, or if explicitly coming from home.
  let showBackButton = !!session?.user || fromSource === "home";


  if (fromSource === "home") {
    backLink = "/";
    backText = "Back to Home";
  } else if (!session?.user) {
    // If user is not logged in and not coming from home, adjust button visibility
    showBackButton = false;
  }
  // If session.user exists and fromSource is not 'home', defaults for backLink and backText are fine.

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <Bot className="size-8 text-blue-600" /> {/* Brand color icon */}
          <span className="text-xl font-bold text-foreground">Askro</span>
        </div>

        {!showMinimalHeader && (<div className="flex items-center space-x-8">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-muted-foreground hover:text-foreground font-medium transition-colors">
              Overview
            </Link>
            <Link
              href="/plans"
              className="text-muted-foreground hover:text-foreground font-medium transition-colors border-b-2 border-blue-500" // Active link might keep brand color border
            >
              Plans
            </Link>
          </div>
        </div>)}
      </nav>

      <PlansSection
        userType={userType}
        showBackButton={showBackButton}
        backButtonLink={backLink}
        backButtonText={backText}
        // Title and description are default in PlansSection, matching what was here
      />

      {/* Features Comparison */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="mt-20"> {/* This spacing might need adjustment depending on PlansSection's own padding */}
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Why Choose Askro Pro?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
              <div className="mx-auto bg-blue-100 dark:bg-blue-900/50 size-16 rounded-full flex items-center justify-center">
                <Sparkles className="size-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Enhanced Prompts</h3>
              <p className="text-muted-foreground">
                Our proprietary technology automatically optimizes your prompts for better AI understanding and
                responses.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="mx-auto bg-green-100 dark:bg-green-900/50 size-16 rounded-full flex items-center justify-center">
                <Zap className="size-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Optimized infrastructure ensures rapid response times while maintaining the highest quality of AI
                responses.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="mx-auto bg-purple-100 dark:bg-purple-900/50 size-16 rounded-full flex items-center justify-center">
                <Shield className="size-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Secure & Private</h3>
              <p className="text-muted-foreground">
                Your conversations are encrypted and never stored. We prioritize your privacy and data security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
