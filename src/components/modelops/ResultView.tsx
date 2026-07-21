export default function ResultView({ data }: { data: any }) {
  return (
    <div className="p-4 border rounded mt-4">
      <h2>Model Card Draft</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
