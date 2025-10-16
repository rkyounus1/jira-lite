// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, CheckCircle, AlertTriangle, Users } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({})
  const [recentIssues, setRecentIssues] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    // Fetch user's assigned issues
    const { data: issues } = await supabase
      .from('issues')
      .select('*')
      .eq('assignee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Fetch stats
    const { count: todoCount } = await supabase
      .from('issues')
      .select('*', { count: 'exact' })
      .eq('assignee_id', user.id)
      .eq('status', 'todo')

    const { count: inProgressCount } = await supabase
      .from('issues')
      .select('*', { count: 'exact' })
      .eq('assignee_id', user.id)
      .eq('status', 'in_progress')

    const { data: performance } = await supabase
      .from('performance_metrics')
      .select('*')
      .eq('employee_id', user.id)
      .order('metric_date', { ascending: false })
      .limit(1)
      .single()

    setStats({
      todo: todoCount,
      inProgress: inProgressCount,
      performance: performance?.overall_performance || 0
    })
    setRecentIssues(issues || [])
  }

  return (
    <div className="dashboard">
      <h1 className="page-title">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-blue-100">
            <AlertTriangle className="text-blue-600" size={24} />
          </div>
          <div className="stat-content">
            <h3>To Do</h3>
            <p className="stat-number">{stats.todo || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-yellow-100">
            <Calendar className="text-yellow-600" size={24} />
          </div>
          <div className="stat-content">
            <h3>In Progress</h3>
            <p className="stat-number">{stats.inProgress || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-green-100">
            <CheckCircle className="text-green-600" size={24} />
          </div>
          <div className="stat-content">
            <h3>Performance</h3>
            <p className="stat-number">{stats.performance}%</p>
          </div>
        </div>
      </div>

      {/* Recent Issues */}
      <div className="recent-issues">
        <h2>Recent Issues</h2>
        <div className="issues-list">
          {recentIssues.map(issue => (
            <div key={issue.id} className="issue-item">
              <div className="issue-main">
                <span className="issue-key">{issue.issue_key}</span>
                <h4 className="issue-title">{issue.title}</h4>
              </div>
              <div className="issue-meta">
                <span className={`status-badge status-${issue.status}`}>
                  {issue.status.replace('_', ' ')}
                </span>
                <span className={`priority-badge priority-${issue.priority}`}>
                  {issue.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}