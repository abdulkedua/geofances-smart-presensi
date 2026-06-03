import { Database } from 'lucide-react';

interface EmptyStateProps {
  message: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Database className="mx-auto h-12 w-12 text-gray-300" />
      <h3 className="mt-2 text-sm font-semibold text-gray-900">Tidak ada data</h3>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
    </div>
  );
}
