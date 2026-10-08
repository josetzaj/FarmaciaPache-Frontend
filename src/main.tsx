import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/variables.css'
import './styles/global.css'
import App from './App.tsx'
import { CargadorGlobal } from './shared/carga/cargador-global.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CargadorGlobal />
    <App />
  </StrictMode>,
)
