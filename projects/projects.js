import { fetchJSON, renderProjects } from '../global.js';

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    // Clear existing content to prevent duplication
    containerElement.innerHTML = '';
  
    // Check if there are no projects to display
    if (!projects || projects.length === 0) {
      containerElement.innerHTML = '<p>No projects available at the moment.</p>';
      return;
    }
  
    // Validate the heading level
    const validHeadingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    if (!validHeadingLevels.includes(headingLevel)) {
      console.warn(`Invalid headingLevel "${headingLevel}", defaulting to "h2".`);
      headingLevel = 'h2';
    }
  
    // Loop through the projects array and create an article for each project
    projects.forEach(project => {
      // Validate project data
      if (!project.title || !project.description) {
        console.warn('Skipping project due to missing title or description:', project);
        return;
      }
  
      // Create an <article> element
      const article = document.createElement('article');
  
      // Create a dynamic heading element
      const heading = document.createElement(headingLevel);
      heading.textContent = project.title;
  
      // Create an image element if an image URL is provided
      const img = document.createElement('img');
      if (project.image) {
        img.src = project.image;
        img.alt = project.title;
      } else {
        img.alt = 'No image available';
        img.style.display = 'none'; // Hide the image if missing
      }
  
      // Create a paragraph for the description
      const description = document.createElement('p');
      description.textContent = project.description;
  
      // Append elements to the article
      article.appendChild(heading);
      article.appendChild(img);
      article.appendChild(description);
  
      // Append the article to the container
      containerElement.appendChild(article);
    });
  }