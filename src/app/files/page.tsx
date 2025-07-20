'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import AuthGuard from '@/components/AuthGuard';

interface FileItem {
  name: string;
  path: string;
  folder?: string;
  type: string;
  size: number;
  sizeFormatted: string;
  modifiedAt?: string;
  modifiedAtFormatted?: string;
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

export default function FilesPage() {
  const { user, isAuthenticated, token } = useAuthStore();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    totalSizeFormatted: '0 B'
  });
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null);
  const [filterPath, setFilterPath] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'path' | 'type' | 'size' | 'modified'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fonction pour obtenir le chemin complet du fichier
  const getFullPath = (file: FileItem) => {
    if (file.folder) {
      return `/uploads/${file.folder}/${file.name}`;
    }
    return `/uploads/${file.name}`;
  };

  // Fonction pour ouvrir le fichier
  const handleViewFile = (file: FileItem) => {
    const fullPath = getFullPath(file);
    window.open(fullPath, '_blank');
  };

  // Fonction pour filtrer et trier les fichiers
  const getFilteredAndSortedFiles = () => {
    let filteredFiles = files;

    // Filtrer par chemin
    if (filterPath.trim()) {
      filteredFiles = files.filter(file => {
        const filePath = file.folder ? `/${file.folder}/` : '/';
        return filePath.toLowerCase().includes(filterPath.toLowerCase()) ||
               file.name.toLowerCase().includes(filterPath.toLowerCase());
      });
    }

    // Trier les fichiers
    filteredFiles.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'path':
          aValue = (a.folder ? `/${a.folder}/` : '/').toLowerCase();
          bValue = (b.folder ? `/${b.folder}/` : '/').toLowerCase();
          break;
        case 'type':
          aValue = formatFileType(a.type, a.name).toLowerCase();
          bValue = formatFileType(b.type, b.name).toLowerCase();
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'modified':
          aValue = a.modifiedAt || '';
          bValue = b.modifiedAt || '';
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = (aValue as number) - (bValue as number);
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });

    return filteredFiles;
  };

  // Fonction pour changer le tri
  const handleSort = (newSortBy: 'name' | 'path' | 'type' | 'size' | 'modified') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  // Obtenir les fichiers filtrés et triés
  const filteredFiles = getFilteredAndSortedFiles();

  useEffect(() => {
    if (isAuthenticated) {
      loadFiles();
    }
  }, [isAuthenticated]);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      const response = await fetch('/api/files', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data: FilesResponse = await response.json();

      if (data.success) {
        setFiles(data.files);
        setStats({
          totalFiles: data.totalFiles,
          totalSize: data.totalSize,
          totalSizeFormatted: data.totalSizeFormatted
        });
      } else {
        setError(data.error || 'Erreur lors du chargement des fichiers');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers:', error);
      setError('Erreur lors du chargement des fichiers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(file => file.path)));
    }
  };

  const handleSelectFile = (filePath: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;

    if (!token) {
      setDeleteResult({
        success: false,
        message: 'Token d\'authentification manquant'
      });
      return;
    }

    setIsDeleting(true);
    setDeleteResult(null);

    try {
      const deletePromises = Array.from(selectedFiles).map(filePath =>
        fetch(`/api/delete?filePath=${encodeURIComponent(filePath)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then(res => res.json())
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;

      setDeleteResult({
        success: errorCount === 0,
        message: errorCount === 0 
          ? `${successCount} fichier(s) supprimé(s) avec succès`
          : `${successCount} fichier(s) supprimé(s), ${errorCount} erreur(s)`
      });

      if (successCount > 0) {
        setSelectedFiles(new Set());
        loadFiles();
      }
    } catch (error) {
      setDeleteResult({
        success: false,
        message: 'Erreur lors de la suppression'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileType = (type: string, fileName: string) => {
    // D'abord essayer de détecter l'extension du fichier
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension) {
      const extensionMap: { [key: string]: string } = {
        'jpg': 'JPEG',
        'jpeg': 'JPEG',
        'png': 'PNG',
        'gif': 'GIF',
        'webp': 'WebP',
        'svg': 'SVG',
        'pdf': 'PDF',
        'txt': 'TXT',
        'json': 'JSON',
        'mp4': 'MP4',
        'avi': 'AVI',
        'mov': 'MOV',
        'mkv': 'MKV',
        'zip': 'ZIP',
        'rar': 'RAR',
        'doc': 'DOC',
        'docx': 'DOCX',
        'xls': 'XLS',
        'xlsx': 'XLSX'
      };
      if (extensionMap[extension]) {
        return extensionMap[extension];
      }
    }
    
    // Sinon utiliser le type MIME
    const typeMap: { [key: string]: string } = {
      'image/jpeg': 'JPEG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/webp': 'WebP',
      'image/svg+xml': 'SVG',
      'application/pdf': 'PDF',
      'text/plain': 'TXT',
      'application/json': 'JSON'
    };
    return typeMap[type] || type.split('/')[1]?.toUpperCase() || 'FICHIER';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des fichiers...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Fichiers</h1>
              <p className="text-gray-600 mt-1">
                {stats.totalFiles} fichier{stats.totalFiles > 1 ? 's' : ''} • {stats.totalSizeFormatted}
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
                Upload
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
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Tout sélectionner ({selectedFiles.size}/{filteredFiles.length})
                  {filterPath.trim() && selectedFiles.size > 0 && (
                    <span className="text-gray-500 ml-1">
                      (sur {files.length} total)
                    </span>
                  )}
                </span>
              </label>
            </div>
            <div className="flex space-x-2">
              {selectedFiles.size > 0 && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Supprimer ({selectedFiles.size})
                </button>
              )}
            </div>
          </div>

          {/* Filtres et tri */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtrer par chemin ou nom
              </label>
              <input
                type="text"
                value={filterPath}
                onChange={(e) => setFilterPath(e.target.value)}
                placeholder="Rechercher par chemin ou nom de fichier..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trier par
              </label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-') as ['name' | 'path' | 'type' | 'size' | 'modified', 'asc' | 'desc'];
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name-asc">Nom (A-Z)</option>
                <option value="name-desc">Nom (Z-A)</option>
                <option value="path-asc">Chemin (A-Z)</option>
                <option value="path-desc">Chemin (Z-A)</option>
                <option value="type-asc">Type (A-Z)</option>
                <option value="type-desc">Type (Z-A)</option>
                <option value="size-asc">Taille (croissant)</option>
                <option value="size-desc">Taille (décroissant)</option>
                <option value="modified-asc">Modifié (ancien)</option>
                <option value="modified-desc">Modifié (récent)</option>
              </select>
            </div>
          </div>

          {/* Statistiques du filtre */}
          {filterPath.trim() && (
            <div className="mt-3 text-sm text-gray-600">
              {filteredFiles.length} fichier{filteredFiles.length > 1 ? 's' : ''} trouvé{filteredFiles.length > 1 ? 's' : ''} sur {files.length} total
            </div>
          )}
        </div>

        {/* Files Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Fichier
                      {sortBy === 'name' && (
                        <svg className={`ml-1 w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('path')}
                  >
                    <div className="flex items-center">
                      Chemin
                      {sortBy === 'path' && (
                        <svg className={`ml-1 w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center">
                      Type
                      {sortBy === 'type' && (
                        <svg className={`ml-1 w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('size')}
                  >
                    <div className="flex items-center">
                      Taille
                      {sortBy === 'size' && (
                        <svg className={`ml-1 w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('modified')}
                  >
                    <div className="flex items-center">
                      Modifié le
                      {sortBy === 'modified' && (
                        <svg className={`ml-1 w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <tr key={file.path} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.path)}
                          onChange={() => handleSelectFile(file.path)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                        />
                        <div className="flex items-center min-w-0 flex-1">
                          {getFileIcon(file.type)}
                          <div className="ml-3 min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="truncate max-w-xs" title={file.folder ? `/${file.folder}/` : '/'}>
                        {file.folder ? `/${file.folder}/` : '/'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {formatFileType(file.type, file.name)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {file.sizeFormatted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.modifiedAtFormatted || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleViewFile(file)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Ouvrir le fichier"
                        >
                          Voir
                        </button>
                        <button 
                          className="text-yellow-600 hover:text-yellow-900 transition-colors"
                          title="Déplacer le fichier"
                        >
                          Déplacer
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedFiles(new Set([file.path]));
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Supprimer le fichier"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredFiles.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {filterPath.trim() ? 'Aucun fichier trouvé' : 'Aucun fichier'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {filterPath.trim() 
                  ? `Aucun fichier ne correspond à "${filterPath}"`
                  : 'Commencez par uploader des fichiers.'
                }
              </p>
              <div className="mt-6">
                <Link
                  href="/upload"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Upload de fichiers
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmer la suppression
                </h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Êtes-vous sûr de vouloir supprimer <strong>{selectedFiles.size} fichier{selectedFiles.size > 1 ? 's' : ''}</strong> ?
              </p>
              <p className="text-sm text-red-600 mb-4">
                ⚠️ Cette action est irréversible et ne peut pas être annulée.
              </p>
              
              {selectedFiles.size <= 5 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Fichiers à supprimer :</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {Array.from(selectedFiles).slice(0, 5).map((filePath, index) => {
                      const fileName = filePath.split('/').pop() || filePath;
                      return (
                        <li key={index} className="flex items-center">
                          <span className="text-red-500 mr-2">•</span>
                          <span className="truncate">{fileName}</span>
                        </li>
                      );
                    })}
                  </ul>
                  {selectedFiles.size > 5 && (
                    <p className="text-sm text-gray-500 mt-2">
                      ... et {selectedFiles.size - 5} autre{selectedFiles.size - 5 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteResult(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
              >
                {isDeleting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Suppression...
                  </span>
                ) : (
                  'Supprimer définitivement'
                )}
              </button>
            </div>
            
            {deleteResult && (
              <div className={`mt-4 p-3 rounded-lg ${
                deleteResult.success 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <div className="flex items-center">
                  {deleteResult.success ? (
                    <svg className="h-5 w-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <p className="text-sm font-medium">{deleteResult.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </AuthGuard>
  );
} 