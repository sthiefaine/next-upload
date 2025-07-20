# API Simple avec Tokens Séparés

API simple avec deux tokens d'authentification distincts : un token SIMPLE pour la lecture et un token WRITE pour l'upload/suppression.

## Configuration

### Variables d'environnement

Ajoutez ces variables à votre fichier `.env.local` :

```env
# Token SIMPLE (lecture seule)
UPLOADFILES_SIMPLE_TOKEN=your_simple_token_here

# Token WRITE (upload et suppression)
UPLOADFILES_WRITE_TOKEN=your_write_token_here
```

## Tokens et Permissions

### 🔍 Token SIMPLE (Lecture)
- **Permission** : Lecture seule
- **Actions autorisées** :
  - ✅ Lister tous les fichiers
  - ✅ Lister les fichiers d'un dossier spécifique
  - ✅ Voir les statistiques (taille, nombre de fichiers)

### ✏️ Token WRITE (Écriture)
- **Permission** : Lecture + Écriture
- **Actions autorisées** :
  - ✅ Toutes les actions du token SIMPLE
  - ✅ Upload de fichiers
  - ✅ Suppression de fichiers
  - ✅ Création automatique de dossiers

## Endpoints

### Base URL
```
http://localhost:3000/api/files-simple
```

### GET - Lister les fichiers

**URL :** `GET /api/files-simple?token=YOUR_TOKEN&folder=OPTIONAL_FOLDER`

**Tokens acceptés :** SIMPLE ou WRITE

**Paramètres :**
- `token` (requis) : Votre token SIMPLE ou WRITE
- `folder` (optionnel) : Nom du dossier spécifique

**Exemples :**

```bash
# Avec token SIMPLE
curl "http://localhost:3000/api/files-simple?token=your_simple_token_here"

# Avec token WRITE
curl "http://localhost:3000/api/files-simple?token=your_write_token_here"

# Lister les fichiers d'un dossier spécifique
curl "http://localhost:3000/api/files-simple?token=your_simple_token_here&folder=films"
```

**Réponse :**
```json
{
  "success": true,
  "files": [
    {
      "name": "image_1234567890_abc123.jpg",
      "url": "/uploads/films/image_1234567890_abc123.jpg",
      "folder": "films",
      "size": 1024000,
      "sizeFormatted": "1 MB",
      "type": ".jpg",
      "uploadedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "totalFiles": 1,
  "totalSize": 1024000,
  "totalSizeFormatted": "1 MB"
}
```

### POST - Upload de fichiers

**URL :** `POST /api/files-simple`

**Token requis :** WRITE uniquement

**Paramètres FormData :**
- `token` (requis) : Votre token WRITE
- `folder` (requis) : Nom du dossier de destination
- `files` (requis) : Fichiers à uploader (multiple)

**Exemple avec curl :**
```bash
curl -X POST http://localhost:3000/api/files-simple \
  -F "token=your_write_token_here" \
  -F "folder=films" \
  -F "files=@image1.jpg" \
  -F "files=@image2.png"
```

**Exemple avec JavaScript :**
```javascript
const formData = new FormData();
formData.append('token', 'your_write_token_here');
formData.append('folder', 'films');
formData.append('files', file1);
formData.append('files', file2);

const response = await fetch('/api/files-simple', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);
```

**Réponse :**
```json
{
  "success": true,
  "message": "2 fichier(s) uploadé(s) avec succès dans le dossier \"films\"",
  "files": [
    {
      "name": "image1_1234567890_abc123.jpg",
      "url": "/uploads/films/image1_1234567890_abc123.jpg",
      "size": 512000,
      "sizeFormatted": "512 KB"
    },
    {
      "name": "image2_1234567890_def456.png",
      "url": "/uploads/films/image2_1234567890_def456.png",
      "size": 1024000,
      "sizeFormatted": "1 MB"
    }
  ]
}
```

### DELETE - Supprimer un fichier

**URL :** `DELETE /api/files-simple?token=YOUR_TOKEN&file=FILE_URL`

**Token requis :** WRITE uniquement

**Paramètres :**
- `token` (requis) : Votre token WRITE
- `file` (requis) : URL du fichier à supprimer

**Exemple :**
```bash
curl -X DELETE "http://localhost:3000/api/files-simple?token=your_write_token_here&file=/uploads/films/image1_1234567890_abc123.jpg"
```

**Réponse :**
```json
{
  "success": true,
  "message": "Fichier supprimé avec succès"
}
```

## Cas d'usage

### 🔍 Token SIMPLE - Applications publiques
```javascript
// Affichage d'une galerie d'images
const response = await fetch('/api/files-simple?token=your_simple_token_here');
const data = await response.json();

// Afficher les images
data.files.forEach(file => {
  console.log(`<img src="${file.url}" alt="${file.name}" />`);
});
```

### ✏️ Token WRITE - Applications d'administration
```javascript
// Upload d'images depuis un formulaire
const formData = new FormData();
formData.append('token', 'your_write_token_here');
formData.append('folder', 'films');
formData.append('files', selectedFile);

const response = await fetch('/api/files-simple', {
  method: 'POST',
  body: formData
});
```

## Gestion des erreurs

### Token SIMPLE utilisé pour l'upload
```json
{
  "error": "Token WRITE invalide"
}
```

### Token WRITE utilisé pour la lecture
```json
{
  "success": true,
  "files": [...]
}
```

### Token invalide
```json
{
  "error": "Token invalide"
}
```

## Sécurité

- **Token SIMPLE** : Lecture seule, sécurisé pour les applications publiques
- **Token WRITE** : Accès complet, à utiliser uniquement dans les applications d'administration
- **Validation stricte** des types MIME et tailles de fichiers
- **Protection** contre l'exécution de scripts (.htaccess)
- **Noms de fichiers sécurisés** générés automatiquement
- **Impossible de supprimer** les fichiers .htaccess via l'API

## Recommandations

1. **Token SIMPLE** : Utilisez pour les sites web publics, galeries d'images, etc.
2. **Token WRITE** : Utilisez uniquement dans les interfaces d'administration sécurisées
3. **Génération de tokens** : Utilisez des tokens longs et aléatoires
4. **Rotation des tokens** : Changez régulièrement vos tokens WRITE
5. **Logs** : Surveillez l'utilisation de vos tokens WRITE 