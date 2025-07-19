import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Next.js Upload</h1>
          <p className="text-gray-600 mb-6">
            Interface moderne pour l'upload d'images avec authentification
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/upload"
            className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Accéder à l'upload
          </Link>
          
          <div className="text-sm text-gray-500">
            <p>Identifiants par défaut :</p>
            <p>Utilisateur: <code className="bg-gray-100 px-1 rounded">admin</code></p>
            <p>Mot de passe: <code className="bg-gray-100 px-1 rounded">password123</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
