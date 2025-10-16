// netlify/functions/stories.js
import { createClient } from '@netlify/db'

export async function handler(event, context) {
  const db = createClient({ token: process.env.NETLIFY_DB_TOKEN })
  
  try {
    const { projectId, sprintId, epicId } = event.queryStringParameters;

    switch (event.httpMethod) {
      case 'GET':
        let query = db
          .from('stories')
          .select(`
            *,
            epics (id, name),
            sprints (id, name),
            projects (id, name, project_key),
            assignee:users!stories_assignee_id_fkey (id, full_name, email),
            reporter:users!stories_reporter_id_fkey (id, full_name, email)
          `);

        if (projectId) {
          query = query.eq('project_id', projectId);
        }

        if (sprintId === 'backlog') {
          query = query.is('sprint_id', null);
        } else if (sprintId) {
          query = query.eq('sprint_id', sprintId);
        }

        if (epicId) {
          query = query.eq('epic_id', epicId);
        }

        query = query.order('position', { ascending: true });

        const { data: stories, error } = await query;

        if (error) throw error;
        return {
          statusCode: 200,
          body: JSON.stringify(stories)
        };

      case 'POST':
        const story = JSON.parse(event.body);
        
        // Set position for backlog items
        if (!story.sprint_id) {
          const { data: lastStory } = await db
            .from('stories')
            .select('position')
            .is('sprint_id', null)
            .order('position', { ascending: false })
            .limit(1)
            .single();

          story.position = lastStory ? lastStory.position + 1 : 0;
        }

        const { data: newStory, error: createError } = await db
          .from('stories')
          .insert(story)
          .select(`
            *,
            epics (id, name),
            sprints (id, name),
            projects (id, name, project_key),
            assignee:users!stories_assignee_id_fkey (id, full_name, email),
            reporter:users!stories_reporter_id_fkey (id, full_name, email)
          `)
          .single();

        if (createError) throw createError;
        return {
          statusCode: 201,
          body: JSON.stringify(newStory)
        };

      case 'PUT':
        if (event.path.includes('/stories/position')) {
          // Bulk update positions
          const { stories } = JSON.parse(event.body);
          
          for (const story of stories) {
            await db
              .from('stories')
              .update({ position: story.position })
              .eq('id', story.id);
          }

          return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
          };
        } else {
          // Single story update
          const id = event.path.split('/').pop();
          const updates = JSON.parse(event.body);
          updates.updated_at = new Date().toISOString();

          const { data: updatedStory, error: updateError } = await db
            .from('stories')
            .update(updates)
            .eq('id', id)
            .select(`
              *,
              epics (id, name),
              sprints (id, name),
              projects (id, name, project_key),
              assignee:users!stories_assignee_id_fkey (id, full_name, email),
              reporter:users!stories_reporter_id_fkey (id, full_name, email)
            `)
            .single();

          if (updateError) throw updateError;
          return {
            statusCode: 200,
            body: JSON.stringify(updatedStory)
          };
        }

      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}