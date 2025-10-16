// netlify/functions/sprints.js
import { getDatabase } from '@netlify/db'

export async function handler(event, context) {
  const db = getDatabase();
  
  try {
    const { projectId } = event.queryStringParameters;

    switch (event.httpMethod) {
      case 'GET':
        let query = `
          SELECT 
            s.*,
            p.name as project_name,
            p.project_key,
            COUNT(st.id) as total_stories,
            SUM(CASE WHEN st.status = 'done' THEN st.story_points ELSE 0 END) as completed_points,
            SUM(st.story_points) as total_points
          FROM sprints s
          LEFT JOIN projects p ON s.project_id = p.id
          LEFT JOIN stories st ON s.id = st.sprint_id
          WHERE s.project_id = $1
          GROUP BY s.id, p.id
          ORDER BY s.start_date DESC
        `;

        const { rows: sprints } = await db.query(query, [projectId]);

        return {
          statusCode: 200,
          body: JSON.stringify(sprints)
        };

      case 'POST':
        const sprint = JSON.parse(event.body);
        const { name, goal, start_date, end_date, project_id, velocity_planned } = sprint;

        const result = await db.query(
          `INSERT INTO sprints (name, goal, start_date, end_date, project_id, velocity_planned)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [name, goal, start_date, end_date, project_id, velocity_planned]
        );

        return {
          statusCode: 201,
          body: JSON.stringify(result.rows[0])
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
          UPDATE sprints 
          SET ${setClause.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;

        const { rows } = await db.query(updateQuery, values);
        
        return {
          statusCode: 200,
          body: JSON.stringify(rows[0])
        };

      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}