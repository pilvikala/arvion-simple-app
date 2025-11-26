import { useState } from 'react'
import './App.css'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import type { LoginResponse } from './api/client'

type AuthMode = 'login' | 'signup'

function App() {
  const [authState, setAuthState] = useState<LoginResponse | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('login')

  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode)
  }

  const handleSignOut = () => {
    setAuthState(null)
    setAuthMode('login')
  }

  return (
    <div className="app-shell">
      <section className="hero">
        <p className="eyebrow">Simple Web App</p>
        <h1>Connect to your dashboard securely.</h1>
        <p className="subhead">
          Use your organization-issued credentials to log in. New accounts can be created via the backend
          register API while we build the rest of the experience.
        </p>
        <ul>
          <li>FastAPI backend secured with hashed passwords</li>
          <li>Postgres for persistent user records</li>
          <li>Responsive React + Vite frontend with signup/login</li>
        </ul>
      </section>

      <section className="auth-panel">
        <header>
          <h2>
            {authState
              ? `Welcome back, ${authState.user.full_name}!`
              : authMode === 'login'
                ? 'Sign in to continue'
                : 'Create your account'}
          </h2>
          <p>
            {authState
              ? 'You are now authenticated.'
              : authMode === 'login'
                ? 'Enter your email and password to access the app.'
                : 'Fill in the details below to join the workspace.'}
          </p>
        </header>

        {!authState && (
          <div className="auth-toggle" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={authMode === 'login' ? 'active' : ''}
              aria-pressed={authMode === 'login'}
              onClick={() => handleModeChange('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={authMode === 'signup' ? 'active' : ''}
              aria-pressed={authMode === 'signup'}
              onClick={() => handleModeChange('signup')}
            >
              Create account
            </button>
          </div>
        )}

        {authState ? (
          <>
            <div className="success-card">
              <p>{authState.message}</p>
              <dl>
                <div>
                  <dt>Email</dt>
                  <dd>{authState.user.email}</dd>
                </div>
                <div>
                  <dt>Account created</dt>
                  <dd>{new Date(authState.user.created_at).toLocaleString()}</dd>
                </div>
              </dl>
              <button onClick={handleSignOut}>Sign out</button>
            </div>
          </>
        ) : authMode === 'login' ? (
          <LoginForm onSuccess={setAuthState} onSwitchMode={() => handleModeChange('signup')} />
        ) : (
          <RegisterForm onSuccess={setAuthState} onSwitchMode={() => handleModeChange('login')} />
        )}
      </section>
    </div>
  )
}

export default App
