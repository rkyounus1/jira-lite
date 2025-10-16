import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Issues from './pages/Issues'
import Layout from './components/Layout'
import './styles/global.css'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<div className="page-content"><h1>Project Details - Coming Soon</h1></div>} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/issues/:id" element={<div className="page-content"><h1>Issue Details - Coming Soon</h1></div>} />
          <Route path="/issues/new" element={<div className="page-content"><h1>Create New Story - Coming Soon</h1></div>} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App