import axios from 'axios'
import { showToast } from '../utils/toast.js'

export const api = axios.create({ baseURL: '/api/v1' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('queueless.session')
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use((response) => {
  const method = response.config.method?.toLowerCase()
  if (response.config.successToast !== false && ['post', 'put', 'patch', 'delete'].includes(method)) {
    showToast(response.config.successMessage || response.data?.message || 'Action completed successfully.')
  }
  return response
})
