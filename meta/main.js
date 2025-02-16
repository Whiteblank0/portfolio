let data = [];
let commits = [];
// Global variable to store the current brush selection (null if none)
let brushSelection = null;

function processCommits() {
  commits = d3.groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      // Use the first line to extract commit-level data
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      
      // Build a commit summary object
      let ret = {
        id: commit,
        url: 'https://github.com/Whiteblank0/portfolio/commit/' + commit, // Replace YOUR_REPO accordingly
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      // Add the original line data as a hidden property using Object.defineProperty.
      Object.defineProperty(ret, 'lines', {
        value: lines,
        writable: true,     // Allow changes if needed
        configurable: true, // Allow the property to be reconfigured later
        enumerable: false   // Hide it from standard enumeration
      });

      return ret;
    });
}

function displayStats() {
  // Process commits first (this populates the global "commits" array)
  processCommits();

  // Create the <dl> element with the class 'stats'
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // Total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // Total commits
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  // Number of distinct files in the codebase
  const numFiles = d3.group(data, d => d.file).size;
  dl.append('dt').text('Number of files');
  dl.append('dd').text(numFiles);

  // Compute file lengths for each file using d3.rollups:
  // Each group returns the maximum line number, which we assume represents the file length.
  const fileLengths = d3.rollups(
    data,
    v => d3.max(v, d => d.line),
    d => d.file
  );

  // Maximum file length (in lines)
  const maxFileLength = d3.max(fileLengths, d => d[1]);
  dl.append('dt').html('Max file length (lines)');
  dl.append('dd').text(maxFileLength);

  // Average file length (in lines)
  const avgFileLength = d3.mean(fileLengths, d => d[1]);
  dl.append('dt').html('Average file length (lines)');
  dl.append('dd').text(avgFileLength.toFixed(1));

  // Determine the time of day with the most work done.
  // Here we group by a short day period (e.g., AM/PM) extracted from the datetime.
  const workByPeriod = d3.rollups(
    data,
    v => v.length,
    d => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' })
  );
  const maxPeriod = d3.greatest(workByPeriod, d => d[1])?.[0];
  dl.append('dt').html('Busiest time of day');
  dl.append('dd').text(maxPeriod);
}

// Ensure that displayStats is called after the data is loaded:
async function loadData() {
  data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime)
  }));

  // Now display the stats using our computed data.
  displayStats();
  
  // Return commits so the caller can use them
  return commits;
}

// Function to create the scatterplot
function createScatterplot(commits) {
  // Define dimensions
  const width = 1000;
  const height = 600;

  // Define margins and usable area
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
    .style('overflow', 'visible');

  // Create scales
  const xScale = d3.scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  // Add gridlines BEFORE the axes
  const gridlines = svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(
    d3.axisLeft(yScale)
      .tickFormat('')
      .tickSize(-usableArea.width)
  );

  gridlines.selectAll('.tick line')
  .attr('stroke', d => {
    // Assuming d is a numeric hour from 0 to 24:
    // Daytime: 06:00-18:00 (orange), Night: otherwise (blue)
    if (d >= 6 && d <= 18) {
      return '#ff7f0e'; // Orangish for daytime
    } else {
      return '#1f77b4'; // Bluer for night times
    }
  });

  // Create and add the axes
  const xAxis = d3.axisBottom(xScale);
  // Format the Y axis ticks as times
  const yAxis = d3.axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  // Add X axis
  svg.append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  // Add Y axis
  svg.append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  // Calculate the extent of totalLines across commits
  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);

  // Create a radius scale using a square root scale for proper area perception:
  const rScale = d3.scaleSqrt()
  .domain([minLines, maxLines])
  .range([2, 30]);  // Experiment with these values to find the best visual range

  // Sort commits by total lines (descending order)
  const sortedCommits = d3.sort(commits, (a, b) => b.totalLines - a.totalLines);
  const dots = svg.append('g').attr('class', 'dots');
  dots.selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', function (event, d, i) {
      d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
      updateTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', function () {
      d3.select(event.currentTarget).style('fill-opacity', 0.7); // Restore transparency
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });

    // Create and attach the brush
    const brush = d3.brush().on('start brush end', brushed);
    d3.select(svg.node()).call(brush);

    // Raise the dots (and all elements after the overlay) so that tooltips work:
    d3.select(svg.node()).selectAll('.dots, .overlay ~ *').raise();
}

function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');

  // If the commit object is empty, clear the content (or simply return)
  if (Object.keys(commit).length === 0) {
    link.textContent = '';
    link.href = '';
    date.textContent = '';
    return;
  }

  // Update the tooltip content based on the commit data
  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

// Called when the brush is moved or finished
function brushed(event) {
  brushSelection = event.selection; // An array of two points: [[x0, y0], [x1, y1]]
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}

// Returns true if a commit's position is within the brush selection
function isCommitSelected(commit) {
  if (!brushSelection) return false;

  const [x0, y0] = brushSelection[0];
  const [x1, y1] = brushSelection[1];

  // Map commit data to x and y coordinates using our scales:
  const cx = xScale(commit.datetime);
  const cy = yScale(commit.hourFrac);

  return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
}

// Updates the visual state of dots by toggling the "selected" class
function updateSelection() {
  d3.selectAll('circle')
    .classed('selected', d => isCommitSelected(d));
}

// Updates a paragraph element with the count of selected commits
function updateSelectionCount() {
  const selectedCommits = brushSelection ? commits.filter(isCommitSelected) : [];
  const countElement = document.getElementById('selection-count');
  countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
  return selectedCommits;
}

// Updates the language breakdown stats based on the selected commits
function updateLanguageBreakdown() {
  const selectedCommits = brushSelection ? commits.filter(isCommitSelected) : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  // Use the selected commits if any, otherwise fallback to all commits
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  // Gather all line objects from the selected commits
  const lines = requiredCommits.flatMap(d => d.lines);

  // Use d3.rollup to count the number of lines per language
  const breakdown = d3.rollup(
    lines,
    v => v.length,
    d => d.type
  );

  // Clear the container and update with new info
  container.innerHTML = '';
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
  return breakdown;
}

// Wait for the DOM to load, then load data and create the scatterplot
document.addEventListener('DOMContentLoaded', async () => {
  const commitsData = await loadData();
  console.log('Commits data:', commitsData);
  createScatterplot(commits);
});