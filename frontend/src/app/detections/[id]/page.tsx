export default function DetectionDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Detection {params.id}</h1>
    </main>
  );
}
