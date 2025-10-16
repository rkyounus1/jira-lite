// netlify/functions/teams.js
import { getDatabase } from '@netlify/db'

export async function handler(event, context) {
  const db = getDatabase();
  
  try {
    switch (event.httpMethod) {
      case 'GET':
        if (event.path.includes('/teams/') && event.path.split('/').length > 3) {
          // Get single team with members
          const id = event.path.split('/').pop();
          const { rows: teamRows } = await db.query(
            'SELECT * FROM teams WHERE id = $1',
            [id]
          );

          if (teamRows.length === 0) {
            return {
              statusCode: 404,
              body: JSON.stringify({ error: 'Team not found' })
            };
          }

          const { rows: memberRows } = await db.query(
            `SELECT 
               u.id, u.email, u.full_name, u.role, tm.role as team_role
             FROM team_members tm
             JOIN users u ON tm.user_id = u.id
             WHERE tm.team_id = $1
             ORDER BY u.full_name`,
            [id]
          );

          const team = {
            ...teamRows[0],
            members: memberRows
          };

          return {
            statusCode: 200,
            body: JSON.stringify(team)
          };
        } else {
          // Get all teams
          const { rows } = await db.query(
            `SELECT 
               t.*,
               COUNT(tm.user_id) as member_count,
               COUNT(p.id) as project_count
             FROM teams t
             LEFT JOIN team_members tm ON t.id = tm.team_id
             LEFT JOIN projects p ON t.id = p.team_id
             GROUP BY t.id
             ORDER BY t.created_at DESC`
          );

          return {
            statusCode: 200,
            body: JSON.stringify(rows)
          };
        }

      case 'POST':
        const team = JSON.parse(event.body);
        const { name, description } = team;

        const { rows } = await db.query(
          `INSERT INTO teams (name, description)
           VALUES ($1, $2)
           RETURNING *`,
          [name, description]
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
          UPDATE teams 
          SET ${setClause.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;

        const { rows: updatedRows } = await db.query(query, values);
        
        if (updatedRows.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Team not found' })
          };
        }

        return {
          statusCode: 200,
          body: JSON.stringify(updatedRows[0])
        };

      case 'DELETE':
        const deleteId = event.path.split('/').pop();
        
        // Check if team has projects
        const projectsCheck = await db.query(
          'SELECT COUNT(*) FROM projects WHERE team_id = $1',
          [deleteId]
        );

        if (parseInt(projectsCheck.rows[0].count) > 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Cannot delete team with existing projects' })
          };
        }

        // Remove team members first
        await db.query('DELETE FROM team_members WHERE team_id = $1', [deleteId]);
        await db.query('DELETE FROM teams WHERE id = $1', [deleteId]);
        
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
    console.error('Teams error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}