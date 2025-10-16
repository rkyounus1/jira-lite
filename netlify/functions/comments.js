// netlify/functions/comments.js
import { createClient } from '@netlify/db'

export async function handler(event, context) {
  const db = createClient({ token: process.env.NETLIFY_DB_TOKEN })
  
  try {
    switch (event.httpMethod) {
      case 'GET':
        const { issueId } = event.queryStringParameters
        const { data: comments, error } = await db
          .from('comments')
          .select(`
            *,
            profiles (id, full_name, email)
          `)
          .eq('issue_id', issueId)
          .order('created_at', { ascending: true })
        
        if (error) throw error
        return {
          statusCode: 200,
          body: JSON.stringify(comments)
        }

      case 'POST':
        const comment = JSON.parse(event.body)
        const { data: newComment, error: createError } = await db
          .from('comments')
          .insert(comment)
          .select(`
            *,
            profiles (id, full_name, email)
          `)
          .single()
        
        if (createError) throw createError
        return {
          statusCode: 201,
          body: JSON.stringify(newComment)
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