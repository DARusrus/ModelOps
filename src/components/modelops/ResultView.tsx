import { ModelCardOutput } from '@/types';

interface ResultViewProps {
  data: ModelCardOutput;
}

export default function ResultView({ data }: ResultViewProps) {
  return (
    <div className="p-4 border border-neutral-800 rounded-xl mt-4 bg-neutral-900/50">
      <h2 className="text-lg font-semibold mb-3">Model Card Draft</h2>
      <pre className="whitespace-pre-wrap break-words text-sm text-neutral-300">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
