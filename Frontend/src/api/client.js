import axios from 'axios'

export const api = axios.create({ baseURL: '/api/v1' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('queueless.session')
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
  return config
})
