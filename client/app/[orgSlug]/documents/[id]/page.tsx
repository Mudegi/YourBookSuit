'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function DocumentDetailPage({ params }: { params: { orgSlug: string; id: string } }) {
  const router = useRouter();
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocument();
  }, [params.id]);

  async function loadDocument() {
    try {
      const res = await fetch(`/api/${params.orgSlug}/documents/upload?entityId=${params.id}`);
      if (!res.ok) throw new Error('Failed to load');

      const data = await res.json();
      setDocument(data.documents?.[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-600 mb-4 hover:text-blue-800">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

      {document && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{document.fileName}</h1>
              <p className="text-gray-600">
                Uploaded {new Date(document.uploadedAt).toLocaleDateString()} by {document.uploadedByUser?.firstName}{' '}
                {document.uploadedByUser?.lastName}
              </p>
            </div>
            <span
              className={`px-3 py-1 text-sm rounded-full ${
                document.status === 'EXTRACTED'
                  ? 'bg-green-100 text-green-800'
                  : document.status === 'PROCESSING'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
              }`}
            >
              {document.status}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-gray-600 text-sm">File Type</p>
              <p className="font-semibold">{document.fileType}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">File Size</p>
              <p className="font-semibold">{(document.fileSize / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">OCR Confidence</p>
              <p className="font-semibold">{document.ocrConfidence ? `${Number(document.ocrConfidence).toFixed(0)}%` : 'N/A'}</p>
            </div>
          </div>

          {document.extractedText && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Extracted Text</h2>
              <div className="bg-gray-50 p-4 rounded border max-h-96 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{document.extractedText}</p>
              </div>
            </div>
          )}

          {document.linkedEntities && Object.keys(document.linkedEntities).length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Linked Entities</h2>
              <div className="space-y-2">
                {Object.entries(document.linkedEntities).map(([key, value]) => (
                  <p key={key} className="text-sm">
                    <span className="font-medium">{key}:</span> {String(value)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
