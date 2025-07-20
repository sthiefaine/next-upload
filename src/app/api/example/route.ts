import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

// Exemple de route API avec authentification automatique
export const GET = withAuth(async (request: NextRequest) => {
  // Cette fonction ne sera exécutée que si l'authentification réussit
  return NextResponse.json({
    success: true,
    message: 'Route protégée accessible',
    timestamp: new Date().toISOString()
  });
});

export const POST = withAuth(async (request: NextRequest) => {
  const body = await request.json();
  
  return NextResponse.json({
    success: true,
    message: 'Données reçues avec succès',
    data: body
  });
}); 