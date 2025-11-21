import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import axios from 'axios'
import { login } from '../api/client'
import type { LoginPayload, LoginResponse } from '../api/client'

interface LoginFormProps {
  onSuccess: (payload: LoginResponse) => void
  onSwitchMode?: () => void
}

const initialState: LoginPayload = {
  email: '',
  password: '',
}

const LoginForm = ({ onSuccess, onSwitchMode }: LoginFormProps) => {
  const [formData, setFormData] = useState<LoginPayload>(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSwitchMode = () => {
    onSwitchMode?.()
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const response = await login(formData)
      onSuccess(response)
      setFormData(initialState)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail ?? 'Unable to login with the provided credentials.'
        setError(detail)
      } else {
        setError('Unexpected error. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="form-hint">
        Need an account?{' '}
        <button type="button" className="text-button" onClick={handleSwitchMode}>
          Create one
        </button>
      </p>
    </form>
  )
}

export default LoginForm
