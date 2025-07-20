import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

import { checkAuthFromToken } from '@/lib/auth';

// Fonction pour valider le nom du dossier
function isValidFolderName(folderName: string): boolean {
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(folderName) && folderName.length > 0 && folderName.length <= 50;
}

// Fonction pour supprimer récursivement un dossier
async function deleteFolderRecursive(folderPath: string): Promise<void> {
  const items = await fs.readdir(folderPath, { withFileTypes: true });
  
  for (const item of items) {
    const itemPath = path.join(folderPath, item.name);
    
    if (item.isDirectory()) {
      await deleteFolderRecursive(itemPath);
    } else {
      await fs.unlink(itemPath);
    }
  }
  
  await fs.rmdir(folderPath);
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');
    
    // Vérifier l'authentification
    if (!checkAuthFromToken(authHeader)) {
      return NextResponse.json(
        { error: 'Authentification échouée' },
        { status: 401 }
      );
    }
    
    // Support pour les deux formats : ancien (type/target) et nouveau (filePath)
    let type = searchParams.get('type');
    let target = searchParams.get('target');
    const filePath = searchParams.get('filePath');
    
    // Si filePath est fourni, on l'utilise pour la suppression de fichier
    if (filePath) {
      type = 'file';
      target = decodeURIComponent(filePath);
    }
    
    if (!type || !target) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (type === 'folder') {
      // Supprimer un dossier
      if (!isValidFolderName(target)) {
        return NextResponse.json(
          { error: 'Nom de dossier invalide' },
          { status: 400 }
        );
      }
      
      const folderPath = path.join(uploadsDir, target);
      
      try {
        const stats = await fs.stat(folderPath);
        if (!stats.isDirectory()) {
          return NextResponse.json(
            { error: 'Le dossier n\'existe pas' },
            { status: 404 }
          );
        }
        
        // Supprimer le dossier et tout son contenu
        await deleteFolderRecursive(folderPath);
        
        return NextResponse.json({
          success: true,
          message: `Dossier "${target}" supprimé avec succès`
        });
        
      } catch {
        return NextResponse.json(
          { error: 'Le dossier n\'existe pas' },
          { status: 404 }
        );
      }
      
    } else if (type === 'file') {
      // Supprimer un fichier
      const filePath = path.join(process.cwd(), 'public', target);
      
      console.log('Tentative de suppression du fichier:', filePath);
      
      // Vérifier que le fichier est dans le dossier uploads
      if (!filePath.startsWith(path.join(process.cwd(), 'public', 'uploads'))) {
        console.log('Chemin invalide:', filePath);
        return NextResponse.json(
          { error: 'Chemin de fichier invalide' },
          { status: 400 }
        );
      }
      
      try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
          console.log('Le fichier n\'existe pas ou n\'est pas un fichier:', filePath);
          return NextResponse.json(
            { error: 'Le fichier n\'existe pas' },
            { status: 404 }
          );
        }
        
        // Vérifier que c'est bien une image (optionnel pour la suppression)
        const ext = path.extname(filePath).toLowerCase();
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.avi', '.mov', '.pdf', '.doc', '.docx', '.txt'];
        
        if (!allowedExtensions.includes(ext)) {
          console.log('Extension non autorisée:', ext);
          // On continue quand même pour permettre la suppression de tous types de fichiers
        }
        
        await fs.unlink(filePath);
        console.log('Fichier supprimé avec succès:', filePath);
        
        return NextResponse.json({
          success: true,
          message: 'Fichier supprimé avec succès'
        });
        
      } catch (error) {
        console.error('Erreur lors de la suppression du fichier:', filePath, error);
        return NextResponse.json(
          { error: `Erreur lors de la suppression: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
          { status: 500 }
        );
      }
      
    } else {
      return NextResponse.json(
        { error: 'Type de suppression invalide' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
} 