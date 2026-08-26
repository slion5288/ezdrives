// ============================================================================
// EZDRIVES — API client (frontend)
// Talks to the Cloudflare Pages Functions backend (/api/*) over the same
// origin. Auth via Bearer token. All endpoints return JSON.
// ============================================================================

export interface ApiUser {
  id: string
  role: 'instructor' | 'student'
  name: string
  phone: string
  email?: string
  address?: string
  studentId?: string
}

export interface ApiState {
  ok: boolean
  error?: string
  state?: unknown
  token?: string
  user?: ApiUser
}

async function request<T = ApiState>(path: string, options: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options.token) headers.Authorization = `Bearer ${options.token}`
  const res = await fetch(`/api${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  const data = (await res.json().catch(() => ({}))) as T
  return data
}

/** POST /api/auth/login */
export async function apiLogin(phone: string, password: string): Promise<ApiState> {
  return request('/auth/login', { method: 'POST', body: { phone, password } })
}

/** POST /api/auth/send-code — SMS verification (Twilio) */
export async function apiSendCode(phone: string): Promise<{ ok: boolean; error?: string; demo?: boolean; code?: string }> {
  return request('/auth/send-code', { method: 'POST', body: { phone } })
}

/** POST /api/auth/register */
export async function apiRegister(body: { role: string; name: string; phone: string; password: string; address?: string }): Promise<ApiState> {
  return request('/auth/register', { method: 'POST', body })
}

/** POST /api/auth/logout */
export async function apiLogout(token: string): Promise<void> {
  await request('/auth/logout', { method: 'POST', token })
}

/** GET /api/state */
export async function apiFetchState(token: string): Promise<ApiState> {
  return request('/state', { token })
}

/** PUT /api/state — instructor full save */
export async function apiPutState(token: string, state: unknown): Promise<ApiState> {
  return request('/state', { method: 'PUT', body: { state }, token })
}

/** POST /api/student/actions — student & instructor mutations */
export async function apiAction(token: string, action: string, args: Record<string, unknown>): Promise<ApiState> {
  return request('/student/actions', { method: 'POST', body: { action, args }, token })
}
