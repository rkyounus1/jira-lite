import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Home, 
  FolderOpen, 
  List, 
  Users, 
  BarChart3, 
  LogOut, 
  User 
} from 'lucide-react'

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => location.pathname === path

  const handleSignOut = () => {
    // In a real app, this would clear authentication
    navigate('/')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Agile Tracker</h2>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
            <Home size={20} />
            <span>Dashboard</span>
          </Link>
          
          <Link to="/projects" className={`nav-item ${location.pathname.startsWith('/projects') ? 'active' : ''}`}>
            <FolderOpen size={20} />
            <span>Projects</span>
          </Link>
          
          <Link to="/issues" className={`nav-item ${location.pathname.startsWith('/issues') ? 'active' : ''}`}>
            <List size={20} />
            <span>Issues</span>
          </Link>
          
          <div className="nav-item">
            <Users size={20} />
            <span>Team</span>
          </div>
          
          <div className="nav-item">
            <BarChart3 size={20} />
            <span>Analytics</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <User size={16} />
            <span>demo@company.com</span>
          </div>
          <button onClick={handleSignOut} className="logout-btn">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  )
}