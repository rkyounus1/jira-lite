// netlify/functions/analytics.js
import { getDatabase } from '@netlify/db'

export async function handler(event, context) {
  const db = getDatabase();
  
  try {
    const { sprintId, projectId } = event.queryStringParameters;

    if (event.path.includes('/analytics/sprint-metrics')) {
      // Get sprint metrics for burndown chart
      const sprintResult = await db.query(
        'SELECT * FROM sprints WHERE id = $1',
        [sprintId]
      );

      if (sprintResult.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Sprint not found' })
        };
      }

      const sprint = sprintResult.rows[0];

      const storiesResult = await db.query(
        `SELECT story_points, status, created_at, updated_at 
         FROM stories 
         WHERE sprint_id = $1`,
        [sprintId]
      );

      const stories = storiesResult.rows;
      const totalPoints = stories.reduce((sum, story) => sum + (story.story_points || 0), 0);
      const completedPoints = stories
        .filter(story => story.status === 'done')
        .reduce((sum, story) => sum + (story.story_points || 0), 0);

      // Calculate ideal burndown
      const startDate = new Date(sprint.start_date);
      const endDate = new Date(sprint.end_date);
      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      const idealBurndown = Array.from({ length: totalDays + 1 }, (_, i) => ({
        day: i,
        ideal: Math.max(0, totalPoints - (totalPoints / totalDays) * i),
        actual: totalPoints // This would be calculated from actual progress in a real implementation
      }));

      return {
        statusCode: 200,
        body: JSON.stringify({
          totalPoints,
          completedPoints,
          remainingPoints: totalPoints - completedPoints,
          completionPercentage: totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0,
          idealBurndown,
          sprintDays: totalDays
        })
      };
    } else if (event.path.includes('/analytics/velocity')) {
      // Get velocity chart data
      const velocityResult = await db.query(
        `SELECT 
           s.name as sprint_name,
           s.start_date,
           s.end_date,
           s.velocity_planned,
           SUM(CASE WHEN st.status = 'done' THEN st.story_points ELSE 0 END) as completed_points,
           COUNT(st.id) as total_stories,
           COUNT(CASE WHEN st.status = 'done' THEN 1 END) as completed_stories
         FROM sprints s
         LEFT JOIN stories st ON s.id = st.sprint_id
         WHERE s.project_id = $1 AND s.status = 'completed'
         GROUP BY s.id
         ORDER BY s.start_date ASC`,
        [projectId]
      );

      const velocityData = velocityResult.rows.map(row => ({
        sprint: row.sprint_name,
        committed: row.velocity_planned || 0,
        completed: row.completed_points || 0,
        date: row.start_date,
        completionRate: row.total_stories > 0 ? (row.completed_stories / row.total_stories) * 100 : 0
      }));

      return {
        statusCode: 200,
        body: JSON.stringify(velocityData)
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'Not Found' })
    };
  } catch (error) {
    console.error('Analytics error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}// netlify/functions/analytics.js
import { createClient } from '@netlify/db'

export async function handler(event, context) {
  const db = createClient({ token: process.env.NETLIFY_DB_TOKEN })
  
  try {
    const { sprintId, projectId } = event.queryStringParameters;

    switch (event.path) {
      case '/.netlify/functions/analytics/sprint-metrics':
        // Get sprint metrics for burndown chart
        const { data: sprint } = await db
          .from('sprints')
          .select('*')
          .eq('id', sprintId)
          .single();

        const { data: stories } = await db
          .from('stories')
          .select('*')
          .eq('sprint_id', sprintId);

        const totalPoints = stories.reduce((sum, story) => sum + (story.story_points || 0), 0);
        const completedPoints = stories
          .filter(story => story.status === 'done')
          .reduce((sum, story) => sum + (story.story_points || 0), 0);

        // Calculate ideal burndown
        const startDate = new Date(sprint.start_date);
        const endDate = new Date(sprint.end_date);
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        const idealBurndown = Array.from({ length: totalDays + 1 }, (_, i) => ({
          day: i,
          ideal: totalPoints - (totalPoints / totalDays) * i,
          actual: 0 // This would come from story history in a real implementation
        }));

        return {
          statusCode: 200,
          body: JSON.stringify({
            totalPoints,
            completedPoints,
            remainingPoints: totalPoints - completedPoints,
            completionPercentage: totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0,
            idealBurndown
          })
        };

      case '/.netlify/functions/analytics/velocity':
        // Get velocity chart data
        const { data: completedSprints } = await db
          .from('sprints')
          .select(`
            *,
            stories (story_points, status)
          `)
          .eq('project_id', projectId)
          .eq('status', 'completed')
          .order('start_date', { ascending: true });

        const velocityData = completedSprints.map(sprint => {
          const completedPoints = sprint.stories
            .filter(story => story.status === 'done')
            .reduce((sum, story) => sum + (story.story_points || 0), 0);

          return {
            sprint: sprint.name,
            committed: sprint.velocity_planned || 0,
            completed: completedPoints,
            date: sprint.start_date
          };
        });

        return {
          statusCode: 200,
          body: JSON.stringify(velocityData)
        };

      default:
        return {
          statusCode: 404,
          body: JSON.stringify({ message: 'Not Found' })
        };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}