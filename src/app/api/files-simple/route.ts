import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Fonction pour vérifier l'authentification par token WRITE
function checkWriteToken(token: string): boolean {
  const expectedToken = process.env.UPLOADFILES_WRITE_TOKEN;
  return token === expectedToken;
}

// Fonction pour vérifier l'authentification par token SIMPLE (lecture)
function checkSimpleToken(token: string): boolean {
  const expectedToken = process.env.UPLOADFILES_SIMPLE_TOKEN;
  return token === expectedToken;
}

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

// Fonction pour formater la taille en bytes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// GET - Lister les fichiers (token SIMPLE ou WRITE)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const folder = searchParams.get('folder');
    
    // Vérifier l'authentification (SIMPLE ou WRITE)
    if (!token || (!checkSimpleToken(token) && !checkWriteToken(token))) {
      return NextResponse.json(
        { error: 'Token invalide' },
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
          if (item.isFile() && item.name !== '.htaccess') {
            const filePath = path.join(folderPath, item.name);
            const fileStats = await fs.stat(filePath);
            
            files.push({
              name: item.name,
              url: `/uploads/${folder}/${item.name}`,
              size: fileStats.size,
              sizeFormatted: formatFileSize(fileStats.size),
              type: path.extname(item.name).toLowerCase(),
              uploadedAt: fileStats.mtime.toISOString()
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
          url: string;
          folder: string;
          size: number;
          sizeFormatted: string;
          type: string;
          uploadedAt: string;
        }> = [];
        let totalSize = 0;
        
        for (const folderItem of folders) {
          const folderPath = path.join(uploadsDir, folderItem.name);
          const folderItems = await fs.readdir(folderPath, { withFileTypes: true });
          
          for (const item of folderItems) {
            if (item.isFile() && item.name !== '.htaccess') {
              const filePath = path.join(folderPath, item.name);
              const fileStats = await fs.stat(filePath);
              
              allFiles.push({
                name: item.name,
                url: `/uploads/${folderItem.name}/${item.name}`,
                folder: folderItem.name,
                size: fileStats.size,
                sizeFormatted: formatFileSize(fileStats.size),
                type: path.extname(item.name).toLowerCase(),
                uploadedAt: fileStats.mtime.toISOString()
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

// POST - Upload de fichiers (token WRITE uniquement)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Récupérer le token d'authentification
    const token = formData.get('token') as string;
    const folder = formData.get('folder') as string;
    
    // Vérifier l'authentification (WRITE uniquement)
    if (!token || !checkWriteToken(token)) {
      return NextResponse.json(
        { error: 'Token WRITE invalide' },
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
    
    // Créer le dossier s'il n'existe pas
    try {
      await fs.access(targetFolder);
    } catch {
      await fs.mkdir(targetFolder, { recursive: true });
      
      // Créer le fichier .htaccess pour protéger le dossier
      const htaccessContent = `# Désactiver l'exécution de scripts
<FilesMatch "\.(php|php3|php4|php5|phtml|pl|py|jsp|asp|sh|cgi)$">
  Order Deny,Allow
  Deny from all
</FilesMatch>

# Autoriser seulement les images
<FilesMatch "\.(jpg|jpeg|png|gif|webp|svg)$">
  Order Allow,Deny
  Allow from all
</FilesMatch>

# Désactiver l'exécution de scripts dans ce dossier
Options -ExecCGI
RemoveHandler .php .php3 .php4 .php5 .phtml .pl .py .jsp .asp .sh .cgi
`;
      
      await fs.writeFile(path.join(targetFolder, '.htaccess'), htaccessContent);
    }
    
    const uploadedFiles: Array<{
      name: string;
      url: string;
      size: number;
      sizeFormatted: string;
    }> = [];
    
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
      
      uploadedFiles.push({
        name: uniqueFilename,
        url: `/uploads/${folder}/${uniqueFilename}`,
        size: file.size,
        sizeFormatted: formatFileSize(file.size)
      });
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

// DELETE - Supprimer un fichier (token WRITE uniquement)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const fileUrl = searchParams.get('file');
    
    // Vérifier l'authentification (WRITE uniquement)
    if (!token || !checkWriteToken(token)) {
      return NextResponse.json(
        { error: 'Token WRITE invalide' },
        { status: 401 }
      );
    }
    
    if (!fileUrl) {
      return NextResponse.json(
        { error: 'URL du fichier requise' },
        { status: 400 }
      );
    }
    
    // Extraire le chemin du fichier depuis l'URL
    const filePath = fileUrl.replace('/uploads/', '');
    const fullPath = path.join(process.cwd(), 'public', 'uploads', filePath);
    
    // Vérifier que le fichier existe et n'est pas un .htaccess
    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isFile()) {
        return NextResponse.json(
          { error: 'Le fichier n\'existe pas' },
          { status: 404 }
        );
      }
      
      if (path.basename(fullPath) === '.htaccess') {
        return NextResponse.json(
          { error: 'Impossible de supprimer les fichiers .htaccess' },
          { status: 403 }
        );
      }
      
      // Supprimer le fichier
      await fs.unlink(fullPath);
      
      return NextResponse.json({
        success: true,
        message: 'Fichier supprimé avec succès'
      });
      
    } catch (error) {
      return NextResponse.json(
        { error: 'Le fichier n\'existe pas' },
        { status: 404 }
      );
    }
    
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du fichier' },
      { status: 500 }
    );
  }
} 