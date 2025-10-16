// netlify/functions/users.js
import { getDatabase } from '@netlify/db'

export async function handler(event, context) {
  const db = getDatabase();
  
  try {
    switch (event.httpMethod) {
      case 'GET':
        if (event.path.includes('/users/') && event.path.split('/').length > 3) {
          // Get single user with team memberships
          const id = event.path.split('/').pop();
          const { rows: userRows } = await db.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
          );

          if (userRows.length === 0) {
            return {
              statusCode: 404,
              body: JSON.stringify({ error: 'User not found' })
            };
          }

          const { rows: teamRows } = await db.query(
            `SELECT 
               t.id, t.name, tm.role as team_role
             FROM team_members tm
             JOIN teams t ON tm.team_id = t.id
             WHERE tm.user_id = $1
             ORDER BY t.name`,
            [id]
          );

          const { rows: statsRows } = await db.query(
            `SELECT 
               COUNT(*) as total_stories,
               COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_stories,
               SUM(CASE WHEN status = 'done' THEN story_points ELSE 0 END) as completed_points
             FROM stories 
             WHERE assignee_id = $1`,
            [id]
          );

          const user = {
            ...userRows[0],
            teams: teamRows,
            stats: statsRows[0] || { total_stories: 0, completed_stories: 0, completed_points: 0 }
          };

          return {
            statusCode: 200,
            body: JSON.stringify(user)
          };
        } else {
          // Get all users
          const { rows } = await db.query(
            `SELECT 
               u.*,
               COUNT(tm.team_id) as team_count,
               COUNT(s.id) as assigned_stories
             FROM users u
             LEFT JOIN team_members tm ON u.id = tm.user_id
             LEFT JOIN stories s ON u.id = s.assignee_id
             GROUP BY u.id
             ORDER BY u.full_name`
          );

          return {
            statusCode: 200,
            body: JSON.stringify(rows)
          };
        }

      case 'POST':
        const user = JSON.parse(event.body);
        const { email, full_name, role, avatar_url } = user;

        // Check if user already exists
        const existingUser = await db.query(
          'SELECT id FROM users WHERE email = $1',
          [email]
        );

        if (existingUser.rows.length > 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'User with this email already exists' })
          };
        }

        const { rows } = await db.query(
          `INSERT INTO users (email, full_name, role, avatar_url)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [email, full_name, role || 'developer', avatar_url]
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
          if (key !== 'id' && key !== 'email') { // Don't allow email updates
            setClause.push(`${key} = $${paramCount}`);
            values.push(updates[key]);
            paramCount++;
          }
        });

        values.push(id);

        const query = `
          UPDATE users 
          SET ${setClause.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;

        const { rows: updatedRows } = await db.query(query, values);
        
        if (updatedRows.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'User not found' })
          };
        }

        return {
          statusCode: 200,
          body: JSON.stringify(updatedRows[0])
        };

      case 'DELETE':
        const deleteId = event.path.split('/').pop();
        
        // Check if user has assigned stories
        const storiesCheck = await db.query(
          'SELECT COUNT(*) FROM stories WHERE assignee_id = $1 OR reporter_id = $1',
          [deleteId]
        );

        if (parseInt(storiesCheck.rows[0].count) > 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Cannot delete user with assigned stories' })
          };
        }

        // Remove from teams first
        await db.query('DELETE FROM team_members WHERE user_id = $1', [deleteId]);
        await db.query('DELETE FROM users WHERE id = $1', [deleteId]);
        
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
    console.error('Users error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}