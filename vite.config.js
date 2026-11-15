// Configuración de Vite: activa el plugin oficial para transformar JSX y servir la aplicación.
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
