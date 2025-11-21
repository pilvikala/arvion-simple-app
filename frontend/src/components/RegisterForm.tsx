import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import axios from 'axios'
import { login, register } from '../api/client'
import type { LoginResponse, RegisterPayload } from '../api/client'

interface RegisterFormProps {
  onSuccess: (payload: LoginResponse) => void
  onSwitchMode?: () => void
}

const initialState: RegisterPayload = {
  full_name: '',
  email: '',
  password: '',
}

const RegisterForm = ({ onSuccess, onSwitchMode }: RegisterFormProps) => {
  const [formData, setFormData] = useState<RegisterPayload>(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchMode = () => {
    onSwitchMode?.()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await register(formData)
      const authResponse = await login({ email: formData.email, password: formData.password })
      onSuccess(authResponse)
      setFormData(initialState)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail ?? 'Unable to create your account. Try again later.'
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
        <label htmlFor="full_name">Full name</label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          placeholder="Jane Doe"
          value={formData.full_name}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="email">Work email</label>
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
          placeholder="At least 8 characters"
          minLength={8}
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Create account'}
      </button>
      <p className="form-hint">
        Already have access?{' '}
        <button type="button" className="text-button" onClick={handleSwitchMode}>
          Sign in instead
        </button>
      </p>
    </form>
  )
}

export default RegisterForm
