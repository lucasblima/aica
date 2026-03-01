// src/telegram-mini-app/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import WebApp from '@twa-dev/sdk'
import { applyTelegramTheme } from './theme'
import { App } from './App'

// Import Tailwind CSS (shared with main app — index.css is at project root)
import '../../index.css'

// Initialize Telegram Web App
WebApp.ready()
WebApp.expand()

// Apply Telegram theme as CSS variables
applyTelegramTheme()

// Mount React app
const container = document.getElementById('mini-app-root')
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
