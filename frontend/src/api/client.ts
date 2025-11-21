import axios from 'axios'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload extends LoginPayload {
  full_name: string
}

export interface AuthenticatedUser {
  id: number
  email: string
  full_name: string
  is_active: boolean
  created_at: string
}

export interface LoginResponse {
  message: string
  user: AuthenticatedUser
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload)
  return data
}

export async function register(payload: RegisterPayload): Promise<AuthenticatedUser> {
  const { data } = await api.post<AuthenticatedUser>('/auth/register', payload)
  return data
}

export default api
