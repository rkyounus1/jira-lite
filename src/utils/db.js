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
      // Return mock data for development
      return this.getMockData(endpoint);
    }
  }

  // Mock data for development
  getMockData(endpoint) {
    const mockData = {
      '/projects': [
        {
          id: '1',
          name: 'E-commerce Platform',
          description: 'Next generation e-commerce platform',
          project_key: 'ECOM',
          status: 'active',
          team_name: 'Development Team',
          total_stories: 15,
          completed_stories: 8
        },
        {
          id: '2', 
          name: 'Mobile App',
          description: 'Customer mobile application',
          project_key: 'MOB',
          status: 'active',
          team_name: 'Mobile Team',
          total_stories: 12,
          completed_stories: 4
        }
      ],
      '/sprints': [
        {
          id: '1',
          name: 'Sprint 1',
          goal: 'Setup basic authentication and user management',
          start_date: '2024-01-01',
          end_date: '2024-01-14',
          status: 'completed',
          total_points: 35,
          completed_points: 32
        },
        {
          id: '2',
          name: 'Sprint 2', 
          goal: 'Implement product search and filtering',
          start_date: '2024-01-15',
          end_date: '2024-01-28',
          status: 'active',
          total_points: 42,
          completed_points: 18
        }
      ],
      '/stories': [
        {
          id: '1',
          title: 'User login functionality',
          description: 'As a user, I want to log in to the application',
          story_points: 5,
          status: 'done',
          priority: 'high',
          issue_key: 'ECOM-1',
          epic_name: 'User Authentication'
        },
        {
          id: '2',
          title: 'Product search',
          description: 'As a user, I want to search for products',
          story_points: 8,
          status: 'in_progress',
          priority: 'high',
          issue_key: 'ECOM-2',
          epic_name: 'Product Catalog'
        }
      ]
    };

    return mockData[endpoint] || [];
  }

  // Teams
  async getTeams() {
    return this.request('/teams');
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
}

export const db = new NetlifyDB();