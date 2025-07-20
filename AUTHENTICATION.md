# Système d'Authentification

## Configuration

Le système d'authentification utilise des variables d'environnement pour définir les comptes utilisateurs.

### 1. Créer le fichier `.env.local`

Copiez le fichier `env.example` vers `.env.local` :

```bash
cp env.example .env.local
```

### 2. Configurer les comptes

Dans le fichier `.env.local`, configurez vos comptes utilisateurs :

```env
# Compte administrateur
USER_1_EMAIL=admin@example.com
USER_1_PASSWORD=admin123
USER_1_NAME=Administrateur

# Compte utilisateur 1
USER_2_EMAIL=user1@example.com
USER_2_PASSWORD=user123
USER_2_NAME=Utilisateur 1

# Compte utilisateur 2
USER_3_EMAIL=user2@example.com
USER_3_PASSWORD=user456
USER_3_NAME=Utilisateur 2
```

### 3. Format des variables

- `USER_X_EMAIL` : Email de l'utilisateur
- `USER_X_PASSWORD` : Mot de passe de l'utilisateur
- `USER_X_NAME` : Nom d'affichage de l'utilisateur

Où `X` est un numéro séquentiel (1, 2, 3, etc.)

### 4. Compte par défaut

Si aucune variable d'environnement n'est définie, un compte par défaut sera créé :
- Email : `admin@example.com`
- Mot de passe : `admin123`
- Nom : `Administrateur`

## Utilisation

1. **Connexion** : Allez sur `/login`
2. **Utilisez les identifiants** définis dans votre fichier `.env.local`
3. **Session persistante** : Une fois connecté, vous restez connecté entre les pages
4. **Déconnexion** : Cliquez sur "Déconnexion" dans la navigation

## Sécurité

- Les mots de passe sont stockés en clair dans les variables d'environnement
- En production, utilisez des mots de passe forts et un système de hachage
- Le fichier `.env.local` ne doit jamais être commité dans le repository 