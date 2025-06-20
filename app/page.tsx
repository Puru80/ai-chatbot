import { LandingHeader } from '@/components/landing-header';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-sky-100 dark:from-slate-900 dark:to-sky-900">
      <LandingHeader />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="text-center py-20 sm:py-28">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 text-slate-800 dark:text-white">
            Welcome to Askro AI
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl mb-10 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Unlock conversations with premium language models. Experience the future of AI interaction, enhanced for clarity and depth.
          </p>
        </section>

        {/* Enhance Prompt Feature Section */}
        <section className="py-16 sm:py-20 bg-white dark:bg-slate-800 rounded-xl shadow-xl mx-auto max-w-4xl">
          <div className="container mx-auto px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-10 text-slate-700 dark:text-white">
              Amplify Your Prompts, Magnify Results
            </h2>
            <p className="text-center text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-12">
              Our "Enhance Prompt" feature intelligently refines your inputs. This ensures the language model grasps the nuances of your request, leading to significantly more accurate, insightful, and high-quality responses. Stop just prompting, start engineering clarity.
            </p>
            {/* Optional: Could add a simple visual/icon here later */}
          </div>
        </section>

        {/* Call to Action - Try Button */}
        <section className="text-center py-20 sm:py-28">
          <a
            href="/register"
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 px-10 sm:py-5 sm:px-12 rounded-lg text-lg sm:text-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 ease-in-out"
          >
            Try Askro Now
          </a>
        </section>
      </main>

      <footer className="p-8 bg-slate-100 dark:bg-slate-800 text-center border-t border-slate-200 dark:border-slate-700">
        <p className="text-slate-600 dark:text-slate-400">&copy; {new Date().getFullYear()} Askro AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
