// Global variables
let data = [];
let commits = [];
let filteredCommits = []; // Define the missing variable
let brushSelection = null; // Global variable to store the current brush selection (null if none)
let selectedCommits = [];
let commitProgress = 100;
let timeScale; // Will be initialized after data is loaded
let commitMaxTime; // Will be initialized after data is loaded

function processCommits() {
  commits = d3.groups(data, d => d.commit)
    .map(([commit, lines]) => {
      // Use the first line to extract commit-level data
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      
      // Build a commit summary object
      let ret = {
        id: commit,
        url: 'https://github.com/Whiteblank0/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      // Add the original line data as a hidden property
      Object.defineProperty(ret, 'lines', {
        value: lines,
        writable: true,
        configurable: true,
        enumerable: false
      });

      return ret;
    });
    
  // Initialize timeScale after commits are processed
  timeScale = d3.scaleTime()
    .domain([d3.min(commits, d => d.datetime), d3.max(commits, d => d.datetime)])
    .range([0, 100]);
    
  // Initialize commitMaxTime
  commitMaxTime = timeScale.invert(commitProgress);
  
  // Initialize filteredCommits
  filterCommitsByTime();
}

function displayStats() {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  const numFiles = d3.group(data, d => d.file).size;
  dl.append('dt').text('Number of files');
  dl.append('dd').text(numFiles);

  const fileLengths = d3.rollups(
    data,
    v => d3.max(v, d => d.line),
    d => d.file
  );

  const maxFileLength = d3.max(fileLengths, d => d[1]);
  dl.append('dt').html('Max file length (lines)');
  dl.append('dd').text(maxFileLength);

  const avgFileLength = d3.mean(fileLengths, d => d[1]);
  dl.append('dt').html('Average file length (lines)');
  dl.append('dd').text(avgFileLength.toFixed(1));

  const workByPeriod = d3.rollups(
    data,
    v => v.length,
    d => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' })
  );
  const maxPeriod = d3.greatest(workByPeriod, d => d[1])?.[0];
  dl.append('dt').html('Busiest time of day');
  dl.append('dd').text(maxPeriod);
}

async function loadData() {
  data = await d3.csv('loc.csv', row => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime)
  }));

  // Process commits (populating the global "commits" array)
  processCommits();
  
  displayStats();
  return commits;
}

function createScatterplot() {
  // Define dimensions and margins
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  // Create the SVG container
  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('id', 'scatter-svg')
    .style('overflow', 'visible');

  // Add gridlines container
  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  // Add x-axis container
  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usableArea.bottom})`);

  // Add y-axis container
  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  // Add dots container
  svg.append('g').attr('class', 'dots');

  // Initial update with filtered data
  updateScatterplot();
}

function updateScatterplot() {
  // Define dimensions and margins
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#scatter-svg');
  
  // If SVG doesn't exist, exit early (will be created by createScatterplot)
  if (svg.empty()) return;

  // Update scales based on the filtered data
  const xScale = d3.scaleTime()
    .domain(d3.extent(filteredCommits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  // Update gridlines
  const gridlines = svg.select('.gridlines');
  gridlines.call(
    d3.axisLeft(yScale)
      .tickFormat('')
      .tickSize(-usableArea.width)
  );
  gridlines.selectAll('.tick line')
    .attr('stroke', d => (d >= 6 && d <= 18) ? '#ff7f0e' : '#1f77b4');

  // Update axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');
    
  svg.select('.x-axis').call(xAxis);
  svg.select('.y-axis').call(yAxis);

  // Create the radius scale based on filtered commits
  const [minLines, maxLines] = d3.extent(filteredCommits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]);

  // Sort commits (largest dots first so that smaller dots appear on top)
  const sortedCommits = d3.sort(filteredCommits, (a, b) => b.totalLines - a.totalLines);
  
  // Update dots
  const dots = svg.select('.dots');
  
  // Join pattern for updating circles
  dots.selectAll('circle')
    .data(sortedCommits, d => d.id) // Use id as key for stable updates
    .join(
      enter => enter.append('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', 0) // Start with radius 0 for animation
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .call(enter => enter.transition().duration(500)
          .attr('r', d => rScale(d.totalLines))), // Animate to full size
          
      update => update
        .call(update => update.transition().duration(500)
          .attr('cx', d => xScale(d.datetime))
          .attr('cy', d => yScale(d.hourFrac))
          .attr('r', d => rScale(d.totalLines))),
          
      exit => exit
        .call(exit => exit.transition().duration(500)
          .attr('r', 0) // Shrink to radius 0
          .remove())
    )
    .on('mouseenter', function(event, d) {
      d3.select(this)
        .style('fill-opacity', 1)
        .classed('selected', isCommitSelected(d));
      updateTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', function(event, d) {
      d3.select(this)
        .style('fill-opacity', 0.7)
        .classed('selected', isCommitSelected(d));
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });

  // Create and attach the brush
  const brush = d3.brush().on('start brush end', brushed);
  svg.call(brush);
  
  // Raise dots so that tooltips remain accessible
  svg.selectAll('.dots, .overlay ~ *').raise();
}

// Helper function to determine if a commit is selected
function isCommitSelected(commit) {
  return selectedCommits.includes(commit);
}

// Update selected commits when brush changes
function brushed(evt) {
  brushSelection = evt.selection;
  if (!brushSelection) {
    selectedCommits = [];
  } else {
    // Get current scales from the visualization
    const svg = d3.select('#scatter-svg');
    const width = parseInt(svg.attr('viewBox').split(' ')[2]);
    const height = parseInt(svg.attr('viewBox').split(' ')[3]);
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
      top: margin.top,
      right: width - margin.right,
      bottom: height - margin.bottom,
      left: margin.left,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
    };
    
    const xScale = d3.scaleTime()
      .domain(d3.extent(filteredCommits, d => d.datetime))
      .range([usableArea.left, usableArea.right])
      .nice();

    const yScale = d3.scaleLinear()
      .domain([0, 24])
      .range([usableArea.bottom, usableArea.top]);
      
    selectedCommits = filteredCommits.filter(commit => {
      let min = { x: brushSelection[0][0], y: brushSelection[0][1] };
      let max = { x: brushSelection[1][0], y: brushSelection[1][1] };
      let x = xScale(commit.datetime);
      let y = yScale(commit.hourFrac);
      return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
    });
  }
  
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}

// Update selection styling
function updateSelection() {
  d3.select('#scatter-svg').selectAll('circle')
    .classed('selected', d => isCommitSelected(d));
}

// Update the selection count display
function updateSelectionCount() {
  const countElement = document.getElementById('selection-count');
  countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
  return selectedCommits;
}

// Update the language breakdown based on selection
function updateLanguageBreakdown() {
  const container = document.getElementById('language-breakdown');
  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  const lines = selectedCommits.flatMap(d => d.lines || []);
  if (lines.length === 0) return;
  
  const breakdown = d3.rollup(lines, v => v.length, d => d.type);
  container.innerHTML = '';
  
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `<dt>${language}</dt><dd>${count} lines (${formatted})</dd>`;
  }
  
  return breakdown;
}

// Global tooltip functions
function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  if (!commit || Object.keys(commit).length === 0) {
    link.textContent = '';
    link.href = '';
    date.textContent = '';
    return;
  }
  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

// Time-slider related functions
function updateTimeDisplay() {
  const timeSlider = document.getElementById('timeSlider');
  commitProgress = Number(timeSlider.value);
  
  // Make sure timeScale is initialized
  if (!timeScale) return;
  
  // Update the display of the selected time
  const selectedTime = d3.select('#selectedTime');
  selectedTime.textContent = timeScale.invert(commitProgress).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short"
  });
  
  // Set commitMaxTime from the timeScale
  commitMaxTime = timeScale.invert(commitProgress);
  
  // Filter commits and update scatterplot
  filterCommitsByTime();
  updateScatterplot();
}

function filterCommitsByTime() {
  // Make sure commits and commitMaxTime are initialized
  if (!commits || !commitMaxTime) {
    filteredCommits = [];
    return;
  }
  
  filteredCommits = commits.filter(commit => commit.datetime <= commitMaxTime);
}

// Wait for the DOM to load, then load data and create the scatterplot
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  createScatterplot();
  
  // Set up time slider event listener
  const timeSlider = document.getElementById('timeSlider');
  if (timeSlider) {
    timeSlider.addEventListener('input', updateTimeDisplay);
    // Initialize display
    updateTimeDisplay();
  }
});