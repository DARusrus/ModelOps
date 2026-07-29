'use client';

import { useState } from 'react';
import { ModelOpsEvaluationResponse } from '@/types';
import ModelCardDashboard from './ModelCardDashboard';
import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIAssistantPanel, type AssistantMessage } from './AIAssistantPanel';

export default function InputForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ModelOpsEvaluationResponse | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      content: 'I’m here to help you strengthen the form inputs, evidence, and governance narrative before submission.',
    },
  ]);

  const [formData, setFormData] = useState({
    model_name: '',
    version: '1.0.0',
    dataset: '',
    intended_use: '',
    input_shape: '',
    reproducibility: '',
    // Metrics
    accuracy: '',
    f1_score: '',
    latency_ms: '',
    // Training
    epochs: '',
    learning_rate: '',
    optimizer: '',
    batch_size: '',
    // Hardware
    gpu: '',
    cpu: '',
    ram: '',
    // Deployment
    platform: '',
    target_latency: '',
    max_memory: '',
    // Arrays (comma separated)
    limitations: '',
    risks: '',
    tests: '',
    warnings: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const handleAssistantApply = (field: string, value: string) => {
    const name = field as keyof typeof formData;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setProvider(null);

    // Structure the payload correctly based on ExperimentMetadata
    const payload = {
      model_name: formData.model_name,
      version: formData.version,
      dataset: formData.dataset,
      intended_use: formData.intended_use,
      input_shape: formData.input_shape,
      reproducibility: formData.reproducibility,
      metrics: {
        ...(formData.accuracy ? { accuracy: parseFloat(formData.accuracy) } : {}),
        ...(formData.f1_score ? { f1_score: parseFloat(formData.f1_score) } : {}),
        ...(formData.latency_ms ? { latency_ms: parseFloat(formData.latency_ms) } : {}),
      },
      training: {
        ...(formData.epochs ? { epochs: parseInt(formData.epochs, 10) } : {}),
        ...(formData.learning_rate ? { learning_rate: parseFloat(formData.learning_rate) } : {}),
        ...(formData.optimizer ? { optimizer: formData.optimizer } : {}),
        ...(formData.batch_size ? { batch_size: parseInt(formData.batch_size, 10) } : {}),
      },
      hardware: {
        ...(formData.gpu ? { gpu: formData.gpu } : {}),
        ...(formData.cpu ? { cpu: formData.cpu } : {}),
        ...(formData.ram ? { ram: formData.ram } : {}),
      },
      deployment: {
        ...(formData.platform ? { platform: formData.platform } : {}),
        ...(formData.target_latency ? { target_latency: parseFloat(formData.target_latency) } : {}),
        ...(formData.max_memory ? { max_memory: formData.max_memory } : {}),
      },
      limitations: formData.limitations.split(',').map(s => s.trim()).filter(Boolean),
      risks: formData.risks.split(',').map(s => s.trim()).filter(Boolean),
      tests: formData.tests.split(',').map(s => s.trim()).filter(Boolean),
      warnings: formData.warnings.split(',').map(s => s.trim()).filter(Boolean),
    };

    try {
      const response = await fetch('/api/modelops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        let errorMsg = data.error || 'An error occurred during submission.';
        if (data.details && Array.isArray(data.details)) {
          errorMsg += ' ' + data.details.map((d: { path?: string; message?: string }) => `${d.path}: ${d.message}`).join(', ');
        }
        throw new Error(errorMsg);
      }

      setResult(data as ModelOpsEvaluationResponse);
      setProvider(data.provider ?? null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected network error occurred.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <ModelCardDashboard 
        data={result.data} 
        readiness={result.readiness} 
        risk={result.risk} 
        provider={provider} 
        onReset={() => setResult(null)} 
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">New Evaluation</h1>
        <p className="text-neutral-400">Submit your model metadata for automated AI readiness scoring, risk classification, and Model Card generation.</p>
      </div>

      <div className="mb-6 flex justify-end">
        <AIAssistantPanel
          isOpen={assistantOpen}
          onToggle={() => setAssistantOpen((current) => !current)}
          mode="form"
          context={formData}
          messages={assistantMessages}
          onMessagesChange={setAssistantMessages}
          onApplySuggestion={handleAssistantApply}
          placeholder="Ask for help with field-level improvements..."
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {error && (
          <div className="p-4 bg-red-950/50 border border-red-900/50 text-red-200 rounded-xl text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* General Details */}
        <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" /> General Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-300">Model Name *</label>
              <input type="text" name="model_name" required value={formData.model_name} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-neutral-600" placeholder="e.g. VisionTransformer-v2" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-300">Version *</label>
              <input type="text" name="version" required value={formData.version} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-neutral-600" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-neutral-300">Dataset *</label>
              <input type="text" name="dataset" required value={formData.dataset} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-neutral-600" placeholder="e.g. ImageNet-1K" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-neutral-300">Intended Use *</label>
              <textarea name="intended_use" required rows={2} value={formData.intended_use} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-neutral-600 resize-none" placeholder="Primary purpose and use case" />
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" /> Core Metrics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-300">Accuracy (0-1)</label>
              <input type="number" step="0.01" min="0" max="1" name="accuracy" value={formData.accuracy} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-300">F1 Score (0-1)</label>
              <input type="number" step="0.01" min="0" max="1" name="f1_score" value={formData.f1_score} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-300">Latency (ms)</label>
              <input type="number" step="1" min="0" name="latency_ms" value={formData.latency_ms} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all" />
            </div>
          </div>
        </section>

        {/* Training & Hardware */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" /> Training Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-300">Epochs</label>
                <input type="number" name="epochs" value={formData.epochs} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-300">Learning Rate</label>
                <input type="number" step="0.0001" name="learning_rate" value={formData.learning_rate} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-sm font-medium text-neutral-300">Optimizer</label>
                <input type="text" name="optimizer" value={formData.optimizer} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" placeholder="AdamW" />
              </div>
            </div>
          </section>

          <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" /> Infrastructure
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-sm font-medium text-neutral-300">GPU Architecture</label>
                <input type="text" name="gpu" value={formData.gpu} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" placeholder="8x NVIDIA H100" />
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-sm font-medium text-neutral-300">Deployment Platform</label>
                <input type="text" name="platform" value={formData.platform} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" placeholder="Kubernetes / Sagemaker" />
              </div>
            </div>
          </section>
        </div>

        {/* Risks and Limitations */}
        <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" /> Governance & Risk (Comma separated)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-300">Risks</label>
              <textarea name="risks" rows={2} value={formData.risks} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none" placeholder="Bias towards minority groups, data poisoning" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-300">Limitations</label>
              <textarea name="limitations" rows={2} value={formData.limitations} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none" placeholder="Only supports English, low accuracy on dark images" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-300">Automated Tests</label>
              <textarea name="tests" rows={2} value={formData.tests} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none" placeholder="pytest, fairlearn, adversarial robustness" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-300">Warnings</label>
              <textarea name="warnings" rows={2} value={formData.warnings} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none" placeholder="Do not use for automated medical diagnosis" />
            </div>
          </div>
        </section>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all shadow-lg",
              loading ? "bg-blue-600/50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 hover:-translate-y-0.5 active:translate-y-0"
            )}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {loading ? 'Synthesizing Model Card...' : 'Submit Evaluation'}
          </button>
        </div>

      </form>
    </div>
  );
}
