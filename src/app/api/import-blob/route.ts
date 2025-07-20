import { NextRequest, NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';
import { promises as fs } from 'fs';
import path from 'path';

// Configuration Vercel Blob avec token dynamique
function createBlobClient(token: string) {
  return {
    list: () => list({ token }),
    del: (url: string) => del(url, { token })
  };
}

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

// Fonction pour télécharger un fichier depuis une URL
async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erreur lors du téléchargement: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
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
    const token = searchParams.get('token');
    
    // Vérifier l'authentification
    if (!username || !password || !checkAuth(username, password)) {
      return NextResponse.json(
        { error: 'Authentification échouée' },
        { status: 401 }
      );
    }

    // Vérifier le token Vercel Blob
    if (!token) {
      return NextResponse.json(
        { error: 'Token Vercel Blob requis' },
        { status: 400 }
      );
    }

    // Créer le client Vercel Blob avec le token
    const blobClient = createBlobClient(token);

    // Lister tous les blobs
    const { blobs } = await blobClient.list();
    
    const blobFiles = blobs
      .filter(blob => !blob.pathname.includes('.htaccess')) // Masquer les .htaccess
      .map(blob => ({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
        sizeFormatted: formatFileSize(blob.size)
      }));

    return NextResponse.json({
      success: true,
      files: blobFiles,
      totalFiles: blobFiles.length,
      totalSize: blobFiles.reduce((sum, file) => sum + file.size, 0),
      totalSizeFormatted: formatFileSize(blobFiles.reduce((sum, file) => sum + file.size, 0))
    });

  } catch (error) {
    console.error('Erreur lors de la lecture des blobs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la lecture des blobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const token = searchParams.get('token');
    
    // Vérifier l'authentification
    if (!username || !password || !checkAuth(username, password)) {
      return NextResponse.json(
        { error: 'Authentification échouée' },
        { status: 401 }
      );
    }

    // Vérifier le token Vercel Blob
    if (!token) {
      return NextResponse.json(
        { error: 'Token Vercel Blob requis' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { blobUrl, targetFolder, deleteAfterImport = false, folderName, batchImport = false } = body;

    if (!targetFolder) {
      return NextResponse.json(
        { error: 'Dossier de destination requis' },
        { status: 400 }
      );
    }

    // Vérifier si c'est un batch import ou un import individuel
    if (batchImport) {
      if (!folderName) {
        return NextResponse.json(
          { error: 'Nom du dossier source requis pour le batch import' },
          { status: 400 }
        );
      }

      // Créer le client Vercel Blob avec le token
      const blobClient = createBlobClient(token);

      // Importer tous les blobs du dossier
      const result = await importBlobsFromFolder(blobClient, folderName, targetFolder, deleteAfterImport);

      return NextResponse.json({
        success: result.success,
        message: result.success 
          ? `${result.imported} fichier(s) importé(s) avec succès dans le dossier "${targetFolder}"`
          : 'Aucun fichier importé',
        imported: result.imported,
        errors: result.errors,
        deletedFromBlob: deleteAfterImport
      });
    }

    // Import individuel
    if (!blobUrl) {
      return NextResponse.json(
        { error: 'URL du blob requise pour l\'import individuel' },
        { status: 400 }
      );
    }

    // Valider le nom du dossier
    if (!isValidFolderName(targetFolder)) {
      return NextResponse.json(
        { error: 'Nom de dossier invalide' },
        { status: 400 }
      );
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const targetDir = path.join(uploadsDir, targetFolder);

    // Créer le dossier s'il n'existe pas
    try {
      await fs.access(targetDir);
    } catch {
      await fs.mkdir(targetDir, { recursive: true });
      
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
      
      await fs.writeFile(path.join(targetDir, '.htaccess'), htaccessContent);
    }

    // Extraire le nom du fichier depuis l'URL du blob
    const urlParts = blobUrl.split('/');
    const fileName = urlParts[urlParts.length - 1] || `imported-${Date.now()}.jpg`;
    
    // Télécharger le fichier depuis Vercel Blob
    const fileBuffer = await downloadFile(blobUrl);
    const filePath = path.join(targetDir, fileName);
    
    // Sauvegarder le fichier localement
    await fs.writeFile(filePath, fileBuffer);
    
    // Créer le client Vercel Blob avec le token
    const blobClient = createBlobClient(token);

    // Supprimer le blob si demandé
    if (deleteAfterImport) {
      try {
        await blobClient.del(blobUrl);
      } catch (deleteError) {
        console.warn('Impossible de supprimer le blob:', deleteError);
      }
    }

    const fileStats = await fs.stat(filePath);

    return NextResponse.json({
      success: true,
      message: `Fichier importé avec succès dans le dossier "${targetFolder}"`,
      file: {
        name: fileName,
        path: `/uploads/${targetFolder}/${fileName}`,
        size: fileStats.size,
        sizeFormatted: formatFileSize(fileStats.size)
      },
      deletedFromBlob: deleteAfterImport
    });

  } catch (error) {
    console.error('Erreur lors de l\'import du blob:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'import du blob' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const token = searchParams.get('token');
    const blobUrl = searchParams.get('blobUrl');
    
    // Vérifier l'authentification
    if (!username || !password || !checkAuth(username, password)) {
      return NextResponse.json(
        { error: 'Authentification échouée' },
        { status: 401 }
      );
    }

    // Vérifier le token Vercel Blob
    if (!token) {
      return NextResponse.json(
        { error: 'Token Vercel Blob requis' },
        { status: 400 }
      );
    }

    if (!blobUrl) {
      return NextResponse.json(
        { error: 'URL du blob requise' },
        { status: 400 }
      );
    }

    // Créer le client Vercel Blob avec le token
    const blobClient = createBlobClient(token);

    // Supprimer le blob
    await blobClient.del(blobUrl);

    return NextResponse.json({
      success: true,
      message: 'Blob supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression du blob:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du blob' },
      { status: 500 }
    );
  }
}

// Fonction pour importer tous les blobs d'un dossier spécifique
async function importBlobsFromFolder(
  blobClient: any,
  folderName: string,
  targetFolder: string,
  deleteAfterImport: boolean
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  try {
    const { blobs } = await blobClient.list();
    
    // Filtrer les blobs du dossier spécifique et exclure .htaccess
    const folderBlobs = blobs.filter(blob => 
      blob.pathname.startsWith(folderName + '/') && 
      !blob.pathname.includes('.htaccess')
    );

    if (folderBlobs.length === 0) {
      return { success: false, imported: 0, errors: [`Aucun blob trouvé dans le dossier "${folderName}"`] };
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const targetDir = path.join(uploadsDir, targetFolder);

    // Créer le dossier s'il n'existe pas
    try {
      await fs.access(targetDir);
    } catch {
      await fs.mkdir(targetDir, { recursive: true });
      
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
      
      await fs.writeFile(path.join(targetDir, '.htaccess'), htaccessContent);
    }

    let imported = 0;
    const errors: string[] = [];

    for (const blob of folderBlobs) {
      try {
        // Extraire le nom du fichier depuis le pathname
        const fileName = blob.pathname.split('/').pop() || `imported-${Date.now()}.jpg`;
        
        // Télécharger le fichier depuis Vercel Blob
        const fileBuffer = await downloadFile(blob.url);
        const filePath = path.join(targetDir, fileName);
        
        // Sauvegarder le fichier localement
        await fs.writeFile(filePath, fileBuffer);
        
        // Supprimer le blob si demandé
        if (deleteAfterImport) {
          try {
            await blobClient.del(blob.url);
          } catch (deleteError) {
            console.warn(`Impossible de supprimer le blob ${blob.pathname}:`, deleteError);
          }
        }
        
        imported++;
      } catch (error) {
        errors.push(`Erreur lors de l'import de ${blob.pathname}: ${error}`);
      }
    }

    return { 
      success: imported > 0, 
      imported, 
      errors 
    };

  } catch (error) {
    return { 
      success: false, 
      imported: 0, 
      errors: [`Erreur générale: ${error}`] 
    };
  }
} 