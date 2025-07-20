import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

import { checkAuthFromToken } from '@/lib/auth';

// Fonction pour valider le nom du dossier
function isValidFolderName(folderName: string): boolean {
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(folderName) && folderName.length > 0 && folderName.length <= 50;
}

// Fonction pour formater la taille en bytes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Fonction récursive pour lister tous les fichiers dans un dossier et ses sous-dossiers
async function listFilesRecursively(dirPath: string, baseFolder: string = ''): Promise<Array<{
  name: string;
  path: string;
  folder: string;
  size: number;
  sizeFormatted: string;
  type: string;
  modifiedAt: string;
  modifiedAtFormatted: string;
}>> {
  const files: Array<{
    name: string;
    path: string;
    folder: string;
    size: number;
    sizeFormatted: string;
    type: string;
    modifiedAt: string;
    modifiedAtFormatted: string;
  }> = [];
  
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        // Récursion pour les sous-dossiers
        const subFolder = baseFolder ? `${baseFolder}/${item.name}` : item.name;
        const subFiles = await listFilesRecursively(itemPath, subFolder);
        files.push(...subFiles);
      } else if (item.isFile() && item.name !== '.htaccess') {
        // Ajouter le fichier
        const fileStats = await fs.stat(itemPath);
        const relativePath = path.relative(path.join(process.cwd(), 'public', 'uploads'), itemPath);
        const folder = path.dirname(relativePath);
        
        files.push({
          name: item.name,
          path: `/uploads/${relativePath}`,
          folder: folder === '.' ? '' : folder,
          size: fileStats.size,
          sizeFormatted: formatFileSize(fileStats.size),
          type: path.extname(item.name).toLowerCase(),
          modifiedAt: fileStats.mtime.toISOString(),
          modifiedAtFormatted: fileStats.mtime.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
        });
      }
    }
  } catch (error) {
    console.error(`Erreur lors de la lecture du dossier ${dirPath}:`, error);
  }
  
  return files;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');
    const authHeader = request.headers.get('authorization');
    
    // Vérifier l'authentification
    if (!checkAuthFromToken(authHeader)) {
      return NextResponse.json(
        { error: 'Authentification échouée' },
        { status: 401 }
      );
    }
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (folder) {
      // Lister les fichiers dans un dossier spécifique (peut inclure des sous-dossiers)
      const folderPath = path.join(uploadsDir, folder);
      
      try {
        const stats = await fs.stat(folderPath);
        if (!stats.isDirectory()) {
          return NextResponse.json(
            { error: 'Le dossier n\'existe pas' },
            { status: 404 }
          );
        }
        
        // Utiliser la fonction récursive pour lister tous les fichiers dans ce dossier
        const files = await listFilesRecursively(folderPath, folder);
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        
        files.sort((a, b) => a.name.localeCompare(b.name));
        
        return NextResponse.json({
          success: true,
          folder: folder,
          files: files,
          totalFiles: files.length,
          totalSize: totalSize,
          totalSizeFormatted: formatFileSize(totalSize)
        });
        
      } catch (error) {
        console.error(`Erreur lors de la lecture du dossier ${folder}:`, error);
        return NextResponse.json(
          { error: 'Le dossier n\'existe pas' },
          { status: 404 }
        );
      }
      
    } else {
      // Lister tous les fichiers dans tous les dossiers et sous-dossiers
      try {
        // S'assurer que le dossier uploads existe
        await fs.mkdir(uploadsDir, { recursive: true });
        
        // Utiliser la fonction récursive pour lister tous les fichiers
        const allFiles = await listFilesRecursively(uploadsDir);
        const totalSize = allFiles.reduce((sum, file) => sum + file.size, 0);
        
        allFiles.sort((a, b) => a.name.localeCompare(b.name));
        
        return NextResponse.json({
          success: true,
          files: allFiles,
          totalFiles: allFiles.length,
          totalSize: totalSize,
          totalSizeFormatted: formatFileSize(totalSize)
        });
        
      } catch (error) {
        console.error('Erreur lors de la lecture des fichiers:', error);
        // Retourner une réponse vide en cas d'erreur plutôt qu'une erreur 500
        return NextResponse.json({
          success: true,
          files: [],
          totalFiles: 0,
          totalSize: 0,
          totalSizeFormatted: '0 B'
        });
      }
    }
    
  } catch (error) {
    console.error('Erreur lors de la lecture des fichiers:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la lecture des fichiers' },
      { status: 500 }
    );
  }
} 