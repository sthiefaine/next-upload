import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { checkAuthFromToken } from '@/lib/auth';

// Fonction pour formater la taille en bytes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Fonction pour copier récursivement un dossier
async function copyDirectory(src: string, dest: string): Promise<{ success: boolean; copied: number; errors: string[] }> {
  const results = { success: false, copied: 0, errors: [] as string[] };
  
  try {
    // Créer le dossier de destination s'il n'existe pas
    await fs.mkdir(dest, { recursive: true });
    
    // Lire le contenu du dossier source
    const items = await fs.readdir(src);
    
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      try {
        const stat = await fs.stat(srcPath);
        
        if (stat.isDirectory()) {
          // Récursivement copier les sous-dossiers
          const subResult = await copyDirectory(srcPath, destPath);
          results.copied += subResult.copied;
          results.errors.push(...subResult.errors);
        } else {
          // Copier le fichier
          await fs.copyFile(srcPath, destPath);
          results.copied++;
        }
      } catch (error) {
        results.errors.push(`Erreur lors de la copie de ${item}: ${error}`);
      }
    }
    
    results.success = results.copied > 0;
    return results;
    
  } catch (error) {
    results.errors.push(`Erreur générale: ${error}`);
    return results;
  }
}

// Fonction pour scanner récursivement un dossier et compter les fichiers
async function scanDirectory(dirPath: string): Promise<{ files: string[]; totalSize: number }> {
  const files: string[] = [];
  let totalSize = 0;
  
  try {
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory()) {
        // Récursivement scanner les sous-dossiers
        const subResult = await scanDirectory(itemPath);
        files.push(...subResult.files);
        totalSize += subResult.totalSize;
      } else {
        // Ajouter le fichier
        files.push(itemPath);
        totalSize += stat.size;
      }
    }
  } catch (error) {
    console.error(`Erreur lors du scan du dossier ${dirPath}:`, error);
  }
  
  return { files, totalSize };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!checkAuthFromToken(authHeader)) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sourceFolder, targetPath } = body;

    if (!targetPath) {
      return NextResponse.json(
        { error: 'Chemin de destination requis' },
        { status: 400 }
      );
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    let sourceDir = uploadsDir;

    // Si un dossier source est spécifié
    if (sourceFolder && sourceFolder.trim()) {
      sourceDir = path.join(uploadsDir, sourceFolder);
      
      // Vérifier que le dossier source existe
      try {
        await fs.access(sourceDir);
      } catch {
        return NextResponse.json(
          { error: 'Le dossier source n\'existe pas' },
          { status: 400 }
        );
      }
    }

    // Vérifier que le dossier source existe et contient des fichiers
    try {
      const sourceStat = await fs.stat(sourceDir);
      if (!sourceStat.isDirectory()) {
        return NextResponse.json(
          { error: 'Le chemin source doit être un dossier' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Le dossier source n\'existe pas' },
        { status: 400 }
      );
    }

    // Scanner le dossier source pour obtenir les statistiques
    const scanResult = await scanDirectory(sourceDir);
    
    if (scanResult.files.length === 0) {
      return NextResponse.json(
        { error: 'Le dossier source ne contient aucun fichier' },
        { status: 400 }
      );
    }

    // Copier le dossier vers la destination
    const result = await copyDirectory(sourceDir, targetPath);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `${result.copied} fichier(s) exporté(s) avec succès`,
        copied: result.copied,
        totalSize: scanResult.totalSize,
        totalSizeFormatted: formatFileSize(scanResult.totalSize),
        sourcePath: sourceDir,
        targetPath: targetPath,
        errors: result.errors
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Aucun fichier exporté',
        errors: result.errors
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'export' },
      { status: 500 }
    );
  }
} 