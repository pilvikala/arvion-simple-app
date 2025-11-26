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

export interface ConnectionDTO {
  id: number
  name: string
  connection_string: string
  created_at: string
}

export interface CreateConnectionPayload {
  name: string
  connection_string: string
}

export interface SqlQueryPayload {
  connection_id: number
  query: string
}

export interface SqlQueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  row_count: number
  message?: string | null
}

export interface ConnectionTestResponse {
  ok: boolean
  message: string
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

export async function listConnections(): Promise<ConnectionDTO[]> {
  const { data } = await api.get<ConnectionDTO[]>('/connections')
  return data
}

export async function createConnection(payload: CreateConnectionPayload): Promise<ConnectionDTO> {
  const { data } = await api.post<ConnectionDTO>('/connections', payload)
  return data
}

export async function updateConnection(
  id: number,
  payload: CreateConnectionPayload,
): Promise<ConnectionDTO> {
  const { data } = await api.put<ConnectionDTO>(`/connections/${id}`, payload)
  return data
}

export async function deleteConnection(id: number): Promise<void> {
  await api.delete(`/connections/${id}`)
}

export async function runSqlQuery(payload: SqlQueryPayload): Promise<SqlQueryResult> {
  const { data } = await api.post<SqlQueryResult>('/sql/execute', payload)
  return data
}

export async function testConnection(connection_string: string): Promise<ConnectionTestResponse> {
  const { data } = await api.post<ConnectionTestResponse>('/connections/test', {
    connection_string,
  })
  return data
}

export default api
