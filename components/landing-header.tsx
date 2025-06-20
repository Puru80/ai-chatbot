import Link from 'next/link';

export function LandingHeader() {
  return (
    <header className="p-4 bg-white border-b border-gray-200">
      <div className="container mx-auto flex justify-between items-center">
        <nav className="flex items-center space-x-6">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            Overview
          </Link>
          <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
            Plans
          </Link>
        </nav>
        <div className="text-xl font-semibold text-gray-800">
          Askro
        </div> {/* App Name/Logo Placeholder */}
      </div>
    </header>
  );
}
