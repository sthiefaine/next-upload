'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';

interface BlobItem {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
  sizeFormatted: string;
}

interface BlobResponse {
  success: boolean;
  files: BlobItem[];
  totalFiles: number;
  totalSize: number;
  totalSizeFormatted: string;
  error?: string;
}

interface ImportBlobResponse {
  success: boolean;
  message: string;
  file?: {
    name: string;
    path: string;
    size: number;
    sizeFormatted: string;
  };
  deletedFromBlob?: boolean;
  error?: string;
}

export default function UploadBlobPage() {
  const { user, isAuthenticated, token } = useAuthStore();
  const [isLoadingBlobs, setIsLoadingBlobs] = useState(false);
  const [isImportingBlob, setIsImportingBlob] = useState(false);
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportBlobResponse | null>(null);
  const [selectedBlobFolder, setSelectedBlobFolder] = useState('');
  const [deleteAfterImport, setDeleteAfterImport] = useState(false);
  const [blobToken, setBlobToken] = useState('');
  const [isBlobConfigured, setIsBlobConfigured] = useState(false);
  const [selectedBlobSourceFolder, setSelectedBlobSourceFolder] = useState('');
  const [selectedBlobDestFolder, setSelectedBlobDestFolder] = useState('');
  const [blobs, setBlobs] = useState<BlobItem[]>([]);
  const [blobStats, setBlobStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    totalSizeFormatted: '0 B'
  });
  const [folders, setFolders] = useState<string[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      loadFolders();
    }
  }, [isAuthenticated]);

  const loadFolders = async () => {
    try {
      if (!token) return;

      const response = await fetch('/api/folders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setFolders(data.folders);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers:', error);
    }
  };

  const loadBlobs = async () => {
    if (!blobToken.trim()) {
      return;
    }

    setIsLoadingBlobs(true);
    try {
      const response = await fetch(`/api/import-blob?token=${encodeURIComponent(blobToken.trim())}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data: BlobResponse = await response.json();
      if (data.success) {
        setBlobs(data.files);
        setBlobStats({
          totalFiles: data.totalFiles,
          totalSize: data.totalSize,
          totalSizeFormatted: data.totalSizeFormatted
        });
        setIsBlobConfigured(true);
      } else {
        setIsBlobConfigured(false);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des blobs:', error);
      setIsBlobConfigured(false);
    } finally {
      setIsLoadingBlobs(false);
    }
  };

  const handleImportBlob = async (blobUrl: string) => {
    if (!selectedBlobDestFolder) {
      alert('Veuillez sélectionner un dossier de destination');
      return;
    }

    if (!blobToken.trim()) {
      alert('Token Vercel Blob requis');
      return;
    }

    if (!token) {
      alert('Token d\'authentification manquant');
      return;
    }

    setIsImportingBlob(true);
    setImportResult(null);

    try {
      const response = await fetch(`/api/import-blob?token=${encodeURIComponent(blobToken.trim())}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          blobUrl,
          targetFolder: selectedBlobDestFolder,
          deleteAfterImport
        }),
      });

      const result: ImportBlobResponse = await response.json();

      if (result.success) {
        setImportResult(result);
        // Recharger les blobs
        loadBlobs();
      } else {
        setImportResult(result);
      }
    } catch (error) {
      console.error('Erreur lors de l\'import du blob:', error);
      setImportResult({
        success: false,
        message: 'Erreur lors de l\'import du blob',
        error: 'Erreur réseau'
      });
    } finally {
      setIsImportingBlob(false);
    }
  };

  const handleDeleteBlob = async (blobUrl: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce blob ?')) {
      return;
    }

    if (!blobToken.trim()) {
      alert('Token Vercel Blob requis');
      return;
    }

    if (!token) {
      alert('Token d\'authentification manquant');
      return;
    }

    try {
      const response = await fetch(`/api/import-blob?token=${encodeURIComponent(blobToken.trim())}&blobUrl=${encodeURIComponent(blobUrl)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        // Recharger les blobs
        loadBlobs();
      } else {
        alert('Erreur lors de la suppression du blob');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du blob:', error);
      alert('Erreur lors de la suppression du blob');
    }
  };

  const handleBatchImport = async () => {
    if (!selectedBlobSourceFolder) {
      alert('Veuillez sélectionner un dossier source');
      return;
    }

    if (!selectedBlobDestFolder) {
      alert('Veuillez sélectionner un dossier de destination');
      return;
    }

    if (!blobToken.trim()) {
      alert('Token Vercel Blob requis');
      return;
    }

    if (!token) {
      alert('Token d\'authentification manquant');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir importer tous les fichiers du dossier "${selectedBlobSourceFolder}" vers "${selectedBlobDestFolder}" ?`)) {
      return;
    }

    setIsBatchImporting(true);
    setImportResult(null);

    try {
      const response = await fetch(`/api/import-blob?token=${encodeURIComponent(blobToken.trim())}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          folderName: selectedBlobSourceFolder,
          targetFolder: selectedBlobDestFolder,
          deleteAfterImport,
          batchImport: true
        }),
      });

      const result: ImportBlobResponse = await response.json();

      if (result.success) {
        setImportResult(result);
        // Recharger les blobs
        loadBlobs();
      } else {
        setImportResult(result);
      }
    } catch (error) {
      console.error('Erreur lors du batch import:', error);
      setImportResult({
        success: false,
        message: 'Erreur lors du batch import',
        error: 'Erreur réseau'
      });
    } finally {
      setIsBatchImporting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Import Vercel Blob</h1>
                <p className="text-gray-600 mt-1">
                  Import de fichiers depuis Vercel Blob Storage
                </p>
              </div>
              <div className="flex space-x-4">
                <Link
                  href="/"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Accueil
                </Link>
                <Link
                  href="/upload"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Local
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Configuration et Import */}
            <div className="space-y-8">
              {/* Configuration Vercel Blob */}
              <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Configuration Vercel Blob</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token Vercel Blob
                    </label>
                    <input
                      type="password"
                      value={blobToken}
                      onChange={(e) => setBlobToken(e.target.value)}
                      placeholder="Entrez votre token Vercel Blob"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Obtenez votre token depuis le <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Vercel Dashboard</a> → Storage → Blob
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={loadBlobs}
                      disabled={isLoadingBlobs || !blobToken.trim()}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {isLoadingBlobs ? 'Chargement...' : 'Tester la connexion'}
                    </button>
                    
                    {isBlobConfigured && (
                      <span className="text-green-600 text-sm font-medium">✅ Connecté</span>
                    )}
                  </div>
                  
                  {blobStats.totalFiles > 0 && (
                    <div className="text-sm text-gray-500">
                      {blobStats.totalFiles} blob{blobStats.totalFiles > 1 ? 's' : ''} • {blobStats.totalSizeFormatted}
                    </div>
                  )}
                </div>
              </div>

              {/* Import Batch */}
              <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Import Batch</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dossier source (Vercel Blob)
                    </label>
                    <select
                      value={selectedBlobSourceFolder}
                      onChange={(e) => setSelectedBlobSourceFolder(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez un dossier source</option>
                      {Array.from(new Set(blobs.map(blob => blob.pathname.split('/')[0]))).map((folder) => (
                        <option key={folder} value={folder}>
                          {folder}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dossier de destination
                    </label>
                    <select
                      value={selectedBlobDestFolder}
                      onChange={(e) => setSelectedBlobDestFolder(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez un dossier</option>
                      {folders.map((folder) => (
                        <option key={folder} value={folder}>
                          {folder}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={deleteAfterImport}
                        onChange={(e) => setDeleteAfterImport(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Supprimer le blob après import</span>
                    </label>
                  </div>

                  <button
                    onClick={handleBatchImport}
                    disabled={isBatchImporting || !selectedBlobSourceFolder || !selectedBlobDestFolder || !isBlobConfigured}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isBatchImporting ? 'Import en cours...' : 'Import batch'}
                  </button>
                </div>

                {/* Import Result */}
                {importResult && (
                  <div className={`mt-6 p-4 rounded-lg ${
                    importResult.success 
                      ? 'bg-green-50 border border-green-200 text-green-800' 
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <p className="font-medium">{importResult.message}</p>
                    {importResult.error && (
                      <p className="text-sm mt-1">{importResult.error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Liste des blobs */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Blobs disponibles</h2>
              
              {blobs.length === 0 ? (
                <p className="text-gray-500">Aucun blob disponible</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {blobs.map((blob) => (
                    <div key={blob.url} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{blob.pathname}</p>
                        <p className="text-sm text-gray-500">{blob.sizeFormatted} • {new Date(blob.uploadedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleImportBlob(blob.url)}
                          disabled={isImportingBlob || !selectedBlobDestFolder}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                        >
                          {isImportingBlob ? 'Import...' : 'Importer'}
                        </button>
                        <button
                          onClick={() => handleDeleteBlob(blob.url)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
} 