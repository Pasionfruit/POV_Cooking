import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // host: true exposes the dev server on your LAN so you can open the app
  // from a phone at http://<your-computer-ip>:5173
  server: {
    host: true,
    port: 5173,
  },
})
