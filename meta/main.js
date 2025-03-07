let data = [];
let commits = [];
let selectedCommits = []; // Simplified as per step 0
let filteredCommits = []; // Added for filtering by time
let commitProgress = 100;
let xScale, yScale; // Making scales accessible across functions
let timeScale; // Will be initialized once data is loaded
let commitMaxTime; // Will be initialized once data is loaded

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
}

function displayStats() {
  // Process commits (populating the global "commits" array)
  processCommits();

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

  displayStats();
  
  // Initialize timeScale after data is loaded
  timeScale = d3.scaleTime()
    .domain([d3.min(commits, d => d.datetime), d3.max(commits, d => d.datetime)])
    .range([0, 100]);
    
  // Set initial commitMaxTime based on slider value (100%)
  commitMaxTime = timeScale.invert(commitProgress);
  
  // Initial filtering
  filterCommitsByTime();
  
  // Initialize time display
  updateTimeDisplay();
  
  return filteredCommits;
}

function filterCommitsByTime() {
  filteredCommits = commits.filter(commit => commit.datetime <= commitMaxTime);
}

function updateTimeDisplay() {
  const timeSlider = document.getElementById('timeSlider');
  commitProgress = Number(timeSlider.value);
  
  // Update commitMaxTime based on slider value
  commitMaxTime = timeScale.invert(commitProgress);
  
  // Update the display of the selected time
  const selectedTime = d3.select('#selectedTime');
  selectedTime.textContent = commitMaxTime.toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short"
  });
  
  // Filter commits and update the scatterplot
  filterCommitsByTime();
  updateScatterplot(filteredCommits);
}

function updateScatterplot(filteredCommits) {
  // Clear any existing SVG
  d3.select('#chart svg').remove();

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
    .style('overflow', 'visible');

  // Update scales based on the filtered data
  xScale = d3.scaleTime()
    .domain(d3.extent(filteredCommits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  // Add gridlines
  const gridlines = svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);
  
  gridlines.call(
    d3.axisLeft(yScale)
      .tickFormat('')
      .tickSize(-usableArea.width)
  );
  
  gridlines.selectAll('.tick line')
    .attr('stroke', d => (d >= 6 && d <= 18) ? '#ff7f0e' : '#1f77b4');

  // Create and add the axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');
  
  svg.append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);
  
  svg.append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  // Create dots container
  const dots = svg.append('g').attr('class', 'dots');

  // Create the radius scale based on filtered commits
  const [minLines, maxLines] = d3.extent(filteredCommits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]);

  // Create dots for each commit
  dots.selectAll('circle')
    .data(filteredCommits)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .style('--r', d => rScale(d.totalLines)) // For transition timing
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .classed('selected', d => isCommitSelected(d))
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
      updateTooltipVisibility(false);
    });

  // Add brush
  const brush = d3.brush()
    .on('start brush end', brushed);
  
  svg.append('g')
    .attr('class', 'brush')
    .call(brush);

  // Raise dots so they appear above the brush
  svg.selectAll('.dots').raise();
}

function isCommitSelected(commit) {
  return selectedCommits.includes(commit);
}

function updateSelection() {
  d3.selectAll('circle')
    .classed('selected', d => isCommitSelected(d));
}

function brushed(event) {
  const selection = event.selection;
  
  selectedCommits = !selection
    ? []
    : filteredCommits.filter(commit => {
        let min = { x: selection[0][0], y: selection[0][1] };
        let max = { x: selection[1][0], y: selection[1][1] };
        let x = xScale(commit.datetime);
        let y = yScale(commit.hourFrac);
        return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
      });
  
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}

function updateSelectionCount() {
  const countElement = document.getElementById('selection-count');
  countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
}

function updateLanguageBreakdown() {
  const container = document.getElementById('language-breakdown');
  container.innerHTML = '';
  
  if (selectedCommits.length === 0) {
    return;
  }
  
  const lines = selectedCommits.flatMap(d => d.lines);
  const breakdown = d3.rollup(lines, v => v.length, d => d.type);
  
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    
    const dt = document.createElement('dt');
    dt.textContent = language;
    container.appendChild(dt);
    
    const ddCount = document.createElement('dd');
    ddCount.textContent = count + ' lines';
    container.appendChild(ddCount);
    
    const ddPercentage = document.createElement('dd');
    ddPercentage.textContent = formatted;
    container.appendChild(ddPercentage);
  }
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

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  updateScatterplot(filteredCommits);
  
  // Add event listener for time slider
  const timeSlider = document.getElementById('timeSlider');
  timeSlider.addEventListener('input', updateTimeDisplay);
});