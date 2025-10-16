import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../utils/db'
import { 
  Target, 
  Users, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  FolderOpen, 
  List, 
  BarChart3 
} from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({})
  const [recentStories, setRecentStories] = useState([])
  const [projects, setProjects] = useState([])
  const [sprints, setSprints] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [projectsData, storiesData, sprintsData] = await Promise.all([
        db.getProjects(),
        db.getStories(),
        db.getSprints('1')
      ])

      setProjects(projectsData.slice(0, 3))
      setRecentStories(storiesData.slice(0, 5))
      setSprints(sprintsData)

      // Calculate stats
      const totalStories = storiesData.length
      const completedStories = storiesData.filter(story => story.status === 'done').length
      const inProgressStories = storiesData.filter(story => story.status === 'in_progress').length
      const totalPoints = storiesData.reduce((sum, story) => sum + (story.story_points || 0), 0)

      setStats({
        totalProjects: projectsData.length,
        totalStories,
        completedStories,
        inProgressStories,
        totalPoints
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      review: 'bg-yellow-100 text-yellow-800',
      done: 'bg-green-100 text-green-800'
    }
    return colors[status] || colors.todo
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="page-title">Dashboard</h1>
      </div>
      
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-blue-100">
            <FolderOpen className="text-blue-600" size={24} />
          </div>
          <div className="stat-content">
            <h3>Active Projects</h3>
            <p className="stat-number">{stats.totalProjects || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-green-100">
            <CheckCircle className="text-green-600" size={24} />
          </div>
          <div className="stat-content">
            <h3>Completed Stories</h3>
            <p className="stat-number">{stats.completedStories || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-orange-100">
            <AlertTriangle className="text-orange-600" size={24} />
          </div>
          <div className="stat-content">
            <h3>In Progress</h3>
            <p className="stat-number">{stats.inProgressStories || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple-100">
            <Target className="text-purple-600" size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Points</h3>
            <p className="stat-number">{stats.totalPoints || 0}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Recent Projects */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent Projects</h2>
            <Link to="/projects" className="view-all">View All</Link>
          </div>
          <div className="projects-list">
            {projects.map(project => (
              <Link key={project.id} to={`/projects/${project.id}`} className="project-item">
                <div className="project-item-header">
                  <h4>{project.name}</h4>
                  <span className={`status-badge ${project.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                    {project.status}
                  </span>
                </div>
                <p className="project-key">{project.project_key}</p>
                <p className="project-meta">
                  {project.total_stories} stories • {project.completed_stories} completed
                </p>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${project.total_stories > 0 ? (project.completed_stories / project.total_stories) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Stories */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent Stories</h2>
            <Link to="/issues" className="view-all">View All</Link>
          </div>
          <div className="stories-list">
            {recentStories.map(story => (
              <div key={story.id} className="story-item">
                <div className="story-main">
                  <span className="story-key">{story.issue_key}</span>
                  <h4 className="story-title">{story.title}</h4>
                </div>
                <div className="story-meta">
                  <span className={`status-badge ${getStatusColor(story.status)}`}>
                    {story.status.replace('_', ' ')}
                  </span>
                  {story.story_points && (
                    <span className="points-badge">{story.story_points} pts</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Sprints */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Active Sprints</h2>
          </div>
          <div className="sprints-list">
            {sprints.filter(s => s.status === 'active').map(sprint => (
              <div key={sprint.id} className="sprint-item">
                <div className="sprint-header">
                  <h4>{sprint.name}</h4>
                  <span className="sprint-dates">
                    <Calendar size={14} />
                    {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                  </span>
                </div>
                <p className="sprint-goal">{sprint.goal}</p>
                <div className="sprint-progress">
                  <div className="progress-info">
                    <span>{sprint.completed_points || 0} of {sprint.total_points || 0} points</span>
                    <span>{sprint.total_points > 0 ? Math.round((sprint.completed_points / sprint.total_points) * 100) : 0}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${sprint.total_points > 0 ? (sprint.completed_points / sprint.total_points) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="actions-grid">
            <Link to="/projects" className="action-card">
              <FolderOpen size={24} />
              <span>Create Project</span>
            </Link>
            <Link to="/issues" className="action-card">
              <List size={24} />
              <span>Create Story</span>
            </Link>
            <div className="action-card">
              <Users size={24} />
              <span>Manage Team</span>
            </div>
            <div className="action-card">
              <BarChart3 size={24} />
              <span>View Reports</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}