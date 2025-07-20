import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

import { checkAuthFromToken } from '@/lib/auth';

// Fonction pour valider le nom du dossier
function isValidFolderName(folderName: string): boolean {
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(folderName) && folderName.length > 0 && folderName.length <= 50;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const authHeader = request.headers.get('authorization');
    
    // Récupérer les données
    const type = formData.get('type') as string; // 'folder' ou 'file'
    const oldName = formData.get('oldName') as string;
    const newName = formData.get('newName') as string;
    
    // Vérifier l'authentification
    if (!checkAuthFromToken(authHeader)) {
      return NextResponse.json(
        { error: 'Authentification échouée' },
        { status: 401 }
      );
    }
    
    if (!type || !oldName || !newName) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (type === 'folder') {
      // Renommer un dossier
      if (!isValidFolderName(oldName) || !isValidFolderName(newName)) {
        return NextResponse.json(
          { error: 'Nom de dossier invalide' },
          { status: 400 }
        );
      }
      
      const oldPath = path.join(uploadsDir, oldName);
      const newPath = path.join(uploadsDir, newName);
      
      try {
        // Vérifier que l'ancien dossier existe
        const oldStats = await fs.stat(oldPath);
        if (!oldStats.isDirectory()) {
          return NextResponse.json(
            { error: 'Le dossier source n\'existe pas' },
            { status: 404 }
          );
        }
        
        // Vérifier que le nouveau nom n'existe pas déjà
        try {
          const newStats = await fs.stat(newPath);
          if (newStats.isDirectory()) {
            return NextResponse.json(
              { error: 'Un dossier avec ce nom existe déjà' },
              { status: 400 }
            );
          }
        } catch (error) {
          // Le nouveau nom n'existe pas, on peut continuer
        }
        
        // Renommer le dossier
        await fs.rename(oldPath, newPath);
        
        return NextResponse.json({
          success: true,
          message: `Dossier "${oldName}" renommé en "${newName}"`
        });
        
      } catch (error) {
        return NextResponse.json(
          { error: 'Le dossier source n\'existe pas' },
          { status: 404 }
        );
      }
      
    } else if (type === 'file') {
      // Renommer un fichier
      const oldFilePath = path.join(process.cwd(), 'public', oldName);
      const newFilePath = path.join(process.cwd(), 'public', newName);
      
      // Vérifier que le fichier est dans le dossier uploads
      if (!oldFilePath.startsWith(path.join(process.cwd(), 'public', 'uploads')) ||
          !newFilePath.startsWith(path.join(process.cwd(), 'public', 'uploads'))) {
        return NextResponse.json(
          { error: 'Chemin de fichier invalide' },
          { status: 400 }
        );
      }
      
      try {
        // Vérifier que l'ancien fichier existe
        const oldStats = await fs.stat(oldFilePath);
        if (!oldStats.isFile()) {
          return NextResponse.json(
            { error: 'Le fichier source n\'existe pas' },
            { status: 404 }
          );
        }
        
        // Vérifier que c'est bien une image
        const ext = path.extname(oldFilePath).toLowerCase();
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        
        if (!allowedExtensions.includes(ext)) {
          return NextResponse.json(
            { error: 'Type de fichier non autorisé' },
            { status: 400 }
          );
        }
        
        // Vérifier que le nouveau nom a la même extension
        const newExt = path.extname(newFilePath).toLowerCase();
        if (ext !== newExt) {
          return NextResponse.json(
            { error: 'L\'extension du fichier ne peut pas être modifiée' },
            { status: 400 }
          );
        }
        
        // Vérifier que le nouveau nom n'existe pas déjà
        try {
          const newStats = await fs.stat(newFilePath);
          if (newStats.isFile()) {
            return NextResponse.json(
              { error: 'Un fichier avec ce nom existe déjà' },
              { status: 400 }
            );
          }
        } catch (error) {
          // Le nouveau nom n'existe pas, on peut continuer
        }
        
        // Renommer le fichier
        await fs.rename(oldFilePath, newFilePath);
        
        return NextResponse.json({
          success: true,
          message: 'Fichier renommé avec succès',
          oldPath: oldName,
          newPath: newName
        });
        
      } catch (error) {
        return NextResponse.json(
          { error: 'Le fichier source n\'existe pas' },
          { status: 404 }
        );
      }
      
    } else {
      return NextResponse.json(
        { error: 'Type de renommage invalide' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Erreur lors du renommage:', error);
    return NextResponse.json(
      { error: 'Erreur lors du renommage' },
      { status: 500 }
    );
  }
} 