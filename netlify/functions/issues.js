// netlify/functions/issues.js
import { createClient } from '@netlify/db'

export async function handler(event, context) {
  const db = createClient({ token: process.env.NETLIFY_DB_TOKEN })
  
  try {
    switch (event.httpMethod) {
      case 'GET':
        const queryParams = event.queryStringParameters || {}
        
        if (event.path.includes('/issues/') && event.path.split('/').length > 3) {
          // Get single issue
          const id = event.path.split('/').pop()
          const { data: issue, error } = await db
            .from('issues')
            .select(`
              *,
              projects (id, name, project_key),
              assignee:profiles!issues_assignee_id_fkey (id, full_name, email),
              reporter:profiles!issues_reporter_id_fkey (id, full_name, email)
            `)
            .eq('id', id)
            .single()
          
          if (error) throw error
          return {
            statusCode: 200,
            body: JSON.stringify(issue)
          }
        } else {
          // Get issues with filters
          let query = db
            .from('issues')
            .select(`
              *,
              projects (id, name, project_key),
              assignee:profiles!issues_assignee_id_fkey (id, full_name, email),
              reporter:profiles!issues_reporter_id_fkey (id, full_name, email)
            `)
            .order('created_at', { ascending: false })

          // Apply filters
          if (queryParams.project) query = query.eq('project_id', queryParams.project)
          if (queryParams.status) query = query.eq('status', queryParams.status)
          if (queryParams.assignee) query = query.eq('assignee_id', queryParams.assignee)
          if (queryParams.priority) query = query.eq('priority', queryParams.priority)

          const { data: issues, error } = await query
          
          if (error) throw error
          return {
            statusCode: 200,
            body: JSON.stringify(issues)
          }
        }

      case 'POST':
        const issue = JSON.parse(event.body)
        // Generate issue key
        const project = await db.from('projects').select('project_key').eq('id', issue.project_id).single()
        const latestIssue = await db
          .from('issues')
          .select('issue_key')
          .like('issue_key', `${project.data.project_key}-%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        let issueNumber = 1
        if (latestIssue.data) {
          issueNumber = parseInt(latestIssue.data.issue_key.split('-')[1]) + 1
        }

        issue.issue_key = `${project.data.project_key}-${issueNumber}`

        const { data: newIssue, error: createError } = await db
          .from('issues')
          .insert(issue)
          .select(`
            *,
            projects (id, name, project_key),
            assignee:profiles!issues_assignee_id_fkey (id, full_name, email),
            reporter:profiles!issues_reporter_id_fkey (id, full_name, email)
          `)
          .single()
        
        if (createError) throw createError
        return {
          statusCode: 201,
          body: JSON.stringify(newIssue)
        }

      case 'PUT':
        const id = event.path.split('/').pop()
        const updates = JSON.parse(event.body)
        updates.updated_at = new Date().toISOString()
        
        const { data: updatedIssue, error: updateError } = await db
          .from('issues')
          .update(updates)
          .eq('id', id)
          .select(`
            *,
            projects (id, name, project_key),
            assignee:profiles!issues_assignee_id_fkey (id, full_name, email),
            reporter:profiles!issues_reporter_id_fkey (id, full_name, email)
          `)
          .single()
        
        if (updateError) throw updateError
        return {
          statusCode: 200,
          body: JSON.stringify(updatedIssue)
        }

      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ message: 'Method Not Allowed' })
        }
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}