import axios from 'axios'

const BASE = 'https://dashboard-sxkz.onrender.com'

export const API_URL = BASE

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true
})