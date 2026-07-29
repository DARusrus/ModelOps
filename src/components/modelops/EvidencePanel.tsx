import { ModelCardOutput } from '@/types';

interface EvidencePanelProps {
  evidence: ModelCardOutput['evidence'];
}

export default function EvidencePanel({ evidence }: EvidencePanelProps) {
  return (
    <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl mt-4">
      <h3 className="text-lg font-semibold mb-3">Evidence Panel</h3>
      {evidence && evidence.length > 0 ? (
        <ul className="list-disc list-inside space-y-1 text-sm text-neutral-300">
          {evidence.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">No evidence items available.</p>
      )}
    </div>
  );
}
