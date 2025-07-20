import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { checkAuthFromToken } from '@/lib/auth';

// Fonction pour valider le nom du dossier
function isValidFolderName(folderName: string): boolean {
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(folderName) && folderName.length > 0 && folderName.length <= 50;
}

// Fonction pour déplacer récursivement un dossier
async function moveDirectory(src: string, dest: string): Promise<{ success: boolean; moved: number; errors: string[] }> {
  const results = { success: false, moved: 0, errors: [] as string[] };
  
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
          // Récursivement déplacer les sous-dossiers
          const subResult = await moveDirectory(srcPath, destPath);
          results.moved += subResult.moved;
          results.errors.push(...subResult.errors);
        } else {
          // Déplacer le fichier
          await fs.rename(srcPath, destPath);
          results.moved++;
        }
      } catch (error) {
        results.errors.push(`Erreur lors du déplacement de ${item}: ${error}`);
      }
    }
    
    // Supprimer le dossier source s'il est vide
    try {
      const remainingItems = await fs.readdir(src);
      if (remainingItems.length === 0) {
        await fs.rmdir(src);
      }
    } catch (error) {
      // Ignorer l'erreur si le dossier n'est pas vide
    }
    
    results.success = results.moved > 0;
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
    const { sourceFolder, targetFolder } = body;

    if (!sourceFolder) {
      return NextResponse.json(
        { error: 'Dossier source requis' },
        { status: 400 }
      );
    }

    if (!targetFolder) {
      return NextResponse.json(
        { error: 'Dossier de destination requis' },
        { status: 400 }
      );
    }

    // Vérifier que le dossier source existe
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const sourcePath = path.join(uploadsDir, sourceFolder);
    
    try {
      await fs.access(sourcePath);
    } catch {
      return NextResponse.json(
        { error: 'Le dossier source n\'existe pas' },
        { status: 400 }
      );
    }

    // Analyser le chemin de destination
    const targetPathParts = targetFolder.split('/');
    const targetDirName = targetPathParts[targetPathParts.length - 1];
    const targetParentPath = targetPathParts.slice(0, -1).join('/');
    
    // Valider le nom du dossier de destination
    if (!isValidFolderName(targetDirName)) {
      return NextResponse.json(
        { error: 'Nom de dossier de destination invalide' },
        { status: 400 }
      );
    }

    // Construire le chemin complet de destination
    let targetPath: string;
    if (targetParentPath) {
      // Déplacer dans un sous-dossier existant
      const parentPath = path.join(uploadsDir, targetParentPath);
      try {
        await fs.access(parentPath);
      } catch {
        return NextResponse.json(
          { error: 'Le dossier parent de destination n\'existe pas' },
          { status: 400 }
        );
      }
      targetPath = path.join(parentPath, targetDirName);
    } else {
      // Déplacer à la racine
      targetPath = path.join(uploadsDir, targetDirName);
    }

    // Vérifier que le dossier de destination n'existe pas déjà
    try {
      await fs.access(targetPath);
      return NextResponse.json(
        { error: 'Le dossier de destination existe déjà' },
        { status: 400 }
      );
    } catch {
      // Le dossier de destination n'existe pas, c'est bien
    }

    // Déplacer le dossier
    const result = await moveDirectory(sourcePath, targetPath);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Dossier "${sourceFolder}" déplacé vers "${targetFolder}"`,
        moved: result.moved,
        errors: result.errors
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Aucun fichier déplacé',
        errors: result.errors
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Erreur lors du déplacement:', error);
    return NextResponse.json(
      { error: 'Erreur lors du déplacement' },
      { status: 500 }
    );
  }
} 