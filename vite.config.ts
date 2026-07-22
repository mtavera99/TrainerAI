import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages sirve el proyecto en /TrainerAI/, por eso el base
// solo se aplica en producción (build). En desarrollo usa '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/TrainerAI/' : '/',
  plugins: [react()],
}))
