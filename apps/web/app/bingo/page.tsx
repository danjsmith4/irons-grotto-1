'use client';

import Link from 'next/link';

export default function BingoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="text-center space-y-8">
        <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          Coming Soon...
        </h1>
        
        <p className="text-2xl text-gray-300 max-w-2xl mx-auto">
          We're working on something amazing for the Irons Grotto community
        </p>
        
        <Link
          href="/"
          className="inline-flex items-center px-8 py-4 text-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
        >
          Take Me Back to Safety
        </Link>
      </div>
    </div>
  );
}