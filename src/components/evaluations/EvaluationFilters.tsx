'use client';

import { useRouter } from 'next/navigation';
import { Filter, RotateCcw } from 'lucide-react';

interface EvaluationFiltersProps {
  values: URLSearchParams;
}

function value(values: URLSearchParams, key: string) {
  return values.get(key) ?? '';
}

export default function EvaluationFilters({ values }: EvaluationFiltersProps) {
  const router = useRouter();

  function applyFilters(formData: FormData) {
    const query = new URLSearchParams();
    for (const key of ['q', 'state', 'creator', 'created_from', 'created_to', 'readiness_min', 'readiness_max', 'sort']) {
      const fieldValue = formData.get(key);
      if (typeof fieldValue === 'string' && fieldValue.trim() && !(key === 'sort' && fieldValue === 'newest')) {
        query.set(key, fieldValue.trim());
      }
    }
    router.push(query.size ? `/evaluations?${query.toString()}` : '/evaluations');
  }

  const inputClass = 'min-h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-1';

  return (
    <form key={values.toString()} action={applyFilters} className="border border-slate-300 bg-slate-50 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-emerald-800" aria-hidden="true" />
        <h2 className="text-sm font-black text-slate-950">Filter organization records</h2>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-bold text-slate-700 xl:col-span-2">
          Model name or version
          <input name="q" type="search" maxLength={100} defaultValue={value(values, 'q')} className={`${inputClass} mt-1`} placeholder="Search governed records" />
        </label>
        <label className="text-xs font-bold text-slate-700">
          Workflow state
          <select name="state" defaultValue={value(values, 'state')} className={`${inputClass} mt-1`}>
            <option value="">All states</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="changes_requested">Changes requested</option>
          </select>
        </label>
        <label className="text-xs font-bold text-slate-700">
          Creator
          <select name="creator" defaultValue={value(values, 'creator')} className={`${inputClass} mt-1`}>
            <option value="">All organization members</option>
            <option value="me">Created by me</option>
          </select>
        </label>
        <label className="text-xs font-bold text-slate-700">
          Created from
          <input name="created_from" type="date" defaultValue={value(values, 'created_from')} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-xs font-bold text-slate-700">
          Created through
          <input name="created_to" type="date" defaultValue={value(values, 'created_to')} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-xs font-bold text-slate-700">
          Minimum readiness
          <input name="readiness_min" type="number" min={0} max={100} defaultValue={value(values, 'readiness_min')} className={`${inputClass} mt-1`} placeholder="0" />
        </label>
        <label className="text-xs font-bold text-slate-700">
          Maximum readiness
          <input name="readiness_max" type="number" min={0} max={100} defaultValue={value(values, 'readiness_max')} className={`${inputClass} mt-1`} placeholder="100" />
        </label>
        <label className="text-xs font-bold text-slate-700 md:col-span-2 xl:col-span-1">
          Sort order
          <select name="sort" defaultValue={value(values, 'sort') || 'newest'} className={`${inputClass} mt-1`}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
          Apply filters
        </button>
        <button type="button" onClick={() => router.push('/evaluations')} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
        </button>
      </div>
    </form>
  );
}
