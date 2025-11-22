const MIX_ID_API_BASE = import.meta.env.VITE_MIX_ID_API_BASE || 'http://localhost:3000/api'

export interface MixIdConfig {
  apiBase: string
  clientId: string
  clientSecret: string
  accessToken?: string
  refreshToken?: string
}

class MixIdApi {
  private config: MixIdConfig | null = null

  setConfig(config: MixIdConfig) {
    this.config = config
    if (config.accessToken) {
      localStorage.setItem('mixId_accessToken', config.accessToken)
    }
    if (config.refreshToken) {
      localStorage.setItem('mixId_refreshToken', config.refreshToken)
    }
  }

  getConfig(): MixIdConfig | null {
    if (!this.config) {
      const accessToken = localStorage.getItem('mixId_accessToken')
      const refreshToken = localStorage.getItem('mixId_refreshToken')
      const stored = localStorage.getItem('mixId_config')
      if (stored) {
        this.config = { ...JSON.parse(stored), accessToken: accessToken || undefined, refreshToken: refreshToken || undefined }
      }
    }
    return this.config
  }

  clearConfig() {
    this.config = null
    localStorage.removeItem('mixId_config')
    localStorage.removeItem('mixId_accessToken')
    localStorage.removeItem('mixId_refreshToken')
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const config = this.getConfig()
    if (!config) {
      throw new Error('MIX ID not configured')
    }

    const token = config.accessToken || localStorage.getItem('mixId_accessToken')
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${config.apiBase || MIX_ID_API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        headers['Authorization'] = `Bearer ${refreshed}`
        const retryResponse = await fetch(`${config.apiBase || MIX_ID_API_BASE}${endpoint}`, {
          ...options,
          headers,
        })
        if (!retryResponse.ok) {
          throw new Error(`HTTP ${retryResponse.status}`)
        }
        return retryResponse.json()
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  private async refreshAccessToken(): Promise<string | null> {
    const config = this.getConfig()
    const refreshToken = config?.refreshToken || localStorage.getItem('mixId_refreshToken')
    if (!refreshToken) return null

    try {
      const response = await fetch(`${config?.apiBase || MIX_ID_API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) return null

      const data = await response.json()
      if (data.accessToken) {
        localStorage.setItem('mixId_accessToken', data.accessToken)
        if (this.config) {
          this.config.accessToken = data.accessToken
        }
        return data.accessToken
      }
    } catch (error) {
      console.error('Failed to refresh token:', error)
    }
    return null
  }

  async initiateOAuth(redirectUri: string, state?: string): Promise<{ authorizationUrl: string; code: string }> {
    const config = this.getConfig()
    if (!config) {
      throw new Error('MIX ID not configured')
    }

    return this.request<{ authorizationUrl: string; code: string; state?: string }>(
      '/auth/oauth/authorize',
      {
        method: 'POST',
        body: JSON.stringify({
          clientId: config.clientId,
          redirectUri,
          state,
        }),
      }
    )
  }

  async exchangeCodeForToken(code: string, redirectUri?: string): Promise<{
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
  }> {
    const config = this.getConfig()
    if (!config) {
      throw new Error('MIX ID not configured')
    }

    const response = await this.request<{
      access_token: string
      refresh_token: string
      token_type: string
      expires_in: number
    }>('/auth/oauth/token', {
      method: 'POST',
      body: JSON.stringify({
        code,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri,
      }),
    })

    this.setConfig({
      ...config,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    })

    return response
  }

  async getSyncStatus(): Promise<{
    syncSettings: boolean
    syncData: boolean
    lastSyncAt: string | null
  }> {
    return this.request('/sync/status')
  }

  async updateSyncPreferences(syncSettings: boolean, syncData: boolean): Promise<{ success: boolean }> {
    return this.request('/sync/preferences', {
      method: 'PUT',
      body: JSON.stringify({ syncSettings, syncData }),
    })
  }

  async uploadData(dataType: string, data: Record<string, any>): Promise<{ success: boolean }> {
    return this.request('/sync/data', {
      method: 'POST',
      body: JSON.stringify({ dataType, data }),
    })
  }

  async downloadData(dataType: string): Promise<{ data: Record<string, any>; dataType: string }> {
    return this.request(`/sync/data?dataType=${dataType}`)
  }

  async checkUpdates(dataTypes?: string[]): Promise<{
    updates: {
      data?: Record<string, { updatedAt: string }>
    }
    hasUpdates: boolean
  }> {
    const params = new URLSearchParams()
    if (dataTypes) params.append('dataTypes', dataTypes.join(','))
    return this.request(`/sync/check-updates?${params.toString()}`)
  }

  async heartbeat(deviceInfo?: any): Promise<{ success: boolean }> {
    return this.request('/sessions/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ deviceInfo }),
    })
  }
}

export const mixIdApi = new MixIdApi()

