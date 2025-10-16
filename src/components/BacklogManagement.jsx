// src/components/BacklogManagement.jsx
import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { db } from '../utils/db';
import { Plus, MessageSquare, GitBranch, Clock, Flag } from 'lucide-react';

export default function BacklogManagement({ projectId }) {
  const [stories, setStories] = useState([]);
  const [epics, setEpics] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStory, setNewStory] = useState({
    title: '',
    description: '',
    story_points: '',
    epic_id: '',
    priority: 'medium',
    assignee_id: ''
  });

  useEffect(() => {
    loadBacklog();
    loadEpics();
    loadUsers();
  }, [projectId]);

  const loadBacklog = async () => {
    try {
      const backlogStories = await db.getBacklog(projectId);
      setStories(backlogStories);
    } catch (error) {
      console.error('Error loading backlog:', error);
    }
  };

  const loadEpics = async () => {
    try {
      const projectEpics = await db.getEpics(projectId);
      setEpics(projectEpics);
    } catch (error) {
      console.error('Error loading epics:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const allUsers = await db.getUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(stories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedStories = items.map((item, index) => ({
      ...item,
      position: index
    }));

    setStories(updatedStories);
    
    try {
      await db.updateStoryPosition(updatedStories);
    } catch (error) {
      console.error('Error updating story positions:', error);
    }
  };

  const handleCreateStory = async (e) => {
    e.preventDefault();
    try {
      await db.createStory({
        ...newStory,
        project_id: projectId,
        story_points: newStory.story_points ? parseInt(newStory.story_points) : null,
        reporter_id: users[0]?.id // In real app, this would be the current user
      });
      
      setShowCreateModal(false);
      setNewStory({
        title: '',
        description: '',
        story_points: '',
        epic_id: '',
        priority: 'medium',
        assignee_id: ''
      });
      await loadBacklog();
    } catch (error) {
      console.error('Error creating story:', error);
    }
  };

  const storyPointOptions = [1, 2, 3, 5, 8, 13, 21];

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="backlog-management">
      <div className="backlog-header">
        <h2>Product Backlog</h2>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus size={16} />
          Add Story
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="backlog">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="backlog-list"
            >
              {stories.map((story, index) => (
                <Draggable key={story.id} draggableId={story.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="story-card"
                    >
                      <div className="story-header">
                        <div className="story-title-section">
                          <span className="story-key">{story.issue_key}</span>
                          <h4>{story.title}</h4>
                        </div>
                        <div className="story-meta">
                          {story.story_points && (
                            <span className="story-points">
                              {story.story_points} pts
                            </span>
                          )}
                          <span className={`priority-badge ${getPriorityColor(story.priority)}`}>
                            <Flag size={12} />
                            {story.priority}
                          </span>
                        </div>
                      </div>
                      
                      {story.description && (
                        <p className="story-description">{story.description}</p>
                      )}
                      
                      <div className="story-footer">
                        <div className="story-tags">
                          {story.epic_name && (
                            <span className="epic-tag">
                              <GitBranch size={12} />
                              {story.epic_name}
                            </span>
                          )}
                          {story.assignee_name && (
                            <span className="assignee-tag">
                              {story.assignee_name}
                            </span>
                          )}
                        </div>
                        <div className="story-actions">
                          <button className="icon-btn" title="Add comment">
                            <MessageSquare size={14} />
                          </button>
                          <button className="icon-btn" title="Time tracking">
                            <Clock size={14} />
                          </button>
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
      </DragDropContext>

      {/* Create Story Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create User Story</h3>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateStory} className="modal-form">
              <div className="form-group">
                <label>Story Title *</label>
                <input
                  type="text"
                  value={newStory.title}
                  onChange={(e) => setNewStory({...newStory, title: e.target.value})}
                  required
                  placeholder="As a user, I want to..."
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newStory.description}
                  onChange={(e) => setNewStory({...newStory, description: e.target.value})}
                  rows={3}
                  placeholder="Detailed description of the story..."
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Story Points</label>
                  <select
                    value={newStory.story_points}
                    onChange={(e) => setNewStory({...newStory, story_points: e.target.value})}
                  >
                    <option value="">Not estimated</option>
                    {storyPointOptions.map(points => (
                      <option key={points} value={points}>
                        {points} {points === 1 ? 'point' : 'points'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={newStory.priority}
                    onChange={(e) => setNewStory({...newStory, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Epic</label>
                  <select
                    value={newStory.epic_id}
                    onChange={(e) => setNewStory({...newStory, epic_id: e.target.value})}
                  >
                    <option value="">No Epic</option>
                    {epics.map(epic => (
                      <option key={epic.id} value={epic.id}>
                        {epic.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Assignee</label>
                  <select
                    value={newStory.assignee_id}
                    onChange={(e) => setNewStory({...newStory, assignee_id: e.target.value})}
                  >
                    <option value="">Unassigned</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Story
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}