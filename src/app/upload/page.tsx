'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import AuthGuard from '@/components/AuthGuard';

interface UploadResponse {
  success: boolean;
  message: string;
  files: string[];
  error?: string;
}

interface FolderResponse {
  success: boolean;
  message: string;
  error?: string;
}

interface FileItem {
  name: string;
  path: string;
  folder?: string;
  type: string;
  size: number;
  sizeFormatted: string;
}

interface FilesResponse {
  success: boolean;
  files: FileItem[];
  folder?: string;
  totalFiles: number;
  totalSize: number;
  totalSizeFormatted: string;
  error?: string;
}

export default function UploadPage() {
  const { user, isAuthenticated, token } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [folderResult, setFolderResult] = useState<FolderResponse | null>(null);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; error?: string } | null>(null);
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string; error?: string } | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [fileStats, setFileStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    totalSizeFormatted: '0 B'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadFolders();
      loadFiles();
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

  const loadFiles = async () => {
    try {
      if (!token) return;

      const response = await fetch('/api/files', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data: FilesResponse = await response.json();
      if (data.success) {
        setFiles(data.files);
        setFileStats({
          totalFiles: data.totalFiles,
          totalSize: data.totalSize,
          totalSizeFormatted: data.totalSizeFormatted
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers:', error);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      if (!token) {
        setFolderResult({
          success: false,
          message: 'Non authentifié',
          error: 'Token manquant'
        });
        return;
      }

      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ folderName: newFolderName }),
      });

      const data: FolderResponse = await response.json();
      setFolderResult(data);

      if (data.success) {
        setNewFolderName('');
        loadFolders();
      }
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error);
      setFolderResult({
        success: false,
        message: 'Erreur lors de la création du dossier',
        error: 'Erreur réseau'
      });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.length) return;

    setIsUploading(true);
    const formData = new FormData();
    
    for (let i = 0; i < fileInputRef.current.files.length; i++) {
      formData.append('files', fileInputRef.current.files[i]);
    }
    
    if (selectedFolder) {
      formData.append('folder', selectedFolder);
    }

    try {
      if (!token) {
        setUploadResult({
          success: false,
          message: 'Non authentifié',
          files: [],
          error: 'Token manquant'
        });
        return;
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data: UploadResponse = await response.json();
      setUploadResult(data);

      if (data.success) {
        setUploadedImages(data.files);
        fileInputRef.current.value = '';
        loadFiles();
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      setUploadResult({
        success: false,
        message: 'Erreur lors de l\'upload',
        files: [],
        error: 'Erreur réseau'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const sourcePath = formData.get('sourcePath') as string;
    const targetFolder = formData.get('targetFolder') as string;

    if (!sourcePath.trim()) {
      setImportResult({
        success: false,
        message: 'Chemin source requis'
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      if (!token) {
        setImportResult({
          success: false,
          message: 'Token d\'authentification manquant'
        });
        return;
      }

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sourcePath: sourcePath.trim(),
          targetFolder: targetFolder || undefined
        }),
      });

      const data = await response.json();
      setImportResult({
        success: data.success,
        message: data.message || data.error
      });

      if (data.success) {
        loadFiles();
        loadFolders();
      }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      setImportResult({
        success: false,
        message: 'Erreur lors de l\'import'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const sourceFolder = formData.get('sourceFolder') as string;
    const targetPath = formData.get('targetPath') as string;

    if (!targetPath.trim()) {
      setExportResult({
        success: false,
        message: 'Chemin de destination requis'
      });
      return;
    }

    setIsExporting(true);
    setExportResult(null);

    try {
      if (!token) {
        setExportResult({
          success: false,
          message: 'Token d\'authentification manquant'
        });
        return;
      }

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sourceFolder: sourceFolder || undefined,
          targetPath: targetPath.trim()
        }),
      });

      const data = await response.json();
      setExportResult({
        success: data.success,
        message: data.message || data.error
      });
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      setExportResult({
        success: false,
        message: 'Erreur lors de l\'export'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Upload de Fichiers</h1>
                <p className="text-gray-600 mt-2">
                  Bienvenue {user?.name} ! Téléchargez vos fichiers et gérez vos dossiers.
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
                  href="/files"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Voir les fichiers
                </Link>
                <Link
                  href="/upload-blob"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Vercel Blob
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Upload de Fichiers</h2>
              
              <form onSubmit={handleFileUpload} className="space-y-6">
                {/* Folder Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dossier de destination (optionnel)
                  </label>
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Dossier racine</option>
                    {folders.map((folder) => (
                      <option key={folder} value={folder}>
                        {folder}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sélectionner des fichiers
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                  />
                </div>

                {/* Upload Button */}
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUploading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Upload en cours...
                    </div>
                  ) : (
                    'Télécharger les fichiers'
                  )}
                </button>
              </form>

              {/* Upload Result */}
              {uploadResult && (
                <div className={`mt-6 p-4 rounded-lg ${
                  uploadResult.success 
                    ? 'bg-green-50 border border-green-200 text-green-800' 
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  <p className="font-medium">{uploadResult.message}</p>
                  {uploadResult.error && (
                    <p className="text-sm mt-1">{uploadResult.error}</p>
                  )}
                </div>
              )}

              {/* Uploaded Images Preview */}
              {uploadedImages.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Fichiers téléchargés</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadedImages.map((file, index) => (
                      <div key={index} className="relative">
                        {file.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <Image
                            src={`/uploads/${file}`}
                            alt={file}
                            width={200}
                            height={200}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                        <p className="text-xs text-gray-600 mt-1 truncate">{file}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Create Folder Section */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Créer un Dossier</h2>
              
              <form onSubmit={handleCreateFolder} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du dossier
                  </label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mon nouveau dossier"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingFolder}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreatingFolder ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Création en cours...
                    </div>
                  ) : (
                    'Créer le dossier'
                  )}
                </button>
              </form>

              {/* Folder Result */}
              {folderResult && (
                <div className={`mt-6 p-4 rounded-lg ${
                  folderResult.success 
                    ? 'bg-green-50 border border-green-200 text-green-800' 
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  <p className="font-medium">{folderResult.message}</p>
                  {folderResult.error && (
                    <p className="text-sm mt-1">{folderResult.error}</p>
                  )}
                </div>
              )}

              {/* Available Folders */}
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Dossiers disponibles</h3>
                {folders.length > 0 ? (
                  <div className="space-y-2">
                    {folders.map((folder) => (
                      <div key={folder} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        </svg>
                        <span className="text-gray-900">{folder}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Aucun dossier créé</p>
                )}
              </div>
            </div>
          </div>

          {/* File Statistics */}
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Statistiques des Fichiers</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{fileStats.totalFiles}</div>
                <div className="text-sm text-gray-600">Total fichiers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{fileStats.totalSizeFormatted}</div>
                <div className="text-sm text-gray-600">Espace utilisé</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{folders.length}</div>
                <div className="text-sm text-gray-600">Dossiers créés</div>
              </div>
            </div>
          </div>

          {/* Import/Export Section */}
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Import/Export de Fichiers</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Import Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Importer des fichiers</h3>
                <p className="text-gray-600 mb-4">
                  Copier des fichiers depuis un dossier externe vers votre serveur
                </p>
                
                <form onSubmit={handleImport} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chemin source (dossier externe)
                    </label>
                    <input
                      name="sourcePath"
                      type="text"
                      placeholder="/chemin/vers/dossier/source"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dossier de destination (optionnel)
                    </label>
                    <select 
                      name="targetFolder"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Dossier racine</option>
                      {folders.map((folder) => (
                        <option key={folder} value={folder}>
                          {folder}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isImporting}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isImporting ? 'Import en cours...' : 'Importer les fichiers'}
                  </button>
                </form>

                {importResult && (
                  <div className={`mt-4 p-3 rounded-lg ${
                    importResult.success 
                      ? 'bg-green-50 border border-green-200 text-green-800' 
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <p className="text-sm">{importResult.message}</p>
                  </div>
                )}
              </div>

              {/* Export Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Exporter des fichiers</h3>
                <p className="text-gray-600 mb-4">
                  Copier des fichiers de votre serveur vers un dossier externe
                </p>
                
                <form onSubmit={handleExport} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dossier source
                    </label>
                    <select 
                      name="sourceFolder"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Tous les fichiers</option>
                      {folders.map((folder) => (
                        <option key={folder} value={folder}>
                          {folder}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chemin de destination
                    </label>
                    <input
                      name="targetPath"
                      type="text"
                      placeholder="/chemin/vers/dossier/destination"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isExporting}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isExporting ? 'Export en cours...' : 'Exporter les fichiers'}
                  </button>
                </form>

                {exportResult && (
                  <div className={`mt-4 p-3 rounded-lg ${
                    exportResult.success 
                      ? 'bg-green-50 border border-green-200 text-green-800' 
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <p className="text-sm">{exportResult.message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
} 