import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

import { checkAuthFromToken } from '@/lib/auth';

// Fonction pour valider le type MIME
function isValidImageType(mimetype: string): boolean {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];
  
  return allowedTypes.includes(mimetype);
}

// Fonction pour générer un nom de fichier unique
function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = path.extname(originalFilename);
  const nameWithoutExt = path.basename(originalFilename, extension);
  
  return `${nameWithoutExt}_${timestamp}_${randomString}${extension}`;
}

// Fonction pour valider le nom du dossier
function isValidFolderName(folderName: string): boolean {
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(folderName) && folderName.length > 0 && folderName.length <= 50;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const authHeader = request.headers.get('authorization');
    const folder = formData.get('folder') as string;
    
    // Vérifier l'authentification
    if (!checkAuthFromToken(authHeader)) {
      return NextResponse.json(
        { error: 'Authentification échouée' },
        { status: 401 }
      );
    }
    
    // Vérifier le dossier
    if (!folder || !isValidFolderName(folder)) {
      return NextResponse.json(
        { error: 'Dossier invalide' },
        { status: 400 }
      );
    }
    
    // Récupérer les fichiers
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const targetFolder = path.join(uploadsDir, folder);
    
    // Vérifier que le dossier existe
    try {
      const stats = await fs.stat(targetFolder);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { error: 'Le dossier spécifié n\'existe pas' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Le dossier spécifié n\'existe pas' },
        { status: 400 }
      );
    }
    
    const uploadedFiles: string[] = [];
    
    for (const file of files) {
      // Vérifier le type MIME
      if (!isValidImageType(file.type)) {
        return NextResponse.json(
          { error: `Type de fichier non autorisé: ${file.type}` },
          { status: 400 }
        );
      }
      
      // Vérifier la taille (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `Fichier trop volumineux: ${file.name}` },
          { status: 400 }
        );
      }
      
      // Générer un nom unique
      const uniqueFilename = generateUniqueFilename(file.name);
      const destinationPath = path.join(targetFolder, uniqueFilename);
      
      // Convertir le fichier en buffer et l'écrire
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      await fs.writeFile(destinationPath, buffer);
      
      uploadedFiles.push(`/uploads/${folder}/${uniqueFilename}`);
    }
    
    return NextResponse.json({
      success: true,
      message: `${uploadedFiles.length} fichier(s) uploadé(s) avec succès dans le dossier "${folder}"`,
      files: uploadedFiles
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload des fichiers' },
      { status: 500 }
    );
  }
} 