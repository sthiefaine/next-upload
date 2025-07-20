import { NextRequest, NextResponse } from 'next/server';
import { checkAuthFromToken } from './auth';

// Middleware pour vérifier l'authentification
export function withAuth(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authHeader = request.headers.get('authorization');
    
    if (!checkAuthFromToken(authHeader)) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }
    
    return handler(request);
  };
}

// Middleware pour vérifier l'authentification avec gestion d'erreur personnalisée
export function withAuthCustom(
  handler: (request: NextRequest) => Promise<NextResponse>,
  errorMessage: string = 'Authentification échouée'
) {
  return async (request: NextRequest) => {
    const authHeader = request.headers.get('authorization');
    
    if (!checkAuthFromToken(authHeader)) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      );
    }
    
    return handler(request);
  };
} 