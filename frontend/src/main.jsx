import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './legacy/styles.css'
import './legacy/shop.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
