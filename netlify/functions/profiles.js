// netlify/functions/profiles.js
import { createClient } from '@netlify/db'

export async function handler(event, context) {
  const db = createClient({ token: process.env.NETLIFY_DB_TOKEN })
  
  try {
    switch (event.httpMethod) {
      case 'GET':
        if (event.path.includes('/profiles/') && event.path.split('/').length > 3) {
          // Get single profile
          const id = event.path.split('/').pop()
          const { data: profile, error } = await db.from('profiles').select('*').eq('id', id).single()
          
          if (error) throw error
          return {
            statusCode: 200,
            body: JSON.stringify(profile)
          }
        } else {
          // Get all profiles
          const { data: profiles, error } = await db.from('profiles').select('*')
          
          if (error) throw error
          return {
            statusCode: 200,
            body: JSON.stringify(profiles)
          }
        }

      case 'POST':
        const profile = JSON.parse(event.body)
        const { data: newProfile, error: createError } = await db.from('profiles').insert(profile).select().single()
        
        if (createError) throw createError
        return {
          statusCode: 201,
          body: JSON.stringify(newProfile)
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