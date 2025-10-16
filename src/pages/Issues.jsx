import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../utils/db'
import { 
  Plus, 
  Filter, 
  Search 
} from 'lucide-react'

export default function Issues() {
  const [stories, setStories] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    project: '',
    status: '',
    priority: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [storiesData, projectsData] = await Promise.all([
        db.getStories(),
        db.getProjects()
      ])
      setStories(storiesData)
      setProjects(projectsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredStories = stories.filter(story => {
    return (
      (!filters.project || story.project_id === filters.project) &&
      (!filters.status || story.status === filters.status) &&
      (!filters.priority || story.priority === filters.priority)
    )
  })

  const getStatusColor = (status) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      review: 'bg-yellow-100 text-yellow-800',
      done: 'bg-green-100 text-green-800'
    }
    return colors[status] || colors.todo
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    return colors[priority] || colors.medium
  }

  if (loading) {
    return <div className="loading">Loading issues...</div>
  }

  return (
    <div className="issues-page">
      <div className="page-header">
        <h1 className="page-title">Stories & Issues</h1>
        <Link to="/issues/new" className="btn-primary">
          <Plus size={20} />
          Create Story
        </Link>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input type="text" placeholder="Search stories..." />
        </div>
        
        <div className="filter-group">
          <select 
            value={filters.project} 
            onChange={(e) => setFilters({...filters, project: e.target.value})}
          >
            <option value="">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <select 
            value={filters.status} 
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>
        
        <div className="filter-group">
          <select 
            value={filters.priority} 
            onChange={(e) => setFilters({...filters, priority: e.target.value})}
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Stories List */}
      <div className="issues-list-container">
        {filteredStories.map(story => (
          <Link key={story.id} to={`/issues/${story.id}`} className="issue-row">
            <div className="issue-main">
              <div className="issue-key-type">
                <span className="issue-key">{story.issue_key}</span>
                <span className="issue-type">Story</span>
              </div>
              <h4 className="issue-title">{story.title}</h4>
              <p className="issue-description">{story.description}</p>
              {story.epic_name && (
                <span className="epic-badge">{story.epic_name}</span>
              )}
            </div>
            <div className="issue-meta">
              <span className={`status-badge ${getStatusColor(story.status)}`}>
                {story.status.replace('_', ' ')}
              </span>
              <span className={`priority-badge ${getPriorityColor(story.priority)}`}>
                {story.priority}
              </span>
              {story.story_points && (
                <span className="points-badge">{story.story_points} pts</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filteredStories.length === 0 && (
        <div className="empty-state">
          <h3>No stories found</h3>
          <p>Try adjusting your filters or create a new story.</p>
        </div>
      )}
    </div>
  )
}