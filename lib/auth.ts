export interface User {
  email: string
  name: string
  password: string
  role: 'admin' | 'user'
}
 

const AUTH_STORAGE_KEY = 'qa_system_auth_session'

export interface AuthSession {
  email: string
  name: string
  role: 'admin' | 'user'
  loginTime: number
  token?: string // Optional JWT token for backend integration
}

 

export function saveAuthSession(session: AuthSession): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  } catch (error) {
    console.error('[v0] Failed to save auth session:', error)
  }
}

export function loadAuthSession(): AuthSession | null {
  try {
    const data = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!data) return null
    return JSON.parse(data) as AuthSession
  } catch (error) {
    console.error('[v0] Failed to load auth session:', error)
    return null
  }
}

export function getTokenFromSession(): string | null {
  const session = loadAuthSession();
  return session?.token || null;
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch (error) {
    console.error('[v0] Failed to clear auth session:', error)
  }
}
