export const fetchHealth = async (
  endpoint = import.meta.env.VITE_HEALTHCHECK_URL,
): Promise<unknown | null> => {
  if (!endpoint) {
    return null
  }

  try {
    const response = await fetch(endpoint, {
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
