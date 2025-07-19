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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      setIsAuthenticated(true);
      // Charger les dossiers existants
      loadFolders();
      loadFiles();
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
                Nom d'utilisateur
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload d'Images</h1>
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
                Êtes-vous sûr de vouloir supprimer {deleteType === 'folder' ? 'le dossier' : 'le fichier'} "{deleteTarget}" ?
                {deleteType === 'folder' && ' Cette action supprimera également tous les fichiers qu\'il contient.'}
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
      </div>
    </div>
  );
} 