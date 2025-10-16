// src/utils/db.js
class NetlifyDB {
    constructor() {
      this.baseUrl = '/.netlify/functions';
    }
  
    async request(endpoint, options = {}) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          ...options,
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        return await response.json();
      } catch (error) {
        console.error('Database request failed:', error);
        throw error;
      }
    }
  
    // Teams
    async getTeams() {
      return this.request('/teams');
    }
  
    async createTeam(team) {
      return this.request('/teams', {
        method: 'POST',
        body: JSON.stringify(team),
      });
    }
  
    // Users
    async getUsers() {
      return this.request('/users');
    }
  
    // Projects
    async getProjects() {
      return this.request('/projects');
    }
  
    async createProject(project) {
      return this.request('/projects', {
        method: 'POST',
        body: JSON.stringify(project),
      });
    }
  
    // Sprints
    async getSprints(projectId) {
      return this.request(`/sprints?projectId=${projectId}`);
    }
  
    async createSprint(sprint) {
      return this.request('/sprints', {
        method: 'POST',
        body: JSON.stringify(sprint),
      });
    }
  
    async updateSprint(id, sprint) {
      return this.request(`/sprints/${id}`, {
        method: 'PUT',
        body: JSON.stringify(sprint),
      });
    }
  
    // Stories
    async getStories(filters = {}) {
      const params = new URLSearchParams(filters).toString();
      return this.request(`/stories?${params}`);
    }
  
    async getBacklog(projectId) {
      return this.request(`/stories?projectId=${projectId}&sprintId=backlog`);
    }
  
    async createStory(story) {
      return this.request('/stories', {
        method: 'POST',
        body: JSON.stringify(story),
      });
    }
  
    async updateStory(id, story) {
      return this.request(`/stories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(story),
      });
    }
  
    async updateStoryPosition(stories) {
      return this.request('/stories/position', {
        method: 'PUT',
        body: JSON.stringify({ stories }),
      });
    }
  
    // Epics
    async getEpics(projectId) {
      return this.request(`/epics?projectId=${projectId}`);
    }
  
    // Ceremonies
    async getCeremonies(sprintId) {
      return this.request(`/ceremonies?sprintId=${sprintId}`);
    }
  
    async createCeremony(ceremony) {
      return this.request('/ceremonies', {
        method: 'POST',
        body: JSON.stringify(ceremony),
      });
    }
  
    // Analytics
    async getSprintMetrics(sprintId) {
      return this.request(`/analytics/sprint-metrics?sprintId=${sprintId}`);
    }
  
    async getVelocityChart(projectId) {
      return this.request(`/analytics/velocity?projectId=${projectId}`);
    }
  }
  
  export const db = new NetlifyDB();