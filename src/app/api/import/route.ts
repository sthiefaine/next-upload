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
    const { sourcePath, targetFolder } = body;

    if (!sourcePath) {
      return NextResponse.json(
        { error: 'Chemin source requis' },
        { status: 400 }
      );
    }

    // Vérifier que le chemin source existe
    try {
      await fs.access(sourcePath);
    } catch {
      return NextResponse.json(
        { error: 'Le chemin source n\'existe pas' },
        { status: 400 }
      );
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    let targetDir = uploadsDir;

    // Si un dossier de destination est spécifié
    if (targetFolder && targetFolder.trim()) {
      if (!isValidFolderName(targetFolder)) {
        return NextResponse.json(
          { error: 'Nom de dossier de destination invalide' },
          { status: 400 }
        );
      }
      targetDir = path.join(uploadsDir, targetFolder);
    }

    // Obtenir les statistiques du dossier source
    const sourceStat = await fs.stat(sourcePath);
    
    if (sourceStat.isFile()) {
      // Copier un fichier individuel
      const fileName = path.basename(sourcePath);
      const destPath = path.join(targetDir, fileName);
      
      // Créer le dossier de destination s'il n'existe pas
      await fs.mkdir(targetDir, { recursive: true });
      
      // Copier le fichier
      await fs.copyFile(sourcePath, destPath);
      
      const fileStat = await fs.stat(destPath);
      
      return NextResponse.json({
        success: true,
        message: `Fichier "${fileName}" importé avec succès`,
        file: {
          name: fileName,
          path: targetFolder ? `/uploads/${targetFolder}/${fileName}` : `/uploads/${fileName}`,
          size: fileStat.size,
          sizeFormatted: formatFileSize(fileStat.size)
        }
      });
      
    } else if (sourceStat.isDirectory()) {
      // Copier un dossier entier
      const result = await copyDirectory(sourcePath, targetDir);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: `${result.copied} fichier(s) importé(s) avec succès`,
          copied: result.copied,
          errors: result.errors,
          targetPath: targetDir
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Aucun fichier importé',
          errors: result.errors
        }, { status: 500 });
      }
    } else {
      return NextResponse.json(
        { error: 'Le chemin source doit être un fichier ou un dossier' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Erreur lors de l\'import:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'import' },
      { status: 500 }
    );
  }
} 