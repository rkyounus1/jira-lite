// netlify/functions/tasks.js
import { getDatabase } from '@netlify/db'

export async function handler(event, context) {
  const db = getDatabase();
  
  try {
    const { storyId } = event.queryStringParameters;

    switch (event.httpMethod) {
      case 'GET':
        if (event.path.includes('/tasks/') && event.path.split('/').length > 3) {
          // Get single task
          const id = event.path.split('/').pop();
          const { rows } = await db.query(
            `SELECT 
               t.*,
               s.title as story_title,
               u.full_name as assignee_name,
               u.email as assignee_email
             FROM tasks t
             LEFT JOIN stories s ON t.story_id = s.id
             LEFT JOIN users u ON t.assignee_id = u.id
             WHERE t.id = $1`,
            [id]
          );

          if (rows.length === 0) {
            return {
              statusCode: 404,
              body: JSON.stringify({ error: 'Task not found' })
            };
          }

          return {
            statusCode: 200,
            body: JSON.stringify(rows[0])
          };
        } else {
          // Get all tasks for story
          let query = `
            SELECT 
              t.*,
              s.title as story_title,
              u.full_name as assignee_name,
              u.email as assignee_email
            FROM tasks t
            LEFT JOIN stories s ON t.story_id = s.id
            LEFT JOIN users u ON t.assignee_id = u.id
          `;

          const params = [];

          if (storyId) {
            params.push(storyId);
            query += ` WHERE t.story_id = $${params.length}`;
          }

          query += ` ORDER BY t.created_at ASC`;

          const { rows } = await db.query(query, params);

          return {
            statusCode: 200,
            body: JSON.stringify(rows)
          };
        }

      case 'POST':
        const task = JSON.parse(event.body);
        const { title, description, estimate_hours, story_id, assignee_id, status } = task;

        const { rows } = await db.query(
          `INSERT INTO tasks (title, description, estimate_hours, story_id, assignee_id, status)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [title, description, estimate_hours, story_id, assignee_id, status || 'todo']
        );

        return {
          statusCode: 201,
          body: JSON.stringify(rows[0])
        };

      case 'PUT':
        const id = event.path.split('/').pop();
        const updates = JSON.parse(event.body);
        
        const setClause = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updates).forEach(key => {
          if (key !== 'id') {
            setClause.push(`${key} = $${paramCount}`);
            values.push(updates[key]);
            paramCount++;
          }
        });

        values.push(id);

        const query = `
          UPDATE tasks 
          SET ${setClause.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;

        const { rows: updatedRows } = await db.query(query, values);
        
        if (updatedRows.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Task not found' })
          };
        }

        return {
          statusCode: 200,
          body: JSON.stringify(updatedRows[0])
        };

      case 'DELETE':
        const deleteId = event.path.split('/').pop();
        
        await db.query('DELETE FROM tasks WHERE id = $1', [deleteId]);
        
        return {
          statusCode: 204,
          body: JSON.stringify({})
        };

      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }
  } catch (error) {
    console.error('Tasks error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}