'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

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

interface MoveResponse {
  success: boolean;
  message: string;
  source?: string;
  destination?: string;
  error?: string;
}

export default function UploadPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [folderResult, setFolderResult] = useState<FolderResponse | null>(null);
  const [deleteResult, setDeleteResult] = useState<FolderResponse | null>(null);
  const [renameResult, setRenameResult] = useState<FolderResponse | null>(null);
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
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [deleteType, setDeleteType] = useState<'folder' | 'file'>('folder');
  const [deleteTarget, setDeleteTarget] = useState('');
  const [renameType, setRenameType] = useState<'folder' | 'file'>('folder');
  const [renameOldName, setRenameOldName] = useState('');
  const [renameNewName, setRenameNewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // États pour les blobs
  const [blobs, setBlobs] = useState<BlobItem[]>([]);
  const [blobStats, setBlobStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    totalSizeFormatted: '0 B'
  });
  const [isLoadingBlobs, setIsLoadingBlobs] = useState(false);
  const [isImportingBlob, setIsImportingBlob] = useState(false);
  const [importResult, setImportResult] = useState<ImportBlobResponse | null>(null);
  const [selectedBlobFolder, setSelectedBlobFolder] = useState('');
  const [deleteAfterImport, setDeleteAfterImport] = useState(false);
  const [blobToken, setBlobToken] = useState('');
  const [isBlobConfigured, setIsBlobConfigured] = useState(false);
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [selectedBlobSourceFolder, setSelectedBlobSourceFolder] = useState('');
  const [selectedBlobDestFolder, setSelectedBlobDestFolder] = useState('');
  
  // États pour le déplacement
  const [isMoving, setIsMoving] = useState(false);
  const [moveResult, setMoveResult] = useState<MoveResponse | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveType, setMoveType] = useState<'folder' | 'file'>('folder');
  const [moveSource, setMoveSource] = useState('');
  const [moveDestination, setMoveDestination] = useState('');
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      setIsAuthenticated(true);
      // Charger les dossiers existants
      loadFolders();
      loadFiles();
      loadBlobs();
      loadAvailableFolders();
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    setUploadResult(null);
    setFolderResult(null);
    setDeleteResult(null);
    setRenameResult(null);
    setUploadedImages([]);
    setSelectedFolder('');
    setNewFolderName('');
    setFolders([]);
    setFiles([]);
    setFileStats({
      totalFiles: 0,
      totalSize: 0,
      totalSizeFormatted: '0 B'
    });
    setSelectedFile(null);
    setShowDeleteModal(false);
    setShowRenameModal(false);
    // Reset blob states
    setBlobs([]);
    setBlobStats({
      totalFiles: 0,
      totalSize: 0,
      totalSizeFormatted: '0 B'
    });
    setImportResult(null);
    setSelectedBlobSourceFolder('');
    setSelectedBlobDestFolder('');
    setDeleteAfterImport(false);
    setBlobToken('');
    setIsBlobConfigured(false);
    // Reset move states
    setMoveResult(null);
    setShowMoveModal(false);
    setMoveSource('');
    setMoveDestination('');
    setAvailableFolders([]);
  };

  const loadFolders = async () => {
    try {
      const response = await fetch('/api/folders');
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
      const response = await fetch(`/api/files?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
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

  const loadAvailableFolders = async () => {
    try {
      const response = await fetch(`/api/move?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
      const data = await response.json();
      if (data.success) {
        setAvailableFolders(data.folders);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers disponibles:', error);
    }
  };

  const loadBlobs = async () => {
    if (!blobToken.trim()) {
      return;
    }

    setIsLoadingBlobs(true);
    try {
      const response = await fetch(`/api/import-blob?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&token=${encodeURIComponent(blobToken.trim())}`);
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

    setIsImportingBlob(true);
    setImportResult(null);

    try {
      const response = await fetch(`/api/import-blob?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&token=${encodeURIComponent(blobToken.trim())}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        // Recharger les données
        loadFiles();
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

    try {
      const response = await fetch(`/api/import-blob?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&token=${encodeURIComponent(blobToken.trim())}&blobUrl=${encodeURIComponent(blobUrl)}`, {
        method: 'DELETE',
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

    if (!confirm(`Êtes-vous sûr de vouloir importer tous les fichiers du dossier "${selectedBlobSourceFolder}" vers "${selectedBlobDestFolder}" ?`)) {
      return;
    }

    setIsBatchImporting(true);
    setImportResult(null);

    try {
      const response = await fetch(`/api/import-blob?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&token=${encodeURIComponent(blobToken.trim())}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        // Recharger les données
        loadFiles();
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

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newFolderName.trim()) {
      alert('Veuillez saisir un nom de dossier');
      return;
    }

    setIsCreatingFolder(true);
    setFolderResult(null);

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('folderName', newFolderName.trim());

      const response = await fetch('/api/folders', {
        method: 'POST',
        body: formData,
      });

      const result: FolderResponse = await response.json();

      if (result.success) {
        setFolderResult(result);
        setNewFolderName('');
        // Recharger les dossiers et fichiers
        loadFolders();
        loadFiles();
      } else {
        setFolderResult(result);
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

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteResult(null);

    try {
      const response = await fetch(`/api/delete?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=${deleteType}&target=${encodeURIComponent(deleteTarget)}`, {
        method: 'DELETE',
      });

      const result: FolderResponse = await response.json();

      if (result.success) {
        setDeleteResult(result);
        setShowDeleteModal(false);
        setDeleteTarget('');
        // Recharger les données
        loadFolders();
        loadFiles();
        if (deleteType === 'folder' && selectedFolder === deleteTarget) {
          setSelectedFolder('');
        }
      } else {
        setDeleteResult(result);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setDeleteResult({
        success: false,
        message: 'Erreur lors de la suppression',
        error: 'Erreur réseau'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!renameNewName.trim()) {
      alert('Veuillez saisir un nouveau nom');
      return;
    }

    setIsRenaming(true);
    setRenameResult(null);

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('type', renameType);
      formData.append('oldName', renameOldName);
      formData.append('newName', renameNewName.trim());

      const response = await fetch('/api/rename', {
        method: 'POST',
        body: formData,
      });

      const result: FolderResponse = await response.json();

      if (result.success) {
        setRenameResult(result);
        setShowRenameModal(false);
        setRenameOldName('');
        setRenameNewName('');
        // Recharger les données
        loadFolders();
        loadFiles();
        if (renameType === 'folder' && selectedFolder === renameOldName) {
          setSelectedFolder(renameNewName.trim());
        }
      } else {
        setRenameResult(result);
      }
    } catch (error) {
      console.error('Erreur lors du renommage:', error);
      setRenameResult({
        success: false,
        message: 'Erreur lors du renommage',
        error: 'Erreur réseau'
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const confirmDelete = (type: 'folder' | 'file', target: string) => {
    setDeleteType(type);
    setDeleteTarget(target);
    setShowDeleteModal(true);
  };

  const confirmRename = (type: 'folder' | 'file', oldName: string, currentName?: string) => {
    setRenameType(type);
    setRenameOldName(oldName);
    setRenameNewName(currentName || oldName);
    setShowRenameModal(true);
  };

  const confirmMove = (type: 'folder' | 'file', source: string) => {
    setMoveType(type);
    setMoveSource(source);
    setMoveDestination('');
    setShowMoveModal(true);
    loadAvailableFolders();
  };

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!moveDestination.trim()) {
      alert('Veuillez saisir une destination');
      return;
    }

    setIsMoving(true);
    setMoveResult(null);

    try {
      const response = await fetch(`/api/move?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: moveSource,
          destination: moveDestination,
          type: moveType
        }),
      });

      const result: MoveResponse = await response.json();

      if (result.success) {
        setMoveResult(result);
        setShowMoveModal(false);
        // Recharger les données
        loadFolders();
        loadFiles();
        loadAvailableFolders();
      } else {
        setMoveResult(result);
      }
    } catch (error) {
      console.error('Erreur lors du déplacement:', error);
      setMoveResult({
        success: false,
        message: 'Erreur lors du déplacement',
        error: 'Erreur réseau'
      });
    } finally {
      setIsMoving(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fileInputRef.current?.files || fileInputRef.current.files.length === 0) {
      alert('Veuillez sélectionner au moins un fichier');
      return;
    }

    if (!selectedFolder) {
      alert('Veuillez sélectionner un dossier');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('folder', selectedFolder);

      const files = Array.from(fileInputRef.current.files);
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResponse = await response.json();

      if (result.success) {
        setUploadedImages(prev => [...prev, ...result.files]);
        setUploadResult(result);
        // Réinitialiser l'input de fichiers
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Recharger les fichiers
        loadFiles();
      } else {
        setUploadResult(result);
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Connexion</h1>
            <p className="text-gray-600">Connectez-vous pour uploader des images</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Nom d&apos;utilisateur
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="Entrez votre nom d'utilisateur"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="Entrez votre mot de passe"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Se connecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload d&apos;Images</h1>
              <p className="text-gray-600">Connecté en tant que {username}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Statistiques globales</div>
              <div className="text-lg font-semibold text-gray-900">
                {fileStats.totalFiles} fichier{fileStats.totalFiles > 1 ? 's' : ''} • {fileStats.totalSizeFormatted}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colonne gauche - Upload et gestion */}
          <div className="space-y-8">
            {/* Create Folder */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Créer un nouveau dossier</h2>
              
              <form onSubmit={handleCreateFolder} className="space-y-6">
                <div>
                  <label htmlFor="newFolderName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du dossier
                  </label>
                  <input
                    type="text"
                    id="newFolderName"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                    placeholder="Ex: films, series, photos..."
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isCreatingFolder}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingFolder ? 'Création en cours...' : 'Créer le dossier'}
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
            </div>

            {/* Upload Form */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Sélectionner des images</h2>
              
              <form onSubmit={handleFileUpload} className="space-y-6">
                <div>
                  <label htmlFor="folder" className="block text-sm font-medium text-gray-700 mb-2">
                    Dossier de destination
                  </label>
                  <select
                    id="folder"
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    required
                  >
                    <option value="">Sélectionnez un dossier</option>
                    {folders.map((folder) => (
                      <option key={folder} value={folder}>
                        {folder}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="files" className="block text-sm font-medium text-gray-700 mb-2">
                    Images à uploader
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="files"
                    multiple
                    accept="image/*"
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Formats acceptés: JPEG, PNG, GIF, WebP, SVG. Taille max: 10MB par fichier.
                  </p>
                </div>
                
                <button
                  type="submit"
                  disabled={isUploading || !selectedFolder}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Upload en cours...' : 'Uploader les images'}
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
            </div>

            {/* Import Vercel Blob */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Import depuis Vercel Blob</h2>
              
              {/* Configuration du token */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Configuration Vercel Blob</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token Vercel Blob
                    </label>
                    <input
                      type="password"
                      value={blobToken}
                      onChange={(e) => setBlobToken(e.target.value)}
                      placeholder="Entrez votre token Vercel Blob"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
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
                </div>
                
                {blobStats.totalFiles > 0 && (
                  <div className="mt-4 text-sm text-gray-500">
                    {blobStats.totalFiles} blob{blobStats.totalFiles > 1 ? 's' : ''} • {blobStats.totalSizeFormatted}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dossier source (Vercel Blob)
                  </label>
                  <select
                    value={selectedBlobSourceFolder}
                    onChange={(e) => setSelectedBlobSourceFolder(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
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

                <div className="flex space-x-3">
                  <button
                    onClick={handleBatchImport}
                    disabled={isBatchImporting || !selectedBlobSourceFolder || !selectedBlobDestFolder || !isBlobConfigured}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isBatchImporting ? 'Import en cours...' : 'Import batch'}
                  </button>
                </div>
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

              {/* Liste des blobs */}
              {blobs.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Blobs disponibles</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
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
                </div>
              )}

              {blobs.length === 0 && !isLoadingBlobs && (
                <p className="text-gray-500 mt-4">Aucun blob disponible</p>
              )}
            </div>
          </div>

          {/* Colonne droite - Gestion des dossiers et fichiers */}
          <div className="space-y-8">
            {/* Gestion des dossiers */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestion des dossiers</h2>
              
              {folders.length === 0 ? (
                <p className="text-gray-500">Aucun dossier créé</p>
              ) : (
                <div className="space-y-3">
                  {folders.map((folder) => (
                    <div key={folder} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">{folder}</span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => confirmMove('folder', folder)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                        >
                          Déplacer
                        </button>
                        <button
                          onClick={() => confirmRename('folder', folder)}
                          className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm"
                        >
                          Renommer
                        </button>
                        <button
                          onClick={() => confirmDelete('folder', folder)}
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

            {/* Gestion des fichiers */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Fichiers uploadés</h2>
                <div className="text-sm text-gray-500">
                  {fileStats.totalFiles} fichier{fileStats.totalFiles > 1 ? 's' : ''} • {fileStats.totalSizeFormatted}
                </div>
              </div>
              
              {files.length === 0 ? (
                <p className="text-gray-500">Aucun fichier uploadé</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {files.map((file) => (
                    <div key={file.path} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-sm text-gray-500">{file.folder} • {file.type} • {file.sizeFormatted}</p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => confirmMove('file', file.path)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                        >
                          Déplacer
                        </button>
                        <button
                          onClick={() => confirmRename('file', file.path, file.name)}
                          className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm"
                        >
                          Renommer
                        </button>
                        <button
                          onClick={() => confirmDelete('file', file.path)}
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

        {/* Modals */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Confirmer la suppression
              </h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer {deleteType === 'folder' ? 'le dossier' : 'le fichier'} &quot;{deleteTarget}&quot; ?
                {deleteType === 'folder' && ' Cette action supprimera également tous les fichiers qu&apos;il contient.'}
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
              {deleteResult && (
                <div className={`mt-4 p-3 rounded-lg ${
                  deleteResult.success 
                    ? 'bg-green-50 border border-green-200 text-green-800' 
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  <p className="text-sm">{deleteResult.message}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {showRenameModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Renommer {renameType === 'folder' ? 'le dossier' : 'le fichier'}
              </h3>
              <form onSubmit={handleRename} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nouveau nom
                  </label>
                  <input
                    type="text"
                    value={renameNewName}
                    onChange={(e) => setRenameNewName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    required
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowRenameModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isRenaming}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isRenaming ? 'Renommage...' : 'Renommer'}
                  </button>
                </div>
                {renameResult && (
                  <div className={`mt-4 p-3 rounded-lg ${
                    renameResult.success 
                      ? 'bg-green-50 border border-green-200 text-green-800' 
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <p className="text-sm">{renameResult.message}</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {showMoveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Déplacer {moveType === 'folder' ? 'le dossier' : 'le fichier'}
              </h3>
              <form onSubmit={handleMove} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source
                  </label>
                  <input
                    type="text"
                    value={moveSource}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination
                  </label>
                  <select
                    value={moveDestination}
                    onChange={(e) => setMoveDestination(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    required
                  >
                    <option value="">Sélectionner une destination</option>
                    <option value="">Racine (uploads/)</option>
                    {availableFolders
                      .filter(folder => folder !== moveSource.split('/')[0]) // Exclure le dossier source
                      .map((folder) => (
                        <option key={folder} value={folder}>
                          {folder}
                        </option>
                      ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Si la destination existe déjà, le contenu sera fusionné.
                  </p>
                </div>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowMoveModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isMoving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isMoving ? 'Déplacement...' : 'Déplacer'}
                  </button>
                </div>
                {moveResult && (
                  <div className={`mt-4 p-3 rounded-lg ${
                    moveResult.success 
                      ? 'bg-green-50 border border-green-200 text-green-800' 
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                  <p className="text-sm">{moveResult.message}</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 