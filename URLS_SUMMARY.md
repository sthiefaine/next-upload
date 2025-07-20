# 📋 Résumé des URLs - Next.js Upload Interface

## 🌐 URLs d'affichage des images

### **Images uploadées localement :**
```
http://localhost:3000/uploads/[dossier]/[nom-fichier]
```

**Exemples :**
- `http://localhost:3000/uploads/films/image1.jpg`
- `http://localhost:3000/uploads/series/poster.png`
- `http://localhost:3000/uploads/photos/photo1.webp`

### **Images importées depuis Vercel Blob :**
```
http://localhost:3000/uploads/[dossier-destination]/[nom-fichier]
```

## 📤 URLs pour ajouter des images

### **1. Interface web (recommandé) :**
```
http://localhost:3000/upload
```
- Interface complète avec authentification
- Upload multiple d'images
- Gestion des dossiers
- Import depuis Vercel Blob
- Batch import

### **2. API Simple (avec tokens séparés) :**
```
http://localhost:3000/api/files-simple
```

**Configuration :**
```env
# Token SIMPLE (lecture seule)
UPLOADFILES_SIMPLE_TOKEN=your_simple_token_here

# Token WRITE (upload et suppression)
UPLOADFILES_WRITE_TOKEN=your_write_token_here
```

**Exemples d'utilisation :**

#### **Lister tous les fichiers (SIMPLE ou WRITE) :**
```bash
# Avec token SIMPLE
curl "http://localhost:3000/api/files-simple?token=your_simple_token_here"

# Avec token WRITE
curl "http://localhost:3000/api/files-simple?token=your_write_token_here"
```

#### **Lister les fichiers d'un dossier (SIMPLE ou WRITE) :**
```bash
curl "http://localhost:3000/api/files-simple?token=your_simple_token_here&folder=films"
```

#### **Upload de fichiers (WRITE uniquement) :**
```bash
curl -X POST http://localhost:3000/api/files-simple \
  -F "token=your_write_token_here" \
  -F "folder=films" \
  -F "files=@image1.jpg" \
  -F "files=@image2.png"
```

#### **Supprimer un fichier (WRITE uniquement) :**
```bash
curl -X DELETE "http://localhost:3000/api/files-simple?token=your_write_token_here&file=/uploads/films/image1.jpg"
```

### **3. API Avancée (avec username/password) :**

#### **Upload d'images :**
```bash
POST http://localhost:3000/api/upload
```

#### **Créer un dossier :**
```bash
POST http://localhost:3000/api/folders
```

#### **Lister les dossiers :**
```bash
GET http://localhost:3000/api/folders
```

#### **Lister les fichiers :**
```bash
GET http://localhost:3000/api/files?username=admin&password=password123
```

#### **Supprimer (fichier/dossier) :**
```bash
DELETE http://localhost:3000/api/delete?username=admin&password=password123&type=file&target=/uploads/films/image1.jpg
```

#### **Renommer (fichier/dossier) :**
```bash
POST http://localhost:3000/api/rename
```

### **4. API Vercel Blob (avec token) :**

#### **Lister les blobs :**
```bash
GET http://localhost:3000/api/import-blob?username=admin&password=password123&token=YOUR_BLOB_TOKEN
```

#### **Importer un blob :**
```bash
POST http://localhost:3000/api/import-blob?username=admin&password=password123&token=YOUR_BLOB_TOKEN
```

#### **Batch import :**
```json
{
  "folderName": "films",
  "targetFolder": "films",
  "deleteAfterImport": false,
  "batchImport": true
}
```

#### **Supprimer un blob :**
```bash
DELETE http://localhost:3000/api/import-blob?username=admin&password=password123&token=YOUR_BLOB_TOKEN&blobUrl=URL_DU_BLOB
```

## 🔧 Scripts de test

### **Test API Simple :**
```bash
pnpm test:simple
```

### **Test API Vercel Blob :**
```bash
pnpm test:blob
```

## 📁 Structure des dossiers

Après utilisation, votre structure sera :
```
public/uploads/
├── films/
│   ├── .htaccess (masqué dans l'interface)
│   ├── image1_1234567890_abc123.jpg
│   ├── image2_1234567890_def456.png
│   └── poster_1234567890_ghi789.webp
├── series/
│   ├── .htaccess (masqué dans l'interface)
│   ├── episode1_1234567890_jkl012.jpg
│   └── episode2_1234567890_mno345.png
└── photos/
    ├── .htaccess (masqué dans l'interface)
    ├── photo1_1234567890_pqr678.jpg
    └── photo2_1234567890_stu901.png
```

## 🔒 Sécurité

- **Token SIMPLE** : Lecture seule, sécurisé pour les applications publiques
- **Token WRITE** : Accès complet, à utiliser uniquement dans les applications d'administration
- **API Avancée** : Authentification par username/password (`USER`/`PASSWORD`)
- **Vercel Blob** : Token Vercel Blob (`BLOB_READ_WRITE_TOKEN`)
- **Protection** : Fichiers `.htaccess` pour empêcher l'exécution de scripts
- **Validation** : Types MIME et tailles de fichiers
- **Noms uniques** : Génération automatique pour éviter les conflits

## 💡 Recommandations d'utilisation

1. **Pour l'affichage** : Utilisez directement les URLs `/uploads/[dossier]/[fichier]`
2. **Pour l'upload simple** : Utilisez l'API Simple avec token WRITE
3. **Pour la lecture publique** : Utilisez l'API Simple avec token SIMPLE
4. **Pour l'interface complète** : Utilisez `/upload` avec username/password
5. **Pour l'automatisation** : Utilisez les APIs avec vos identifiants
6. **Pour l'import Vercel Blob** : Utilisez l'interface ou l'API batch

## 🚀 Démarrage rapide

1. **Configurer les variables d'environnement :**
```env
USER=admin
PASSWORD=password123
UPLOADFILES_SIMPLE_TOKEN=your_simple_token_here
UPLOADFILES_WRITE_TOKEN=your_write_token_here
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
```

2. **Démarrer le serveur :**
```bash
pnpm dev
```

3. **Accéder à l'interface :**
```
http://localhost:3000/upload
```

4. **Tester l'API Simple :**
```bash
pnpm test:simple
```

## 🔑 Gestion des Tokens

### **Token SIMPLE (Lecture)**
- Utilisez pour les sites web publics
- Sécurisé pour les galeries d'images
- Permet seulement la lecture des fichiers

### **Token WRITE (Écriture)**
- Utilisez uniquement dans les interfaces d'administration
- Permet l'upload et la suppression
- Inclut toutes les permissions du token SIMPLE 