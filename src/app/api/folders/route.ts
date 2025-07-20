import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Fonction pour vérifier l'authentification
function checkAuth(username: string, password: string): boolean {
  const expectedUser = process.env.USER;
  const expectedPassword = process.env.PASSWORD;
  return username === expectedUser && password === expectedPassword;
}

// Fonction pour scanner récursivement les dossiers
async function scanFoldersRecursive(dirPath: string, basePath: string = ''): Promise<string[]> {
  const folders: string[] = [];
  
  try {
    console.log(`🔍 Scanning directory: ${dirPath} (base: ${basePath})`);
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    console.log(`📁 Found ${items.length} items in ${dirPath}:`, items.map(item => `${item.name} (${item.isDirectory() ? 'dir' : 'file'})`));
    
    for (const item of items) {
      if (item.isDirectory()) {
        // Utiliser des forward slashes pour la cohérence
        const folderPath = basePath ? `${basePath}/${item.name}` : item.name;
        console.log(`📂 Adding folder: ${folderPath}`);
        folders.push(folderPath);
        
        // Scanner récursivement les sous-dossiers
        const subDirPath = path.join(dirPath, item.name);
        console.log(`🔍 Recursively scanning: ${subDirPath}`);
        const subFolders = await scanFoldersRecursive(subDirPath, folderPath);
        console.log(`📂 Found ${subFolders.length} subfolders in ${item.name}:`, subFolders);
        folders.push(...subFolders);
      }
    }
  } catch (error) {
    console.error(`❌ Error scanning directory ${dirPath}:`, error);
  }
  
  console.log(`✅ Total folders found in ${dirPath}: ${folders.length}`, folders);
  return folders;
}

// GET - Lire tous les dossiers dans uploads
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
      // S'assurer que le dossier uploads existe
      await fs.mkdir(uploadsDir, { recursive: true });
      console.log(`📁 Uploads directory ensured: ${uploadsDir}`);
      
      console.log(`🚀 Starting recursive scan of: ${uploadsDir}`);
      
      // Scanner récursivement tous les dossiers
      const allFolders = await scanFoldersRecursive(uploadsDir);
      console.log(`📊 Raw folders found:`, allFolders);
      
      // Trier les dossiers (d'abord les dossiers parents, puis les enfants)
      allFolders.sort((a, b) => {
        const aDepth = a.split('/').length;
        const bDepth = b.split('/').length;
        
        if (aDepth !== bDepth) {
          return aDepth - bDepth;
        }
        
        return a.localeCompare(b);
      });
      
      console.log(`📊 Sorted folders:`, allFolders);
      console.log(`📊 Total folders: ${allFolders.length}`);
      
      return NextResponse.json({
        success: true,
        folders: allFolders,
        totalFolders: allFolders.length
      });
      
    } catch (error) {
      console.error('Erreur lors de la lecture des dossiers:', error);
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

// POST - Créer un nouveau dossier
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
    const { folderName } = body;
    
    if (!folderName || typeof folderName !== 'string') {
      return NextResponse.json(
        { error: 'Nom de dossier requis' },
        { status: 400 }
      );
    }
    
    // Valider le nom du dossier
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(folderName)) {
      return NextResponse.json(
        { error: 'Nom de dossier invalide. Utilisez seulement des lettres, chiffres, tirets et underscores.' },
        { status: 400 }
      );
    }
    
    if (folderName.length > 50) {
      return NextResponse.json(
        { error: 'Nom de dossier trop long (max 50 caractères)' },
        { status: 400 }
      );
    }
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const newFolderPath = path.join(uploadsDir, folderName);
    
    try {
      // Vérifier si le dossier existe déjà
      await fs.access(newFolderPath);
      return NextResponse.json(
        { error: 'Le dossier existe déjà' },
        { status: 409 }
      );
    } catch {
      // Le dossier n'existe pas, on peut le créer
    }
    
    // Créer le dossier
    await fs.mkdir(newFolderPath, { recursive: true });
    
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
    
    await fs.writeFile(path.join(newFolderPath, '.htaccess'), htaccessContent);
    
    return NextResponse.json({
      success: true,
      message: `Dossier "${folderName}" créé avec succès`,
      folderName: folderName
    });
    
  } catch (error) {
    console.error('Erreur lors de la création du dossier:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du dossier' },
      { status: 500 }
    );
  }
} 