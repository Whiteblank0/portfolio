import { fetchJSON, renderProjects } from '../global.js';

async function loadProjects() {
    try {
        const projects = await fetchJSON('../lib/projects.json');

        // Select the container where projects will be displayed
        const projectsContainer = document.querySelector('.projects');

        // Select the projects title element
        const projectsTitle = document.querySelector('.projects-title');

        // Handle case where projectsContainer is missing
        if (!projectsContainer) {
            console.error('Error: No element with class "projects" found.');
            return;
        }

        // If projects exist, render them; otherwise, display a placeholder message
        if (projects && projects.length > 0) {
            renderProjects(projects, projectsContainer, 'h2');

            // Update the projects count in the title
            if (projectsTitle) {
                projectsTitle.textContent = `Projects (${projects.length})`;
            }
        } else {
            projectsContainer.innerHTML = '<p>No projects available at the moment.</p>';
        }

    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Load projects when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadProjects);