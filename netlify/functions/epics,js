// netlify/functions/epics.js
import { getDatabase } from '@netlify/db'

export async function handler(event, context) {
  const db = getDatabase();
  
  try {
    const { projectId } = event.queryStringParameters;

    switch (event.httpMethod) {
      case 'GET':
        if (event.path.includes('/epics/') && event.path.split('/').length > 3) {
          // Get single epic
          const id = event.path.split('/').pop();
          const { rows } = await db.query(
            `SELECT 
               e.*,
               p.name as project_name,
               COUNT(s.id) as total_stories,
               SUM(s.story_points) as total_points,
               COUNT(CASE WHEN s.status = 'done' THEN 1 END) as completed_stories
             FROM epics e
             LEFT JOIN projects p ON e.project_id = p.id
             LEFT JOIN stories s ON e.id = s.epic_id
             WHERE e.id = $1
             GROUP BY e.id, p.id`,
            [id]
          );

          if (rows.length === 0) {
            return {
              statusCode: 404,
              body: JSON.stringify({ error: 'Epic not found' })
            };
          }

          return {
            statusCode: 200,
            body: JSON.stringify(rows[0])
          };
        } else {
          // Get all epics for project
          let query = `
            SELECT 
              e.*,
              p.name as project_name,
              COUNT(s.id) as total_stories,
              SUM(s.story_points) as total_points,
              COUNT(CASE WHEN s.status = 'done' THEN 1 END) as completed_stories
            FROM epics e
            LEFT JOIN projects p ON e.project_id = p.id
            LEFT JOIN stories s ON e.id = s.epic_id
          `;

          const params = [];

          if (projectId) {
            params.push(projectId);
            query += ` WHERE e.project_id = $${params.length}`;
          }

          query += ` GROUP BY e.id, p.id ORDER BY e.created_at DESC`;

          const { rows } = await db.query(query, params);

          return {
            statusCode: 200,
            body: JSON.stringify(rows)
          };
        }

      case 'POST':
        const epic = JSON.parse(event.body);
        const { name, description, project_id, status } = epic;

        const { rows } = await db.query(
          `INSERT INTO epics (name, description, project_id, status)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [name, description, project_id, status || 'backlog']
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

        const updateQuery = `
          UPDATE epics 
          SET ${setClause.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;

        const { rows: updatedRows } = await db.query(updateQuery, values);
        
        if (updatedRows.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Epic not found' })
          };
        }

        return {
          statusCode: 200,
          body: JSON.stringify(updatedRows[0])
        };

      case 'DELETE':
        const deleteId = event.path.split('/').pop();
        
        // Check if epic has stories
        const storiesCheck = await db.query(
          'SELECT COUNT(*) FROM stories WHERE epic_id = $1',
          [deleteId]
        );

        if (parseInt(storiesCheck.rows[0].count) > 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Cannot delete epic with existing stories' })
          };
        }

        await db.query('DELETE FROM epics WHERE id = $1', [deleteId]);
        
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
    console.error('Epics error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}