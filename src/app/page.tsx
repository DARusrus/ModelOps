import Link from 'next/link';
import { ArrowRight, ShieldCheck, Activity, Cpu } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col font-sans selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            ModelOps
          </div>
          <div className="flex items-center gap-6">
            <Link href="https://github.com" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
              Documentation
            </Link>
            <Link href="/modelops" className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-neutral-200 transition-all">
              Go to App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-6 pt-32 pb-24">
        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm text-sm font-medium text-neutral-300 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-blue-500" />
            ModelOps Enterprise 2.0 is now live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent leading-[1.1]">
            Ship AI Models with Absolute Confidence
          </h1>
          
          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mb-12 leading-relaxed">
            The intelligent platform for ML Governance, automated risk assessment, and comprehensive model cards. Built for enterprise teams scaling AI securely.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/modelops" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-neutral-200 hover:scale-[1.02] active:scale-[0.98] transition-all">
              Start Evaluation <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#features" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-neutral-800 bg-neutral-900 text-white font-semibold hover:bg-neutral-800 hover:border-neutral-700 transition-all">
              Learn More
            </Link>
          </div>
        </div>

        <div className="mt-24 w-full max-w-5xl rounded-2xl border border-neutral-800 bg-neutral-900/50 p-2 shadow-2xl relative z-10 overflow-hidden" aria-label="Product preview">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-950 pointer-events-none" />
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden flex flex-col h-[400px]">
            <div className="h-12 border-b border-neutral-800 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 p-6 grid grid-cols-3 gap-6 opacity-70">
              <div className="col-span-1 space-y-4">
                <div className="h-4 w-1/3 bg-neutral-800 rounded" />
                <div className="h-10 w-full bg-neutral-800 rounded" />
                <div className="h-10 w-full bg-neutral-800 rounded" />
                <div className="h-10 w-full bg-neutral-800 rounded" />
              </div>
              <div className="col-span-2 space-y-4">
                <div className="h-4 w-1/4 bg-neutral-800 rounded" />
                <div className="h-64 w-full bg-neutral-800 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Section */}
      <section id="features" className="py-24 bg-neutral-950 relative z-10 border-t border-neutral-800">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-4 p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold">Automated Readiness</h3>
              <p className="text-neutral-400 leading-relaxed">
                Our multi-engine pipeline automatically grades your model against robust metrics and hardware constraints.
              </p>
            </div>
            <div className="flex flex-col gap-4 p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50">
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold">Risk Classification</h3>
              <p className="text-neutral-400 leading-relaxed">
                Deterministic risk boundaries paired with AI-driven bias and fairness assessments keep you compliant.
              </p>
            </div>
            <div className="flex flex-col gap-4 p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Cpu className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold">LLM Driven Cards</h3>
              <p className="text-neutral-400 leading-relaxed">
                Intelligently synthesized Model Cards using the fastest inference engines to generate comprehensive documentation.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 border-t border-neutral-800 text-center text-sm text-neutral-500 bg-neutral-950">
        <p>© {new Date().getFullYear()} ModelOps Enterprise. All rights reserved.</p>
      </footer>
    </div>
  );
}
