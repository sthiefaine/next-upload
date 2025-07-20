// Fonction centralisée pour vérifier l'authentification via token
export function checkAuthFromToken(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.substring(7);

  // Vérifier le token d'écriture
  const writeToken = process.env.UPLOADFILES_WRITE_TOKEN;
  if (writeToken && token === writeToken) {
    return true;
  }

  return false;
}

// Fonction pour extraire le token depuis le header Authorization
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.substring(7);
}

// Fonction pour valider le format du token
export function isValidTokenFormat(token: string): boolean {
  const tokenParts = token.split("_");
  return tokenParts.length >= 3 && tokenParts[0] === "token";
}
