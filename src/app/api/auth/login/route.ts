import { NextRequest, NextResponse } from 'next/server'

// Récupération des comptes depuis les variables d'environnement
const getUsersFromEnv = () => {
  const users = []
  
  // Format attendu: USER_1_EMAIL=test@example.com,USER_1_PASSWORD=password123,USER_1_NAME=Utilisateur Test
  let i = 1
  while (process.env[`USER_${i}_EMAIL`]) {
    users.push({
      id: i.toString(),
      email: process.env[`USER_${i}_EMAIL`]!,
      password: process.env[`USER_${i}_PASSWORD`]!,
      name: process.env[`USER_${i}_NAME`] || `Utilisateur ${i}`
    })
    i++
  }
  
  // Compte par défaut si aucune variable d'environnement n'est définie
  if (users.length === 0) {
    users.push({
      id: '1',
      email: 'admin@example.com',
      password: 'admin123',
      name: 'Administrateur'
    })
  }
  
  return users
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validation des données
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    // Récupération des utilisateurs depuis les variables d'environnement
    const users = getUsersFromEnv()

    // Recherche de l'utilisateur
    const user = users.find(u => u.email === email && u.password === password)

    if (!user) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Génération d'un token simple (en production, utilisez JWT)
    const token = `token_${user.id}_${Date.now()}`

    // Retour des données utilisateur (sans le mot de passe)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name
    }

    return NextResponse.json({
      user: userData,
      token,
      message: 'Connexion réussie'
    })

  } catch (error) {
    console.error('Erreur lors de la connexion:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 