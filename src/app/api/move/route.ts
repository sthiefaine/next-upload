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

// Fonction pour créer le fichier .htaccess
async function createHtaccess(folderPath: string) {
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

  await fs.writeFile(path.join(folderPath, '.htaccess'), htaccessContent);
}

// Fonction pour copier récursivement un dossier
async function copyFolderRecursive(source: string, destination: string) {
  // Créer le dossier de destination s'il n'existe pas
  await fs.mkdir(destination, { recursive: true });
  
  // Créer le .htaccess dans le nouveau dossier
  await createHtaccess(destination);
  
  const items = await fs.readdir(source, { withFileTypes: true });
  
  for (const item of items) {
    const sourcePath = path.join(source, item.name);
    const destPath = path.join(destination, item.name);
    
    if (item.isDirectory()) {
      // Copier récursivement les sous-dossiers
      await copyFolderRecursive(sourcePath, destPath);
    } else if (item.isFile() && item.name !== '.htaccess') {
      // Copier les fichiers (sauf .htaccess qui sera recréé)
      await fs.copyFile(sourcePath, destPath);
    }
  }
}

// Fonction pour supprimer récursivement un dossier
async function removeFolderRecursive(folderPath: string) {
  const items = await fs.readdir(folderPath, { withFileTypes: true });
  
  for (const item of items) {
    const itemPath = path.join(folderPath, item.name);
    
    if (item.isDirectory()) {
      await removeFolderRecursive(itemPath);
    } else {
      await fs.unlink(itemPath);
    }
  }
  
  await fs.rmdir(folderPath);
}

// Fonction pour vérifier si un chemin est un sous-chemin d'un autre
function isSubPath(parent: string, child: string): boolean {
  const normalizedParent = path.normalize(parent);
  const normalizedChild = path.normalize(child);
  return normalizedChild.startsWith(normalizedParent + path.sep);
}

// POST - Déplacer un dossier ou fichier
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    
    // Vérifier l'authentification
    if (!username || !password || !checkAuth(username, password)) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { source, destination, type = 'folder' } = body;
    
    if (!source || !destination) {
      return NextResponse.json(
        { error: 'Source et destination requises' },
        { status: 400 }
      );
    }
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Construire les chemins complets
    const sourcePath = path.join(uploadsDir, source);
    const destPath = path.join(uploadsDir, destination);
    
    // Vérifier que la source existe
    try {
      const sourceStats = await fs.stat(sourcePath);
      if (type === 'folder' && !sourceStats.isDirectory()) {
        return NextResponse.json(
          { error: 'La source n\'est pas un dossier' },
          { status: 400 }
        );
      }
      if (type === 'file' && !sourceStats.isFile()) {
        return NextResponse.json(
          { error: 'La source n\'est pas un fichier' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'La source n\'existe pas' },
        { status: 404 }
      );
    }
    
    // Vérifier que la source et la destination ne sont pas identiques
    if (source === destination) {
      return NextResponse.json(
        { error: 'La source et la destination ne peuvent pas être identiques' },
        { status: 400 }
      );
    }
    
    // Vérifier qu'on ne déplace pas un dossier dans lui-même ou un de ses sous-dossiers
    if (type === 'folder' && isSubPath(source, destination)) {
      return NextResponse.json(
        { error: 'Impossible de déplacer un dossier dans lui-même ou un de ses sous-dossiers' },
        { status: 400 }
      );
    }
    
    // Créer le dossier parent de destination s'il n'existe pas
    const destParent = path.dirname(destPath);
    try {
      await fs.access(destParent);
    } catch {
      await fs.mkdir(destParent, { recursive: true });
      await createHtaccess(destParent);
    }
    
    if (type === 'folder') {
      // Vérifier si la destination existe déjà
      try {
        const destStats = await fs.stat(destPath);
        if (destStats.isDirectory()) {
          // Si c'est un dossier, on peut fusionner le contenu
          // Copier le contenu du dossier source dans le dossier destination
          await copyFolderRecursive(sourcePath, destPath);
          // Supprimer le dossier source
          await removeFolderRecursive(sourcePath);
          
          return NextResponse.json({
            success: true,
            message: `Contenu du dossier "${source}" fusionné dans "${destination}"`,
            source: source,
            destination: destination
          });
        } else {
          return NextResponse.json(
            { error: 'La destination existe déjà et n\'est pas un dossier' },
            { status: 409 }
          );
        }
      } catch {
        // La destination n'existe pas, on peut déplacer normalement
        await copyFolderRecursive(sourcePath, destPath);
        await removeFolderRecursive(sourcePath);
        
        return NextResponse.json({
          success: true,
          message: `Dossier "${source}" déplacé vers "${destination}"`,
          source: source,
          destination: destination
        });
      }
      
    } else if (type === 'file') {
      // Vérifier si le fichier de destination existe déjà
      try {
        await fs.access(destPath);
        return NextResponse.json(
          { error: 'Le fichier de destination existe déjà' },
          { status: 409 }
        );
      } catch {
        // Le fichier de destination n'existe pas, on peut déplacer
        await fs.copyFile(sourcePath, destPath);
        await fs.unlink(sourcePath);
        
        return NextResponse.json({
          success: true,
          message: `Fichier "${source}" déplacé vers "${destination}"`,
          source: source,
          destination: destination
        });
      }
    }
    
    return NextResponse.json(
      { error: 'Type invalide (folder ou file)' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Erreur lors du déplacement:', error);
    return NextResponse.json(
      { error: 'Erreur lors du déplacement' },
      { status: 500 }
    );
  }
}

// GET - Lister les dossiers disponibles pour le déplacement
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    
    // Vérifier l'authentification
    if (!username || !password || !checkAuth(username, password)) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    try {
      const items = await fs.readdir(uploadsDir, { withFileTypes: true });
      const folders = items
        .filter(item => item.isDirectory())
        .map(item => item.name)
        .sort();
      
      return NextResponse.json({
        success: true,
        folders: folders,
        totalFolders: folders.length
      });
      
    } catch (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la lecture des dossiers' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Erreur lors de la lecture des dossiers:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la lecture des dossiers' },
      { status: 500 }
    );
  }
} 