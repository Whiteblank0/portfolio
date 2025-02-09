import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Global variables
let projects = [];
let query = '';
let selectedIndex = -1;
let projectsContainer;

// Fetch projects and initialize everything on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  // Load data
  projects = await fetchJSON('../lib/projects.json');

  // Select container for project listings
  projectsContainer = document.querySelector('.projects');
  if (!projectsContainer) {
    console.error('No element with class "projects" found.');
    return;
  }

  // Render the full list of projects initially
  renderProjects(projects, projectsContainer, 'h2');

  // Update the .projects-title with project count
  const projectsTitle = document.querySelector('.projects-title');
  if (projectsTitle) {
    projectsTitle.textContent = `${projects.length} Projects`;
  }

  // Set up the search listener for instant filtering
  const searchInput = document.querySelector('.searchBar');
  searchInput.addEventListener('input', handleSearch);

  // Finally, render the pie chart with all projects initially
  renderPieChart(projects);
});

/**
 * Combine both search and wedge filtering to get the final filtered set.
 */
function getFilteredProjects() {
  // 1) Filter by search query in project titles
  let titleFiltered = projects.filter((p) =>
    p.title.toLowerCase().includes(query.toLowerCase()) ||
    p.description.toLowerCase().includes(query.toLowerCase())
  );

  // 2) Filter by selected wedge/year (if any wedge is selected)
  if (selectedIndex === -1) {
    // -1 => no wedge selected => no further filtering needed
    return titleFiltered;
  } else {
    // Some wedge is selected => filter by its year
    let wedgeYear = currentPieData[selectedIndex].label;
    return titleFiltered.filter((p) => p.year === wedgeYear);
  }
}

/**
 * Handle the "input" event from the search bar: update query and re-filter.
 */
function handleSearch(event) {
  query = event.target.value; // store the new search text
  let filtered = getFilteredProjects();

  // Update project listing
  renderProjects(filtered, projectsContainer, 'h2');
  // Update pie chart & legend to reflect new data
  renderPieChart(filtered);
}

/**
 * Current data used for the pie chart (so we can read labels in the click handler).
 * We’ll store it at module-scope so the wedge click can see it.
 */
let currentPieData = [];

/**
 * Renders the pie chart and legend from the given set of projects.
 */
function renderPieChart(projectsGiven) {
  // 1. Group data by year => array of [year, count]
  let rolledData = d3.rollups(
    projectsGiven,
    (group) => group.length,
    (d) => d.year
  );

  // 2. Convert into { value, label } objects
  currentPieData = rolledData.map(([year, count]) => ({
    value: count,
    label: year,
  }));

  // 3. Clear old paths & legend items
  let svg = d3.select('svg');
  svg.selectAll('*').remove();  // remove old content

  let legend = d3.select('.legend');
  legend.selectAll('*').remove(); // remove old legend items

  // 4. Pie/arc generation
  let sliceGenerator = d3.pie().value((d) => d.value);
  let arcData = sliceGenerator(currentPieData);

  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let arcs = arcData.map((d) => arcGenerator(d));

  // 5. Color scale
  let colorScale = d3.scaleOrdinal(d3.schemeTableau10);

  // 6. Append a <g> to center (optional, if using viewBox transformation)
  let g = svg.append('g');
  
  // 7. Draw arcs
  arcs.forEach((arcPath, i) => {
    // Append each wedge
    g.append('path')
      .attr('d', arcPath)
      .attr('fill', colorScale(i))
      // If it is the currently selected wedge, add "selected" class
      .attr('class', i === selectedIndex ? 'selected' : null)
      .on('click', () => {
        // Toggle selection
        selectedIndex = (selectedIndex === i) ? -1 : i;

        // After toggling, re-filter projects and re-render everything
        let filteredProjects = getFilteredProjects();
        renderProjects(filteredProjects, projectsContainer, 'h2');
        renderPieChart(filteredProjects);
      });
  });

  // 8. Create legend items
  currentPieData.forEach((d, i) => {
    legend
      .append('li')
      .attr('style', `--color:${colorScale(i)}`)
      // If it's selected wedge, add "selected" class
      .attr('class', i === selectedIndex ? 'selected' : null)
      .html(`
        <span class="swatch"></span>
        ${d.label} <em>(${d.value})</em>
      `)
      .on('click', () => {
        // Same logic as wedge
        selectedIndex = (selectedIndex === i) ? -1 : i;

        let filteredProjects = getFilteredProjects();
        renderProjects(filteredProjects, projectsContainer, 'h2');
        renderPieChart(filteredProjects);
      });
  });
}