import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import type { Profile } from '@/types/domain'

const PROFILE_QUERY = '*, department:departments(*)'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_QUERY)
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Auth] Failed to fetch profile:', error.message)
      return null
    }
    return data as Profile
  } catch (err) {
    console.error('[Auth] Unexpected error fetching profile:', err)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    // Check inicial direto — não depende do evento INITIAL_SESSION
    // que pode travar com o lock interno do Supabase no StrictMode
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return
      setSession(session)
      if (session?.user?.id) {
        fetchProfile(session.user.id).then(profile => {
          if (isMounted) setProfile(profile)
        })
      }
      setIsLoading(false)
    })

    // Listener para mudanças subsequentes (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return
        console.log('[Auth] Event:', event)

        if (event === 'INITIAL_SESSION') return

        if (event === 'TOKEN_REFRESHED') {
          if (newSession) setSession(newSession)
          return
        }

        if (event === 'SIGNED_OUT') {
          setSession(null)
          setProfile(null)
          setIsLoading(false)
          queryClient.clear()
          return
        }

        setSession(newSession)

        if (newSession?.user?.id && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
          fetchProfile(newSession.user.id).then(profile => {
            if (isMounted) setProfile(profile)
          })
        }
      }
    )

    // Timeout de segurança — garante que o app nunca fica preso em loading
    const timeout = setTimeout(() => {
      if (isMounted) setIsLoading(false)
    }, 5000)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    setSession(null)
    setProfile(null)
    queryClient.clear()
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    isLoading,
    isAuthenticated: !!session,
    signIn,
    signOut,
  }), [session, profile, isLoading, signIn, signOut])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
