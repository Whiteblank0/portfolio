let data = [];
let commits = [];

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
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
});

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

  // Draw the dots (render these after the axes to ensure they appear above the axes if needed)
  const dots = svg.append('g').attr('class', 'dots');
  dots.selectAll('circle')
    .data(commits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', 5)
    .attr('fill', 'steelblue')
    .on('mouseenter', (event, commit) => {
      updateTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', () => {
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });
}

// Ensure the DOM is loaded before executing the script
document.addEventListener('DOMContentLoaded', () => {
  loadData().then((commits) => {
    console.log('Commits data:', commits);
    createScatterplot(commits);
  });
});

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