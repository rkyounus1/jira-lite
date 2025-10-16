// netlify/functions/projects.js
import { getDatabase } from '@netlify/db'

export async function handler(event, context) {
  const db = getDatabase();
  
  try {
    switch (event.httpMethod) {
      case 'GET':
        if (event.path.includes('/projects/') && event.path.split('/').length > 3) {
          // Get single project
          const id = event.path.split('/').pop();
          const { rows } = await db.query(
            `SELECT 
               p.*,
               t.name as team_name,
               COUNT(s.id) as total_stories,
               COUNT(CASE WHEN s.status = 'done' THEN 1 END) as completed_stories
             FROM projects p
             LEFT JOIN teams t ON p.team_id = t.id
             LEFT JOIN stories s ON p.id = s.project_id
             WHERE p.id = $1
             GROUP BY p.id, t.id`,
            [id]
          );

          if (rows.length === 0) {
            return {
              statusCode: 404,
              body: JSON.stringify({ error: 'Project not found' })
            };
          }

          return {
            statusCode: 200,
            body: JSON.stringify(rows[0])
          };
        } else {
          // Get all projects
          const { rows } = await db.query(
            `SELECT 
               p.*,
               t.name as team_name,
               COUNT(s.id) as total_stories,
               COUNT(CASE WHEN s.status = 'done' THEN 1 END) as completed_stories
             FROM projects p
             LEFT JOIN teams t ON p.team_id = t.id
             LEFT JOIN stories s ON p.id = s.project_id
             GROUP BY p.id, t.id
             ORDER BY p.created_at DESC`
          );

          return {
            statusCode: 200,
            body: JSON.stringify(rows)
          };
        }

      case 'POST':
        const project = JSON.parse(event.body);
        const { name, description, project_key, team_id } = project;

        // Check if project key is unique
        const existingProject = await db.query(
          'SELECT id FROM projects WHERE project_key = $1',
          [project_key]
        );

        if (existingProject.rows.length > 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Project key must be unique' })
          };
        }

        const { rows } = await db.query(
          `INSERT INTO projects (name, description, project_key, team_id)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [name, description, project_key, team_id]
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
          UPDATE projects 
          SET ${setClause.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;

        const { rows: updatedRows } = await db.query(query, values);
        
        if (updatedRows.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Project not found' })
          };
        }

        return {
          statusCode: 200,
          body: JSON.stringify(updatedRows[0])
        };

      case 'DELETE':
        const deleteId = event.path.split('/').pop();
        
        // Check if project has stories
        const storiesCheck = await db.query(
          'SELECT COUNT(*) FROM stories WHERE project_id = $1',
          [deleteId]
        );

        if (parseInt(storiesCheck.rows[0].count) > 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Cannot delete project with existing stories' })
          };
        }

        await db.query('DELETE FROM projects WHERE id = $1', [deleteId]);
        
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
    console.error('Projects error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}