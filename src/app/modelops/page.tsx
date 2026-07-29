import InputForm from '@/components/modelops/InputForm';
import Link from 'next/link';
import { ShieldCheck, Settings, Database, Activity, FileText } from 'lucide-react';

export default function ModelOpsPage() {
  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-blue-500/30">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 border-r border-neutral-800 bg-neutral-900/30 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-neutral-800">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            ModelOps
          </Link>
        </div>
        
        <div className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-3">
            Governance Flow
          </div>
          <Link href="/modelops" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-800/50 text-white border border-neutral-700/50 font-medium text-sm">
            <Settings className="w-4 h-4 text-blue-400" />
            New Evaluation
          </Link>
          <span className="flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-500 font-medium text-sm cursor-not-allowed">
            <Database className="w-4 h-4" />
            Model Registry
          </span>
          <span className="flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-500 font-medium text-sm cursor-not-allowed">
            <Activity className="w-4 h-4" />
            Monitoring
          </span>
          <span className="flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-500 font-medium text-sm cursor-not-allowed">
            <FileText className="w-4 h-4" />
            Model Cards
          </span>
        </div>
        
        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold border border-neutral-700">
              ME
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Enterprise User</span>
              <span className="text-xs text-neutral-500">Admin</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="h-16 border-b border-neutral-800 bg-neutral-900/30 flex items-center px-4 md:hidden sticky top-0 z-10 backdrop-blur-md">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-3 h-3 text-white" />
            </div>
            ModelOps
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto">
          <InputForm />
        </div>
      </main>
    </div>
  );
}
