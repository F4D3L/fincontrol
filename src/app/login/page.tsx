'use client'
import { createClient } from '@/lib/supabase/client'
import { Wallet } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-600/30">
            <Wallet size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">FinControl</h1>
          <p className="text-gray-400 mt-2">Sua gestão financeira inteligente</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-2">Bem-vindo de volta</h2>
          <p className="text-gray-400 text-sm mb-6">Faça login para acessar seu painel financeiro</p>

          <Button
            onClick={handleGoogleLogin}
            loading={loading}
            className="w-full justify-center gap-3 py-3 bg-white hover:bg-gray-100 text-gray-900 border-transparent"
            size="lg"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Entrar com Google
          </Button>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-center text-gray-500">
              Seus dados são privados e protegidos com<br />
              autenticação segura via Supabase
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Dashboard', desc: 'Visão completa' },
            { label: 'Seguro', desc: 'Dados na nuvem' },
            { label: 'Gratuito', desc: 'Para uso pessoal' },
          ].map(item => (
            <div key={item.label} className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-3">
              <p className="text-white text-sm font-medium">{item.label}</p>
              <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
