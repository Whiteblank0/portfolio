import { fetchJSON, renderProjects } from '../global.js';
  
async function loadProjects() {
  const projects = await fetchJSON('../lib/projects.json');
  const projectsContainer = document.querySelector('.projects');
  if (!projectsContainer) {
    console.error('No element with class "projects" found.');
    return;
  }
  renderProjects(projects, projectsContainer, 'h2');
}

document.addEventListener('DOMContentLoaded', loadProjects);
