import { fetchJSON, renderProjects } from '../global.js';

async function loadProjects() {
  // Fetch the projects from the JSON file
  const projects = await fetchJSON('../lib/projects.json');

  // Select the container for the projects
  const projectsContainer = document.querySelector('.projects');
  if (!projectsContainer) {
    console.error('No element with class "projects" found.');
    return;
  }

  // Render the projects
  renderProjects(projects, projectsContainer, 'h2');

  // **New Code**: Update the .projects-title element with the project count
  const projectsTitle = document.querySelector('.projects-title');
  if (projectsTitle) {
    projectsTitle.textContent = `${projects.length} Projects`;
  }
}

// Load projects when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadProjects);