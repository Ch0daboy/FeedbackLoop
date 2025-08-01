import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">FeedbackLoop</h1>
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">AI-Powered</span>
            </div>
            <nav className="flex space-x-4">
              <Link href="/feedback?projectId=demo" className="text-gray-600 hover:text-gray-900">
                Demo
              </Link>
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Turn Feedback Into
            <span className="text-blue-600"> Code</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Automatically analyze user feedback with AI and generate code implementations.
            From bug reports to feature requests, let AI handle the heavy lifting.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/feedback?projectId=demo"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Try Demo
            </Link>
            <Link
              href="/dashboard"
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              View Dashboard
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mb-4 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Analysis</h3>
            <p className="text-gray-600">
              Google Gemini analyzes feedback to understand sentiment, priority, and category automatically.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="bg-green-100 rounded-full p-3 w-12 h-12 mb-4 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Code Generation</h3>
            <p className="text-gray-600">
              Claude AI generates production-ready code implementations based on analyzed feedback.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="bg-purple-100 rounded-full p-3 w-12 h-12 mb-4 flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-2a2 2 0 00-2-2H8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Auto Implementation</h3>
            <p className="text-gray-600">
              Automatically creates branches, commits code, and opens pull requests on GitHub.
            </p>
          </div>
        </div>

        {/* How it Works */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 font-bold">1</div>
              <h3 className="font-semibold text-gray-900 mb-2">Submit Feedback</h3>
              <p className="text-gray-600 text-sm">Users submit feedback through a simple form</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 font-bold">2</div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Analysis</h3>
              <p className="text-gray-600 text-sm">Gemini analyzes and categorizes the feedback</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 font-bold">3</div>
              <h3 className="font-semibold text-gray-900 mb-2">Generate Code</h3>
              <p className="text-gray-600 text-sm">Claude creates implementation code</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 font-bold">4</div>
              <h3 className="font-semibold text-gray-900 mb-2">Auto Deploy</h3>
              <p className="text-gray-600 text-sm">Code is committed and PR is created</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 FeedbackLoop. Powered by AI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
