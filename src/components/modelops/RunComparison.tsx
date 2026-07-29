import { CompareRunsOutput } from '@/types';

interface RunComparisonProps {
  runs: CompareRunsOutput[];
}

export default function RunComparison({ runs }: RunComparisonProps) {
  return (
    <div className="p-4 border border-neutral-800 rounded-xl mt-4 bg-neutral-900/50">
      <h3 className="text-lg font-semibold mb-3">Run Comparison</h3>
      {runs.length > 0 ? (
        <ul className="space-y-2 text-sm text-neutral-300">
          {runs.map((run, index) => (
            <li key={`${run.model_name_1}-${run.version_1}-${index}`} className="rounded-lg border border-neutral-800 p-3">
              {run.summary.join(' ')}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">No comparisons available.</p>
      )}
    </div>
  );
}
