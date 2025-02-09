import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

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

// New data array with more values
let data = [1, 2, 3, 4, 5, 5];

// Generate pie slices using d3.pie()
let sliceGenerator = d3.pie();
let arcData = sliceGenerator(data);

// Create the path data for each arc using your arcGenerator function
let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let arcs = arcData.map((d) => arcGenerator(d));

// Create an ordinal color scale using a predefined D3 scheme
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// Append a <path> element for each arc and assign it a color from the scale
arcs.forEach((arc, idx) => {
  d3.select('svg')
    .append('path')
    .attr('d', arc)
    .attr('fill', colors(idx));  // Use the scale function to pick a color
});