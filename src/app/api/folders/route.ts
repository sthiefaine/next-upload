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
  // Autoriser les lettres, chiffres, tirets et underscores
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(folderName) && folderName.length > 0 && folderName.length <= 50;
}

export async function GET(request: NextRequest) {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    // S'assurer que le dossier uploads existe
    await fs.mkdir(uploadsDir, { recursive: true });
    
    // Lire tous les dossiers dans uploads
    const items = await fs.readdir(uploadsDir, { withFileTypes: true });
    const folders = items
      .filter(item => item.isDirectory())
      .map(item => item.name)
      .sort();
    
    return NextResponse.json({
      success: true,
      folders: folders
    });
    
  } catch (error) {
    console.error('Erreur lors de la lecture des dossiers:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la lecture des dossiers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Récupérer les données d'authentification
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const folderName = formData.get('folderName') as string;
    
    // Vérifier l'authentification
    if (!username || !password || !checkAuth(username, password)) {
      return NextResponse.json(
        { error: 'Authentification échouée' },
        { status: 401 }
      );
    }
    
    // Vérifier le nom du dossier
    if (!folderName || !isValidFolderName(folderName)) {
      return NextResponse.json(
        { error: 'Nom de dossier invalide. Utilisez seulement des lettres, chiffres, tirets et underscores.' },
        { status: 400 }
      );
    }
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const newFolderPath = path.join(uploadsDir, folderName);
    
    // S'assurer que le dossier uploads existe
    await fs.mkdir(uploadsDir, { recursive: true });
    
    // Vérifier si le dossier existe déjà
    try {
      const stats = await fs.stat(newFolderPath);
      if (stats.isDirectory()) {
        return NextResponse.json(
          { error: 'Le dossier existe déjà' },
          { status: 400 }
        );
      }
    } catch (error) {
      // Le dossier n'existe pas, on peut le créer
    }
    
    // Créer le nouveau dossier
    await fs.mkdir(newFolderPath, { recursive: true });
    
    // Créer un fichier .htaccess dans le nouveau dossier
    const htaccessContent = `# Empêcher l'exécution de scripts
<FilesMatch "\\.(php|js|py|pl|sh|cgi)$">
    Order Deny,Allow
    Deny from all
</FilesMatch>

# Autoriser seulement les images
<FilesMatch "\\.(jpg|jpeg|png|gif|webp|svg)$">
    Order Allow,Deny
    Allow from all
</FilesMatch>

# Empêcher l'accès aux fichiers cachés
<FilesMatch "^\\.">
    Order Deny,Allow
    Deny from all
</FilesMatch>

# Désactiver l'exécution de scripts
Options -ExecCGI`;
    
    await fs.writeFile(path.join(newFolderPath, '.htaccess'), htaccessContent);
    
    return NextResponse.json({
      success: true,
      message: `Dossier "${folderName}" créé avec succès`
    });
    
  } catch (error) {
    console.error('Erreur lors de la création du dossier:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du dossier' },
      { status: 500 }
    );
  }
} 