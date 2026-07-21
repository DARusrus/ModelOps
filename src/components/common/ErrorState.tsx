export default function ErrorState({ error }: { error: string }) {
  return <div className="p-4 bg-red-100 text-red-700">{error}</div>;
}
