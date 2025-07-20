'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import AuthGuard from '@/components/AuthGuard';

interface FolderResponse {
  success: boolean;
  folders: string[];
  totalFolders: number;
  error?: string;
}

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  level: number;
}

export default function FoldersPage() {
  const { user, isAuthenticated, token } = useAuthStore();
  const [folders, setFolders] = useState<string[]>([]);
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [moveResult, setMoveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedFolderToMove, setSelectedFolderToMove] = useState('');
  const [targetFolder, setTargetFolder] = useState('');
  const [moveMode, setMoveMode] = useState<'new' | 'existing'>('new');
  const [selectedExistingFolder, setSelectedExistingFolder] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadFolders();
    }
  }, [isAuthenticated]);

  const loadFolders = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      const response = await fetch('/api/folders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data: FolderResponse = await response.json();

      if (data.success) {
        setFolders(data.folders);
        buildFolderTree(data.folders);
      } else {
        setError(data.error || 'Erreur lors du chargement des dossiers');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers:', error);
      setError('Erreur lors du chargement des dossiers');
    } finally {
      setIsLoading(false);
    }
  };

  const buildFolderTree = (folderList: string[]) => {
    const tree: FolderNode[] = [];
    const folderMap = new Map<string, FolderNode>();

    // Trier les dossiers par profondeur et ordre alphabétique
    const sortedFolders = folderList.sort((a, b) => {
      const aDepth = a.split('/').length;
      const bDepth = b.split('/').length;
      
      if (aDepth !== bDepth) {
        return aDepth - bDepth;
      }
      
      return a.localeCompare(b);
    });

    sortedFolders.forEach(folderPath => {
      const parts = folderPath.split('/');
      const level = parts.length - 1;
      const name = parts[parts.length - 1];
      
      const node: FolderNode = {
        name,
        path: folderPath,
        children: [],
        level
      };

      folderMap.set(folderPath, node);

      if (level === 0) {
        // Dossier racine
        tree.push(node);
      } else {
        // Sous-dossier
        const parentPath = parts.slice(0, -1).join('/');
        const parent = folderMap.get(parentPath);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    setFolderTree(tree);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newFolderName.trim()) {
      setCreateResult({
        success: false,
        message: 'Veuillez saisir un nom de dossier'
      });
      return;
    }

    if (!token) {
      setCreateResult({
        success: false,
        message: 'Token d\'authentification manquant'
      });
      return;
    }

    setIsCreating(true);
    setCreateResult(null);

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          folderName: newFolderName.trim()
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCreateResult({
          success: true,
          message: `Dossier "${newFolderName}" créé avec succès`
        });
        setNewFolderName('');
        loadFolders(); // Recharger la liste
      } else {
        setCreateResult({
          success: false,
          message: result.error || 'Erreur lors de la création du dossier'
        });
      }
    } catch (error) {
      setCreateResult({
        success: false,
        message: 'Erreur lors de la création du dossier'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleMoveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalTargetFolder = '';
    
    if (moveMode === 'new') {
      if (!targetFolder.trim()) {
        setMoveResult({
          success: false,
          message: 'Veuillez entrer un nom pour le nouveau dossier'
        });
        return;
      }
      finalTargetFolder = targetFolder.trim();
    } else {
      if (!selectedExistingFolder) {
        setMoveResult({
          success: false,
          message: 'Veuillez sélectionner un dossier de destination'
        });
        return;
      }
      if (!targetFolder.trim()) {
        setMoveResult({
          success: false,
          message: 'Veuillez entrer un nom pour le dossier déplacé'
        });
        return;
      }
      finalTargetFolder = `${selectedExistingFolder}/${targetFolder.trim()}`;
    }

    if (selectedFolderToMove === finalTargetFolder) {
      setMoveResult({
        success: false,
        message: 'Le dossier source et le dossier de destination ne peuvent pas être identiques'
      });
      return;
    }

    setIsMoving(true);
    setMoveResult(null);

    try {
      if (!token) {
        setMoveResult({
          success: false,
          message: 'Token d\'authentification manquant'
        });
        return;
      }

      const response = await fetch('/api/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sourceFolder: selectedFolderToMove,
          targetFolder: finalTargetFolder
        }),
      });

      const data = await response.json();
      setMoveResult({
        success: data.success,
        message: data.message || data.error
      });

      if (data.success) {
        setShowMoveModal(false);
        setSelectedFolderToMove('');
        setTargetFolder('');
        setSelectedExistingFolder('');
        setMoveMode('new');
        loadFolders();
      }
    } catch (error) {
      console.error('Erreur lors du déplacement:', error);
      setMoveResult({
        success: false,
        message: 'Erreur lors du déplacement'
      });
    } finally {
      setIsMoving(false);
    }
  };

  const confirmMove = (folderPath: string) => {
    setSelectedFolderToMove(folderPath);
    setShowMoveModal(true);
  };

  const renderFolderNode = (node: FolderNode) => {
    const indent = node.level * 24; // 24px par niveau
    
    return (
      <div key={node.path}>
        <div 
          className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
          style={{ marginLeft: `${indent}px` }}
        >
          <div className="flex items-center flex-1 min-w-0">
            <div className="flex items-center">
              {node.level > 0 && (
                <span className="text-gray-400 mr-2">└─</span>
              )}
              <svg className="w-5 h-5 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              <span className="font-medium text-gray-900 truncate">{node.name}</span>
              {node.level > 0 && (
                <span className="text-xs text-gray-500 ml-2">({node.path})</span>
              )}
            </div>
          </div>
          <div className="flex space-x-2 ml-4">
            <Link
              href={`/files?folder=${encodeURIComponent(node.path)}`}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              Voir fichiers
            </Link>
            <button 
              onClick={() => confirmMove(node.path)}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
            >
              Déplacer
            </button>
            <button className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm">
              Renommer
            </button>
            <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm">
              Supprimer
            </button>
          </div>
        </div>
        
        {/* Récursivement afficher les enfants */}
        {node.children.map(child => renderFolderNode(child))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des dossiers...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestion des dossiers</h1>
                <p className="text-gray-600 mt-1">
                  {folders.length} dossier{folders.length > 1 ? 's' : ''} au total
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
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Create Folder Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Créer un nouveau dossier</h2>
            <form onSubmit={handleCreateFolder} className="flex space-x-4">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nom du dossier"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isCreating}
              />
              <button
                type="submit"
                disabled={isCreating || !newFolderName.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isCreating ? 'Création...' : 'Créer'}
              </button>
            </form>
            {createResult && (
              <div className={`mt-4 p-3 rounded-lg ${
                createResult.success 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <p className="text-sm">{createResult.message}</p>
              </div>
            )}
          </div>

          {/* Folders Tree */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Arborescence des dossiers</h2>
            </div>
            
            <div className="p-6">
              {folderTree.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun dossier</h3>
                  <p className="mt-1 text-sm text-gray-500">Commencez par créer un dossier.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {folderTree.map(node => renderFolderNode(node))}
                </div>
              )}
            </div>
          </div>

          {/* Folder Statistics */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Dossiers</p>
                  <p className="text-2xl font-bold text-gray-900">{folders.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Dossiers Racine</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {folderTree.filter(node => node.level === 0).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Sous-dossiers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {folders.filter(folder => folder.includes('/')).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de déplacement */}
        {showMoveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Déplacer le dossier
              </h3>
              <form onSubmit={handleMoveFolder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dossier source
                  </label>
                  <input
                    type="text"
                    value={selectedFolderToMove}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                </div>

                {/* Mode de déplacement */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mode de déplacement
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="new"
                        checked={moveMode === 'new'}
                        onChange={(e) => setMoveMode(e.target.value as 'new' | 'existing')}
                        className="mr-2"
                      />
                      <span className="text-sm">Créer un nouveau dossier</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="existing"
                        checked={moveMode === 'existing'}
                        onChange={(e) => setMoveMode(e.target.value as 'new' | 'existing')}
                        className="mr-2"
                      />
                      <span className="text-sm">Déplacer dans un dossier existant</span>
                    </label>
                  </div>
                </div>

                {/* Sélection du dossier existant */}
                {moveMode === 'existing' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dossier de destination
                    </label>
                    <select
                      value={selectedExistingFolder}
                      onChange={(e) => setSelectedExistingFolder(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
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
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {moveMode === 'new' ? 'Nouveau nom du dossier' : 'Nom du dossier déplacé'}
                  </label>
                  <input
                    type="text"
                    value={targetFolder}
                    onChange={(e) => setTargetFolder(e.target.value)}
                    placeholder={moveMode === 'new' ? 'Nouveau nom du dossier' : 'Nom du dossier déplacé'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    required
                  />
                  {moveMode === 'existing' && selectedExistingFolder && (
                    <p className="text-sm text-gray-500 mt-1">
                      Le dossier sera créé dans : {selectedExistingFolder}/{targetFolder || '[nom]'}
                    </p>
                  )}
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
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
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
    </AuthGuard>
  );
} 