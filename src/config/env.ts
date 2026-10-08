const apiUrl = import.meta.env.VITE_API_URL?.trim()

if (!apiUrl) {
  throw new Error('La variable VITE_API_URL no está configurada.')
}

export const env = Object.freeze({
  apiUrl: apiUrl.replace(/\/+$/, ''),
})
