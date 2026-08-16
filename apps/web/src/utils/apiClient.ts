import type { paths } from '@lousuxing/contracts/generated/web-client'

type HealthSuccess =
  paths['/api/health']['get']['responses']['200']['content']['application/json']

export const fetchHealth = async (): Promise<HealthSuccess | null> => {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
    if (!response.ok) {
      return null
    }
    return (await response.json()) as HealthSuccess
  } catch {
    return null
  }
}
