export const fetchHealth = async (): Promise<unknown | null> => {
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
    return response.json()
  } catch {
    return null
  }
}
