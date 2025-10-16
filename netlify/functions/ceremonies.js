// netlify/functions/ceremonies.js
import { getDatabase } from '@netlify/db'

export async function handler(event, context) {
  const db = getDatabase();
  
  try {
    const { sprintId } = event.queryStringParameters;

    switch (event.httpMethod) {
      case 'GET':
        if (event.path.includes('/ceremonies/') && event.path.split('/').length > 3) {
          // Get single ceremony with attendees
          const id = event.path.split('/').pop();
          const { rows: ceremonyRows } = await db.query(
            `SELECT 
               c.*,
               s.name as sprint_name
             FROM ceremonies c
             LEFT JOIN sprints s ON c.sprint_id = s.id
             WHERE c.id = $1`,
            [id]
          );

          if (ceremonyRows.length === 0) {
            return {
              statusCode: 404,
              body: JSON.stringify({ error: 'Ceremony not found' })
            };
          }

          const { rows: attendeeRows } = await db.query(
            `SELECT 
               u.id, u.full_name, u.email, ca.attended
             FROM ceremony_attendees ca
             JOIN users u ON ca.user_id = u.id
             WHERE ca.ceremony_id = $1
             ORDER BY u.full_name`,
            [id]
          );

          const ceremony = {
            ...ceremonyRows[0],
            attendees: attendeeRows
          };

          return {
            statusCode: 200,
            body: JSON.stringify(ceremony)
          };
        } else {
          // Get all ceremonies for sprint
          let query = `
            SELECT 
              c.*,
              s.name as sprint_name,
              COUNT(ca.user_id) as attendee_count,
              COUNT(CASE WHEN ca.attended = true THEN 1 END) as attended_count
            FROM ceremonies c
            LEFT JOIN sprints s ON c.sprint_id = s.id
            LEFT JOIN ceremony_attendees ca ON c.id = ca.ceremony_id
          `;

          const params = [];

          if (sprintId) {
            params.push(sprintId);
            query += ` WHERE c.sprint_id = $${params.length}`;
          }

          query += ` GROUP BY c.id, s.id ORDER BY c.scheduled_at ASC`;

          const { rows } = await db.query(query, params);

          return {
            statusCode: 200,
            body: JSON.stringify(rows)
          };
        }

      case 'POST':
        const ceremony = JSON.parse(event.body);
        const { type, title, description, scheduled_at, duration_minutes, sprint_id, attendees } = ceremony;

        const { rows } = await db.query(
          `INSERT INTO ceremonies (type, title, description, scheduled_at, duration_minutes, sprint_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [type, title, description, scheduled_at, duration_minutes, sprint_id]
        );

        const ceremonyId = rows[0].id;

        // Add attendees if provided
        if (attendees && attendees.length > 0) {
          for (const attendee of attendees) {
            await db.query(
              'INSERT INTO ceremony_attendees (ceremony_id, user_id) VALUES ($1, $2)',
              [ceremonyId, attendee.user_id]
            );
          }
        }

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
          if (key !== 'id' && key !== 'attendees') {
            setClause.push(`${key} = $${paramCount}`);
            values.push(updates[key]);
            paramCount++;
          }
        });

        values.push(id);

        const query = `
          UPDATE ceremonies 
          SET ${setClause.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;

        const { rows: updatedRows } = await db.query(query, values);
        
        if (updatedRows.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Ceremony not found' })
          };
        }

        // Handle attendee updates if provided
        if (updates.attendees) {
          // First remove existing attendees
          await db.query('DELETE FROM ceremony_attendees WHERE ceremony_id = $1', [id]);
          
          // Add new attendees
          for (const attendee of updates.attendees) {
            await db.query(
              'INSERT INTO ceremony_attendees (ceremony_id, user_id, attended) VALUES ($1, $2, $3)',
              [id, attendee.user_id, attendee.attended || false]
            );
          }
        }

        return {
          statusCode: 200,
          body: JSON.stringify(updatedRows[0])
        };

      case 'DELETE':
        const deleteId = event.path.split('/').pop();
        
        // Remove attendees first
        await db.query('DELETE FROM ceremony_attendees WHERE ceremony_id = $1', [deleteId]);
        await db.query('DELETE FROM ceremonies WHERE id = $1', [deleteId]);
        
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
    console.error('Ceremonies error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}