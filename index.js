import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

async function loadLatestProjects() {
  // Fetch all project data from the JSON file
  const projects = await fetchJSON('./lib/projects.json');
  
  // Filter to get the first three projects
  const latestProjects = projects.slice(0, 3);
  
  // Select the container where the projects will be displayed
  const projectsContainer = document.querySelector('.projects');
  if (!projectsContainer) {
    console.error('No element with class "projects" found.');
    return;
  }
  
  // Render the latest projects using an <h2> heading for each project title
  renderProjects(latestProjects, projectsContainer, 'h2');
}

async function loadProfileStats() {
  // Replace 'your-username' with your actual GitHub username.
  const githubData = await fetchGithubData('Whiteblank0');
  
  // Select the container with the id "profile-stats"
  const profileStats = document.querySelector('#profile-stats');
  
  // Ensure the container exists before updating it
  if (profileStats) {
    profileStats.innerHTML = `
      <h3>GitHub Profile Stats</h3>
      <dl>
        <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
        <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
        <dt>Followers:</dt><dd>${githubData.followers}</dd>
        <dt>Following:</dt><dd>${githubData.following}</dd>
      </dl>
    `;
  } else {
    console.error('No element with id "profile-stats" found.');
  }
}

// Call both functions when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  loadLatestProjects();
  loadProfileStats();
});