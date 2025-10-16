// src/components/SprintPlanning.jsx
import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { db } from '../utils/db';
import { Target, Users, Calendar, BarChart3, Play, Square } from 'lucide-react';

export default function SprintPlanning({ projectId, sprint }) {
  const [backlogStories, setBacklogStories] = useState([]);
  const [sprintStories, setSprintStories] = useState([]);
  const [teamCapacity, setTeamCapacity] = useState(40); // Default capacity

  useEffect(() => {
    loadStories();
  }, [projectId, sprint]);

  const loadStories = async () => {
    try {
      const [backlog, sprintStoriesData] = await Promise.all([
        db.getBacklog(projectId),
        db.getStories({ sprintId: sprint.id })
      ]);
      
      setBacklogStories(backlog);
      setSprintStories(sprintStoriesData);
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const source = result.source.droppableId;
    const destination = result.destination.droppableId;

    if (source === destination) {
      // Reorder within same list
      const items = source === 'backlog' ? [...backlogStories] : [...sprintStories];
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      if (source === 'backlog') {
        setBacklogStories(items);
        await db.updateStoryPosition(items);
      } else {
        setSprintStories(items);
        await db.updateStoryPosition(items);
      }
    } else {
      // Move between lists
      const sourceItems = source === 'backlog' ? [...backlogStories] : [...sprintStories];
      const destItems = destination === 'backlog' ? [...backlogStories] : [...sprintStories];
      
      const [movedItem] = sourceItems.splice(result.source.index, 1);
      const updatedItem = {
        ...movedItem,
        sprint_id: destination === 'sprint' ? sprint.id : null
      };
      
      destItems.splice(result.destination.index, 0, updatedItem);

      if (source === 'backlog') {
        setBacklogStories(sourceItems);
        setSprintStories(destItems);
      } else {
        setSprintStories(sourceItems);
        setBacklogStories(destItems);
      }

      try {
        await db.updateStory(movedItem.id, { sprint_id: updatedItem.sprint_id });
      } catch (error) {
        console.error('Error updating story:', error);
      }
    }
  };

  const calculateCommittedPoints = () => {
    return sprintStories.reduce((sum, story) => sum + (story.story_points || 0), 0);
  };

  const startSprint = async () => {
    try {
      await db.updateSprint(sprint.id, { status: 'active' });
      alert('Sprint started!');
    } catch (error) {
      console.error('Error starting sprint:', error);
    }
  };

  const committedPoints = calculateCommittedPoints();
  const utilization = teamCapacity > 0 ? Math.round((committedPoints / teamCapacity) * 100) : 0;

  return (
    <div className="sprint-planning">
      <div className="planning-header">
        <div className="sprint-info">
          <h2>{sprint.name} - Planning</h2>
          <p className="sprint-goal">{sprint.goal}</p>
          <div className="sprint-dates">
            <Calendar size={16} />
            {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
          </div>
        </div>
        
        <div className="planning-metrics">
          <div className="metric-card">
            <Target size={20} />
            <div>
              <span className="metric-value">{committedPoints}</span>
              <span className="metric-label">Committed Points</span>
            </div>
          </div>
          
          <div className="metric-card">
            <Users size={20} />
            <div>
              <span className="metric-value">{teamCapacity}</span>
              <span className="metric-label">Team Capacity</span>
            </div>
          </div>
          
          <div className="metric-card">
            <BarChart3 size={20} />
            <div>
              <span className="metric-value">{utilization}%</span>
              <span className="metric-label">Utilization</span>
            </div>
          </div>

          {sprint.status === 'planned' && (
            <button onClick={startSprint} className="btn-primary">
              <Play size={16} />
              Start Sprint
            </button>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="planning-board">
          <div className="planning-column">
            <h3>Product Backlog ({backlogStories.length})</h3>
            <Droppable droppableId="backlog">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="stories-list backlog-column"
                >
                  {backlogStories.map((story, index) => (
                    <Draggable key={story.id} draggableId={story.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="story-item"
                        >
                          <div className="story-content">
                            <div className="story-drag-handle">
                              <Square size={16} />
                            </div>
                            <div className="story-info">
                              <h4>{story.title}</h4>
                              <div className="story-meta">
                                {story.story_points && (
                                  <span className="points-badge">{story.story_points}</span>
                                )}
                                {story.epic_name && (
                                  <span className="epic-badge">{story.epic_name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          <div className="planning-column">
            <h3>Sprint Backlog ({sprintStories.length})</h3>
            <Droppable droppableId="sprint">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="stories-list sprint-column"
                >
                  {sprintStories.map((story, index) => (
                    <Draggable key={story.id} draggableId={story.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="story-item"
                        >
                          <div className="story-content">
                            <div className="story-drag-handle">
                              <Square size={16} />
                            </div>
                            <div className="story-info">
                              <h4>{story.title}</h4>
                              <div className="story-meta">
                                {story.story_points && (
                                  <span className="points-badge">{story.story_points}</span>
                                )}
                                {story.epic_name && (
                                  <span className="epic-badge">{story.epic_name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>

      <div className="capacity-slider">
        <label>Team Capacity: {teamCapacity} points</label>
        <input
          type="range"
          min="0"
          max="100"
          value={teamCapacity}
          onChange={(e) => setTeamCapacity(parseInt(e.target.value))}
          className="slider"
        />
        <div className="capacity-warning">
          {utilization > 100 && (
            <span className="warning-text">Over capacity! ({utilization}%)</span>
          )}
          {utilization < 70 && (
            <span className="info-text">Under utilized ({utilization}%)</span>
          )}
          {utilization >= 70 && utilization <= 100 && (
            <span className="success-text">Good capacity ({utilization}%)</span>
          )}
        </div>
      </div>
    </div>
  );
}