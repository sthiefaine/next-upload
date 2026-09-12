# Next.js Upload Interface

Une interface moderne pour l'upload d'images avec authentification et gestion complète des dossiers et fichiers, construite avec Next.js 15, TypeScript et Tailwind CSS.

## 🚀 Fonctionnalités

- ✅ Upload multiple d'images
- ✅ Authentification sécurisée
- ✅ Gestion de dossiers (création, suppression, renommage)
- ✅ Gestion de fichiers (suppression, renommage)
- ✅ Validation des types MIME (JPEG, PNG, GIF, WebP, SVG)
- ✅ Limite de taille (10MB par fichier)
- ✅ Interface moderne et responsive
- ✅ Affichage des images uploadées
- ✅ Sécurisation du dossier uploads
- ✅ Génération de noms de fichiers uniques
- ✅ Organisation par dossiers (films, series, photos, etc.)
- ✅ Modales de confirmation pour les actions destructives
- ✅ Feedback visuel en temps réel

## 📦 Installation

1. **Cloner le projet**
   ```bash
   git clone <votre-repo>
   cd next-upload
   ```

2. **Installer les dépendances**
   ```bash
   pnpm install
   ```

3. **Configurer les variables d'environnement**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Puis éditer `.env.local` avec vos identifiants :
   ```env
   USER=votre_utilisateur
   PASSWORD=votre_mot_de_passe
   ```

4. **Lancer le serveur de développement**
   ```bash
   pnpm dev
   ```

5. **Ouvrir dans le navigateur**
   ```
   http://localhost:3000
   ```

## 🔐 Authentification

Configurez vos identifiants dans le fichier `.env.local` :
- **USER** : votre nom d'utilisateur
- **PASSWORD** : votre mot de passe

## 📁 Structure du projet

```
next-upload/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── upload/
│   │   │   │   └── route.ts          # API route pour l'upload
│   │   │   ├── folders/
│   │   │   │   └── route.ts          # API route pour les dossiers
│   │   │   ├── files/
│   │   │   │   └── route.ts          # API route pour lister les fichiers
│   │   │   ├── delete/
│   │   │   │   └── route.ts          # API route pour supprimer
│   │   │   └── rename/
│   │   │       └── route.ts          # API route pour renommer
│   │   ├── upload/
│   │   │   └── page.tsx              # Page d'upload
│   │   ├── page.tsx                  # Page d'accueil
│   │   ├── layout.tsx                # Layout principal
│   │   └── globals.css               # Styles globaux
│   └── ...
├── public/
│   └── uploads/                      # Dossier des images uploadées
│       ├── films/                    # Dossier pour les films
│       ├── series/                   # Dossier pour les séries
│       ├── photos/                   # Dossier pour les photos
│       └── .htaccess                 # Sécurisation du dossier
├── .env.local                        # Variables d'environnement
└── next.config.ts                    # Configuration Next.js
```

## 🛡️ Sécurité

### Validation des fichiers
- Types MIME autorisés : `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`
- Taille maximale : 10MB par fichier
- Noms de fichiers uniques générés automatiquement

### Validation des dossiers
- Noms de dossiers autorisés : lettres, chiffres, tirets et underscores
- Longueur maximale : 50 caractères
- Vérification de l'existence avant upload

### Protection du dossier uploads
- Fichier `.htaccess` pour empêcher l'exécution de scripts
- Seules les images sont autorisées
- Accès aux fichiers cachés bloqué
- Protection appliquée à tous les sous-dossiers

### Authentification
- Vérification des identifiants côté serveur
- Variables d'environnement pour les credentials
- Protection de toutes les API routes

## 🎨 Interface utilisateur

- Design moderne avec Tailwind CSS
- Interface responsive en deux colonnes
- Animations et transitions fluides
- Feedback visuel pour toutes les opérations
- Modales de confirmation pour les actions destructives
- Gestion d'état en temps réel
- Validation des formulaires

## 🔧 Scripts disponibles

```bash
# Développement
pnpm dev

# Build de production
pnpm build

# Lancer en production
pnpm start

# Linting
pnpm lint
```

## 📝 Utilisation

1. **Accéder à l'interface**
   - Ouvrir `http://localhost:3000`
   - Cliquer sur "Accéder à l'upload"

2. **Se connecter**
   - Saisir vos identifiants
   - Cliquer sur "Se connecter"

3. **Créer des dossiers**
   - Saisir le nom du dossier (ex: films, series, photos)
   - Cliquer sur "Créer le dossier"
   - Le dossier apparaît dans la liste

4. **Uploader des images**
   - Sélectionner un dossier de destination
   - Sélectionner une ou plusieurs images
   - Cliquer sur "Uploader les images"
   - Voir le résultat et les images uploadées

5. **Gérer les dossiers**
   - Voir la liste des dossiers dans la colonne droite
   - Cliquer sur "Renommer" pour changer le nom
   - Cliquer sur "Supprimer" pour supprimer le dossier et son contenu

6. **Gérer les fichiers**
   - Voir la liste des fichiers uploadés
   - Cliquer sur "Renommer" pour changer le nom du fichier
   - Cliquer sur "Supprimer" pour supprimer le fichier

## 📂 Gestion des dossiers

### Création de dossiers
- Interface dédiée pour créer de nouveaux dossiers
- Validation des noms de dossiers
- Protection contre les doublons
- Sécurisation automatique avec `.htaccess`

### Suppression de dossiers
- Suppression récursive (dossier + contenu)
- Confirmation obligatoire via modale
- Mise à jour automatique de l'interface

### Renommage de dossiers
- Interface modale pour le renommage
- Validation des nouveaux noms
- Protection contre les conflits

## 📄 Gestion des fichiers

### Liste des fichiers
- Affichage de tous les fichiers uploadés
- Informations : nom, dossier, type
- Interface scrollable pour de nombreux fichiers

### Suppression de fichiers
- Suppression individuelle des fichiers
- Confirmation obligatoire
- Validation du type de fichier

### Renommage de fichiers
- Conservation de l'extension
- Validation des nouveaux noms
- Protection contre les conflits

## 🔌 API Routes

### `/api/folders`
- **GET** : Liste tous les dossiers
- **POST** : Crée un nouveau dossier

### `/api/files`
- **GET** : Liste tous les fichiers (optionnel : par dossier)

### `/api/upload`
- **POST** : Upload d'images dans un dossier spécifique

### `/api/delete`
- **DELETE** : Supprime un dossier ou un fichier

### `/api/rename`
- **POST** : Renomme un dossier ou un fichier

## 🚨 Dépannage

### Erreur d'authentification
- Vérifier que les variables d'environnement sont correctement définies
- Redémarrer le serveur après modification de `.env.local`

### Erreur d'upload
- Vérifier que le dossier `public/uploads` existe
- Vérifier que le dossier de destination existe
- Vérifier les permissions des dossiers
- Vérifier que le fichier est bien une image valide

### Erreur de création de dossier
- Vérifier que le nom du dossier respecte les règles (lettres, chiffres, tirets, underscores)
- Vérifier que le dossier n'existe pas déjà

### Erreur de suppression/renommage
- Vérifier les permissions des fichiers/dossiers
- Vérifier que l'élément existe
- Vérifier qu'il n'y a pas de conflit de noms

### Images qui ne s'affichent pas
- Vérifier la configuration dans `next.config.ts`
- Vérifier que les images sont bien dans le bon dossier

## 📄 Licence

MIT License - voir le fichier LICENSE pour plus de détails.


### Sources GLB Atlas

Le dépôt privé `/api/atlas-assets/{id}/sources` utilise automatiquement `public/uploads/atlas/sources`, sur le même volume que les podcasts. Les dossiers sont créés au premier dépôt. Aucun nouveau volume ni variable n’est nécessaire. `ATLAS_SOURCES_DIR` reste une surcharge optionnelle (chemin absolu) pour les installations déjà configurées. Les accès directs `/uploads/atlas/sources` et `/api/display/atlas/sources` sont bloqués ; lecture et écriture passent par l’API avec le jeton d’écriture existant. Les podcasts conservent leurs chemins et leur accès public.
