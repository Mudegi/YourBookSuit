import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">Y</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">YourBooks</h1>
                <p className="text-xs text-gray-500">Enterprise ERP</p>
              </div>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-gray-700 hover:text-blue-600">Home</Link>
              <Link href="/features" className="text-gray-700 hover:text-blue-600">Features</Link>
              <Link href="/pricing" className="text-gray-700 hover:text-blue-600">Pricing</Link>
              <Link href="/contact" className="text-gray-700 hover:text-blue-600">Contact</Link>
              <Link href="/login" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Login</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* About Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">About YourBooks ERP</h1>
          <p className="text-xl text-gray-600 mb-12">
            Building the future of enterprise resource planning with modern technology and user-first design.
          </p>

          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                To empower businesses of all sizes with enterprise-grade accounting and ERP solutions 
                that are simple to use, highly scalable, and built on modern technology standards. 
                We believe that professional-grade financial management shouldn't be complicated or expensive.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Story</h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-4">
                YourBooks ERP was born from the frustration of dealing with outdated, complex, and expensive 
                accounting systems. We saw businesses struggling with software that was either too simplistic 
                for their needs or overwhelmingly complex and costly.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed">
                Built with Next.js, TypeScript, and modern web technologies, YourBooks ERP combines the 
                power of traditional ERP systems with the flexibility and user experience of modern web applications. 
                Our double-entry accounting system ensures accuracy while our multi-tenant architecture provides 
                enterprise-grade security and scalability.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Core Values</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-lg mb-2 text-blue-600">Simplicity</h3>
                  <p className="text-gray-600">Complex problems deserve simple solutions. We focus on intuitive design and user-friendly interfaces.</p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-blue-600">Accuracy</h3>
                  <p className="text-gray-600">Built on double-entry accounting principles, ensuring every transaction is balanced and accurate.</p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-blue-600">Scalability</h3>
                  <p className="text-gray-600">From startups to enterprises, our multi-tenant architecture grows with your business.</p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-blue-600">Transparency</h3>
                  <p className="text-gray-600">Real-time reporting and complete audit trails give you full visibility into your finances.</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
              <h2 className="text-3xl font-bold mb-4">Technology Stack</h2>
              <p className="text-blue-100 mb-6">Built with modern, battle-tested technologies:</p>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="font-bold mb-1">Frontend</div>
                  <div>Next.js, React, TypeScript, Tailwind CSS</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="font-bold mb-1">Backend</div>
                  <div>Node.js, Prisma ORM, PostgreSQL</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="font-bold mb-1">Infrastructure</div>
                  <div>Multi-tenant, Cloud-ready, Scalable</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link href="/pricing" className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-lg transition-all inline-block">
              View Pricing Plans →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2025 YourBooks ERP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
