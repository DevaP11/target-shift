import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Player from './Player.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
  <Router>
    <Routes>
      <Route path='/player' element={<Player />} />
      <Route path='*' element={<App />} />
    </Routes>
  </Router>
  </StrictMode>,
)
