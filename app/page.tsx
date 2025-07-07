import Link from "next/link";
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/app/(auth)/auth';
import type { UserType } from "@/app/(auth)/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MessageSquare, Zap, Shield, Users, ArrowRight, Bot, Brain, Rocket } from "lucide-react";

export default async function LandingPage() {
  const session = await auth();
  const userType: UserType | undefined = session?.user?.type;

  const referer = (await headers()).get('referer');
  const isFromChat = referer ? new URL(referer).pathname === '/chat' : false;

  if (session?.user && !isFromChat) {
    redirect('/chat');
  }

  // if (isFromChat) {
  //   //   // User is logged in and came from /chat, show plans view
  //   //   return (
  //   //     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
  //   //       {/* Navigation */}
  //   //       <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
  //   //         <div className="flex items-center space-x-3">
  //   //           <Bot className="size-8 text-blue-600" />
  //   //           <span className="text-xl font-bold text-slate-900">Askro</span>
  //   //         </div>
  //   //         {/* No navigation links needed here as per requirement */}
  //   //       </nav>
  //   //       <PlansSection
  //   //         userType={userType}
  //   //         showBackButton={true}
  //   //         backButtonLink="/chat"
  //   //         backButtonText="Back to Chat"
  //   //       />
  //   //     </div>
  //   //   );
  //   // }

  // Default landing page for users not logged in or not coming from /chat
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <Bot className="size-8 text-blue-600" />
          <span className="text-xl font-bold text-foreground">Askro</span>
        </div>

        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-6">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground font-medium transition-colors border-b-2 border-blue-500"
            >
              Overview
            </Link>
            <Link href="/plans" className="text-muted-foreground hover:text-foreground font-medium transition-colors">
              Plans
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center space-y-8">
          <Badge variant="secondary"> {/* Removed specific blue bg/text for theme adaptability */}
            <Sparkles className="size-4 mr-2" />
            Premium AI Models Available
          </Badge>

          <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
            Unlock the Power of
            <span className="text-blue-600 block">Premium AI Conversations</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Experience next-generation AI conversations with access to premium language models. Our advanced Enhance
            Prompt feature ensures superior understanding and response quality for every interaction.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/chat">
              {/* Primary buttons usually have distinct colors, keeping blue for now, can be themed if needed */}
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
                <MessageSquare className="size-5 mr-2" />
                Start Chatting
              </Button>
            </Link>
            {/*<Button variant="outline" size="lg" className="px-8 py-3">*/}
            {/*  View Demo*/}
            {/*</Button>*/}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Why Choose Askro?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Advanced features designed to deliver the most intelligent and helpful AI conversations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card components will use their default theme styles. Removed explicit bg colors. */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center pb-4">
              {/* Icon background can be themed or kept specific if it's brand related */}
              <div className="mx-auto bg-blue-100 dark:bg-blue-900/50 size-16 rounded-full flex items-center justify-center mb-4">
                <Brain className="size-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl text-foreground">Premium Language Models</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base leading-relaxed text-muted-foreground">
                Access to the latest and most advanced AI models including GPT-4, Gemini, and other cutting-edge
                language models for superior conversation quality.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-card"> {/* Use card background */}
            <CardHeader className="text-center pb-4">
              <div className="mx-auto bg-blue-600 size-16 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="size-8 text-white" /> {/* Icon color on primary bg */}
              </div>
              <CardTitle className="text-xl text-foreground">Enhance Prompt Feature</CardTitle>
              {/* Badge color might need to be adjusted or use a theme-aware variant if available */}
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Featured</Badge>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base leading-relaxed text-muted-foreground">
                Our proprietary Enhance Prompt technology automatically optimizes your queries for better AI
                understanding and more accurate, contextual responses.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto bg-green-100 dark:bg-green-900/50 size-16 rounded-full flex items-center justify-center mb-4">
                <Zap className="size-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-xl text-foreground">Lightning Fast Responses</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base leading-relaxed text-muted-foreground">
                Optimized infrastructure ensures rapid response times while maintaining the highest quality of
                AI-generated content and conversations.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Enhanced Prompt Feature Highlight - This section has specific brand colors, likely to be kept */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {/* Badge on dark background, current style is likely fine */}
              <Badge className="bg-white/20 text-white hover:bg-white/30">
                <Rocket className="size-4 mr-2" />
                Enhance Prompt Technology
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                Transform Your Prompts Into Perfect Conversations
              </h2>
              <p className="text-lg text-blue-100 leading-relaxed">
                Our advanced Enhance Prompt feature analyzes your input and automatically optimizes it for maximum AI
                comprehension. Get more accurate, relevant, and helpful responses every time.
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="size-2 bg-white rounded-full"></div>
                  <span>Automatic context enhancement</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="size-2 bg-white rounded-full"></div>
                  <span>Improved response accuracy</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="size-2 bg-white rounded-full"></div>
                  <span>Better conversation flow</span>
                </div>
              </div>
            </div>
            {/* Styling for this section is specific and likely intended to be constant */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <div className="space-y-4">
                <div className="bg-white/20 rounded-lg p-4">
                  <p className="text-sm text-blue-100 mb-2">Your Input:</p>
                  <p className="text-white">&#34;Help me write an email&#34;</p>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="size-6 text-blue-200" />
                </div>
                <div className="bg-white/20 rounded-lg p-4">
                  <p className="text-sm text-blue-100 mb-2">Enhanced Prompt:</p>
                  <p className="text-white text-sm">
                    &#34;Help me write a professional email. Please consider the context, tone, and purpose to create an
                    effective message.&#34;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center space-y-3">
            <div className="mx-auto bg-purple-100 dark:bg-purple-900/50 size-12 rounded-full flex items-center justify-center">
              <Shield className="size-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-foreground">Secure & Private</h3>
            <p className="text-sm text-muted-foreground">Your conversations are encrypted and never stored</p>
          </div>

          <div className="text-center space-y-3">
            <div className="mx-auto bg-orange-100 dark:bg-orange-900/50 size-12 rounded-full flex items-center justify-center">
              <Users className="size-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="font-semibold text-foreground">Team Collaboration</h3>
            <p className="text-sm text-muted-foreground">Share and collaborate on AI conversations</p>
          </div>

          <div className="text-center space-y-3">
            <div className="mx-auto bg-green-100 dark:bg-green-900/50 size-12 rounded-full flex items-center justify-center">
              <MessageSquare className="size-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-foreground">Multiple Models</h3>
            <p className="text-sm text-muted-foreground">Switch between different AI models seamlessly</p>
          </div>

          <div className="text-center space-y-3">
            <div className="mx-auto bg-blue-100 dark:bg-blue-900/50 size-12 rounded-full flex items-center justify-center">
              <Zap className="size-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-foreground">Real-time Streaming</h3>
            <p className="text-sm text-muted-foreground">See responses as they&#39;re generated</p>
          </div>
        </div>
      </section>

      {/* CTA Section - This section has specific brand colors, likely to be kept */}
      <section className="bg-slate-900 text-white py-20"> {/* Dark background, text-white is fine */}
        <div className="max-w-4xl mx-auto text-center px-6 space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to Experience Premium AI Conversations?</h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto"> {/* Lighter text on dark bg is fine */}
            Join thousands of users who have upgraded their AI interactions with our premium models and enhanced prompt
            technology.
          </p>
          <Link href="/register">
            {/* Primary button, specific color is likely fine */}
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg">
              Try Askro Now
              <ArrowRight className="size-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12"> {/* Use card background for footer */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <Bot className="size-6 text-blue-600" /> {/* Brand color icon */}
              <span className="font-semibold text-foreground">Askro</span>
            </div>
            {/*<div className="flex space-x-6 text-sm text-muted-foreground">*/}
            {/*  <Link href="/privacy" className="hover:text-foreground">*/}
            {/*    Privacy Policy*/}
            {/*  </Link>*/}
            {/*  <Link href="/terms" className="hover:text-foreground">*/}
            {/*    Terms of Service*/}
            {/*  </Link>*/}
            {/*  <Link href="/contact" className="hover:text-foreground">*/}
            {/*    Contact*/}
            {/*  </Link>*/}
            {/*</div>*/}
          </div>
        </div>
      </footer>
    </div>
  )
}
