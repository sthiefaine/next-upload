import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Fonction pour vérifier l'authentification
function checkAuth(username: string, password: string): boolean {
  const expectedUser = process.env.USER;
  const expectedPassword = process.env.PASSWORD;
  
  return username === expectedUser && password === expectedPassword;
}

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const folder = searchParams.get('folder');
    
    // Vérifier l'authentification
    if (!username || !password || !checkAuth(username, password)) {
      return NextResponse.json(
        { error: 'Authentification échouée' },
        { status: 401 }
      );
    }
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (folder) {
      // Lister les fichiers dans un dossier spécifique
      if (!isValidFolderName(folder)) {
        return NextResponse.json(
          { error: 'Nom de dossier invalide' },
          { status: 400 }
        );
      }
      
      const folderPath = path.join(uploadsDir, folder);
      
      try {
        const stats = await fs.stat(folderPath);
        if (!stats.isDirectory()) {
          return NextResponse.json(
            { error: 'Le dossier n\'existe pas' },
            { status: 404 }
          );
        }
        
        const items = await fs.readdir(folderPath, { withFileTypes: true });
        const files = [];
        let totalSize = 0;
        
        for (const item of items) {
          if (item.isFile() && item.name !== '.htaccess') { // Masquer les .htaccess
            const filePath = path.join(folderPath, item.name);
            const fileStats = await fs.stat(filePath);
            
            files.push({
              name: item.name,
              path: `/uploads/${folder}/${item.name}`,
              size: fileStats.size,
              sizeFormatted: formatFileSize(fileStats.size),
              type: path.extname(item.name).toLowerCase()
            });
            
            totalSize += fileStats.size;
          }
        }
        
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
        return NextResponse.json(
          { error: 'Le dossier n\'existe pas' },
          { status: 404 }
        );
      }
      
    } else {
      // Lister tous les fichiers dans tous les dossiers
      try {
        const items = await fs.readdir(uploadsDir, { withFileTypes: true });
        const folders = items.filter(item => item.isDirectory());
        
        const allFiles: Array<{
          name: string;
          path: string;
          folder: string;
          size: number;
          sizeFormatted: string;
          type: string;
        }> = [];
        let totalSize = 0;
        
        for (const folderItem of folders) {
          const folderPath = path.join(uploadsDir, folderItem.name);
          const folderItems = await fs.readdir(folderPath, { withFileTypes: true });
          
          for (const item of folderItems) {
            if (item.isFile() && item.name !== '.htaccess') { // Masquer les .htaccess
              const filePath = path.join(folderPath, item.name);
              const fileStats = await fs.stat(filePath);
              
              allFiles.push({
                name: item.name,
                path: `/uploads/${folderItem.name}/${item.name}`,
                folder: folderItem.name,
                size: fileStats.size,
                sizeFormatted: formatFileSize(fileStats.size),
                type: path.extname(item.name).toLowerCase()
              });
              
              totalSize += fileStats.size;
            }
          }
        }
        
        allFiles.sort((a, b) => a.name.localeCompare(b.name));
        
        return NextResponse.json({
          success: true,
          files: allFiles,
          totalFiles: allFiles.length,
          totalSize: totalSize,
          totalSizeFormatted: formatFileSize(totalSize)
        });
        
      } catch (error) {
        return NextResponse.json(
          { error: 'Erreur lors de la lecture des fichiers' },
          { status: 500 }
        );
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