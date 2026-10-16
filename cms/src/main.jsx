import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './base.css'
import './cms.css'
import { CmsApp } from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CmsApp />
  </StrictMode>,
)
