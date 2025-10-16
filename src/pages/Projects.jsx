import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../utils/db'
import { 
  Plus, 
  FolderOpen, 
  Users, 
  Calendar 
} from 'lucide-react'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    project_key: '',
    team_id: ''
  })

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const projectsData = await db.getProjects()
      setProjects(projectsData)
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (e) => {
    e.preventDefault()
    try {
      await db.createProject({
        ...newProject,
        status: 'active'
      })
      setShowCreateModal(false)
      setNewProject({ name: '', description: '', project_key: '', team_id: '' })
      loadProjects()
    } catch (error) {
      console.error('Error creating project:', error)
    }
  }

  if (loading) {
    return <div className="loading">Loading projects...</div>
  }

  return (
    <div className="projects-page">
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      <div className="projects-grid">
        {projects.map(project => (
          <Link key={project.id} to={`/projects/${project.id}`} className="project-card">
            <div className="project-card-header">
              <div className="project-icon">
                <FolderOpen size={24} />
              </div>
              <span className={`status-badge ${project.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                {project.status}
              </span>
            </div>
            <h3 className="project-name">{project.name}</h3>
            <p className="project-key">{project.project_key}</p>
            <p className="project-description">{project.description}</p>
            
            <div className="project-stats">
              <div className="project-stat">
                <Users size={16} />
                <span>{project.team_name}</span>
              </div>
              <div className="project-stat">
                <Calendar size={16} />
                <span>{project.total_stories} stories</span>
              </div>
            </div>

            <div className="project-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${project.total_stories > 0 ? (project.completed_stories / project.total_stories) * 100 : 0}%` 
                  }}
                ></div>
              </div>
              <span className="progress-text">
                {project.completed_stories} of {project.total_stories} completed
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Project</h3>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="modal-form">
              <div className="form-group">
                <label>Project Name *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  required
                  placeholder="Enter project name"
                />
              </div>
              
              <div className="form-group">
                <label>Project Key *</label>
                <input
                  type="text"
                  value={newProject.project_key}
                  onChange={(e) => setNewProject({...newProject, project_key: e.target.value.toUpperCase()})}
                  required
                  maxLength={10}
                  placeholder="e.g., PROJ"
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  rows={3}
                  placeholder="Project description..."
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}