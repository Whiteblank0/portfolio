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

let projects = await fetchJSON('../lib/projects.json');

let rolledData = d3.rollups(
  projects,
  (v) => v.length,
  (d) => d.year,
);

// New data array with more values
let data = rolledData.map(([year, count]) => {
  return { value: count, label: year };
});

// Generate pie slices using d3.pie()
let sliceGenerator = d3.pie().value((d) => d.value);
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

// Assume you have a color scale (colors) and data with {value, label}.
let legend = d3.select('.legend');

data.forEach((d, idx) => {
  legend
    .append('li')
    .attr('style', `--color: ${colors(idx)}`) // pass color to a CSS variable
    .html(`
      <span class="swatch"></span>
      ${d.label} <em>(${d.value})</em>
    `);
});

let query = '';

let searchInput = document.querySelector('.searchBar');

renderPieChart(projects);

searchInput.addEventListener('input', (event) => {
  let projectsContainer = document.querySelector('.projects');

  query = event.target.value.toLowerCase();

  let filteredProjects = projects
    .filter((project) => project.title.toLowerCase().includes(query)) // Title filter
    .filter((project) => selectedIndex === -1 || project.year === 
    data[selectedIndex].label); // Year filter

  // render updated projects!
  renderProjects(filteredProjects, projectsContainer, 'h2');

  // Re-render the pie chart and legend
  renderPieChart(filteredProjects);
});

// Refactor all plotting into one function
function renderPieChart(projectsGiven) {
  // 1. Group your data by year and count
  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );
  // 2. Convert into { value, label } form
  let data = rolledData.map(([year, count]) => ({
    value: count,
    label: year,
  }));

  // 3. Clear old paths and legend items
  let svg = d3.select('svg');
  svg.selectAll('path').remove();

  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  // 4. Set up pie chart arcs
  let sliceGenerator = d3.pie().value((d) => d.value);
  let arcData = sliceGenerator(data);
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let arcs = arcData.map((d) => arcGenerator(d));

  // 5. Define color scale
  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  // 6. Draw the paths (center them if necessary)
  //    Optionally, use a <g> transform to center.
  let g = svg
    .append('g')
    ;

  arcs.forEach((arc, idx) => {
    g
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(idx));
  });

  // 7. Create legend items
  data.forEach((d, idx) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(idx)}`)
      .html(`
        <span class="swatch"></span>
        ${d.label} <em>(${d.value})</em>
      `);
  });
}

let selectedIndex = -1;

arcs.forEach((arc, i) => {
  let svg = d3.select('svg');
  
  svg
    .append('path')
    .attr('d', arc)
    .attr('fill', colors(i))
    .on('click', () => {
      // Toggle selection
      selectedIndex = (selectedIndex === i) ? -1 : i;
      
      // Update classes on ALL wedges
      svg.selectAll('path')
         .attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : null));

      // Also update classes on the legend items
      legend.selectAll('li')
            .attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : null));

      // Filter / re-render the projects list based on which wedge is selected
      if (selectedIndex === -1) {
        // No selection = show all projects
        renderProjects(projects, projectsContainer, 'h2');
      } else {
        // Filter by the year for the selected wedge
        let { label } = data[selectedIndex]; 
        let filtered = projects.filter((p) => p.year === label);
        renderProjects(filtered, projectsContainer, 'h2');
      }
    });
});

legend
  .selectAll('li')
  .data(data) // or arcs
  .join('li')
  .attr('style', (d, i) => `--color:${colors(i)}`)
  .html((d) => `
    <span class="swatch"></span>
    ${d.label} <em>(${d.value})</em>
  `)
  .attr('class', (d, i) => (i === selectedIndex ? 'selected' : null)); // highlight if selected

  if (selectedIndex === -1) {
    // show all
    renderProjects(projects, projectsContainer, 'h2');
  } else {
    // show only the projects that match the clicked wedge’s year
    let chosenYear = data[selectedIndex].label;
    let filtered = projects.filter((p) => p.year === chosenYear);
    renderProjects(filtered, projectsContainer, 'h2');
  }