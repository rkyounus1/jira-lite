// netlify/functions/stories.js
import { getDatabase } from '@netlify/db'

export async function handler(event, context) {
  const db = getDatabase();
  
  try {
    const { projectId, sprintId, epicId } = event.queryStringParameters;

    switch (event.httpMethod) {
      case 'GET':
        let query = `
          SELECT 
            s.*,
            e.name as epic_name,
            sp.name as sprint_name,
            p.name as project_name,
            p.project_key,
            a.full_name as assignee_name,
            a.email as assignee_email,
            r.full_name as reporter_name,
            r.email as reporter_email
          FROM stories s
          LEFT JOIN epics e ON s.epic_id = e.id
          LEFT JOIN sprints sp ON s.sprint_id = sp.id
          LEFT JOIN projects p ON s.project_id = p.id
          LEFT JOIN users a ON s.assignee_id = a.id
          LEFT JOIN users r ON s.reporter_id = r.id
          WHERE 1=1
        `;

        const params = [];

        if (projectId) {
          params.push(projectId);
          query += ` AND s.project_id = $${params.length}`;
        }

        if (sprintId === 'backlog') {
          query += ` AND s.sprint_id IS NULL`;
        } else if (sprintId) {
          params.push(sprintId);
          query += ` AND s.sprint_id = $${params.length}`;
        }

        if (epicId) {
          params.push(epicId);
          query += ` AND s.epic_id = $${params.length}`;
        }

        query += ` ORDER BY s.position ASC, s.created_at DESC`;

        const { rows: stories } = await db.query(query, params);

        return {
          statusCode: 200,
          body: JSON.stringify(stories)
        };

      case 'POST':
        const story = JSON.parse(event.body);
        const { title, description, story_points, priority, project_id, epic_id, sprint_id, assignee_id, reporter_id } = story;
        
        // Get next position for backlog
        let position = 0;
        if (!sprint_id) {
          const positionResult = await db.query(
            'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM stories WHERE project_id = $1 AND sprint_id IS NULL',
            [project_id]
          );
          position = positionResult.rows[0].next_position;
        }

        // Generate issue key
        const projectResult = await db.query(
          'SELECT project_key FROM projects WHERE id = $1',
          [project_id]
        );
        const projectKey = projectResult.rows[0].project_key;

        const latestIssue = await db.query(
          'SELECT issue_key FROM stories WHERE project_id = $1 AND issue_key LIKE $2 ORDER BY created_at DESC LIMIT 1',
          [project_id, `${projectKey}-%`]
        );

        let issueNumber = 1;
        if (latestIssue.rows.length > 0) {
          issueNumber = parseInt(latestIssue.rows[0].issue_key.split('-')[1]) + 1;
        }

        const issueKey = `${projectKey}-${issueNumber}`;

        const insertResult = await db.query(
          `INSERT INTO stories (
            title, description, story_points, priority, project_id, epic_id, 
            sprint_id, assignee_id, reporter_id, position, issue_key
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *`,
          [title, description, story_points, priority, project_id, epic_id, 
           sprint_id, assignee_id, reporter_id, position, issueKey]
        );

        return {
          statusCode: 201,
          body: JSON.stringify(insertResult.rows[0])
        };

      case 'PUT':
        if (event.path.includes('/stories/position')) {
          // Bulk update positions
          const { stories } = JSON.parse(event.body);
          
          for (const story of stories) {
            await db.query(
              'UPDATE stories SET position = $1, updated_at = NOW() WHERE id = $2',
              [story.position, story.id]
            );
          }

          return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
          };
        } else {
          // Single story update
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

          setClause.push('updated_at = NOW()');
          values.push(id);

          const query = `
            UPDATE stories 
            SET ${setClause.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
          `;

          const { rows } = await db.query(query, values);
          
          return {
            statusCode: 200,
            body: JSON.stringify(rows[0])
          };
        }

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