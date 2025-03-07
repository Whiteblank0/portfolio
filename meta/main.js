let data = [];
let commits = [];
let selectedCommits = [];
let commitProgress = 100; // Start showing all commits
let timeScale = d3.scaleTime([d3.min(commits, d => d.datetime), d3.max(commits, d => d.datetime)], [0, 100]);
let commitMaxTime = timeScale.invert(commitProgress);
let xScale, yScale, rScale; // Move scales to global scope

function isCommitSelected(commit) {
  return selectedCommits.includes(commit);
}

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

function filterCommitsByTime() {
  return commits.filter(commit => commit.datetime <= commitMaxTime);
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
  return commits;
}

function createTimeSlider() {
  // Instead of creating a new slider, select the existing one.
  const timeSlider = document.getElementById('time-slider');
  timeSlider.addEventListener('input', updateTimeDisplay);
  
  // Initialize the time display using the slider value
  const timeDisplay = document.getElementById('selectedTime');
  timeDisplay.textContent = timeScale(commitProgress).toLocaleString({
    dateStyle: "long", 
    timeStyle: "short"
  });
}

function updateTimeDisplay() {
  const timeSlider = document.getElementById('time-slider');
  commitProgress = Number(timeSlider.value);
  
  const selectedTime = d3.select('#selectedTime');
  selectedTime.text(timeScale(commitProgress).toLocaleString('en', {
    dateStyle: "long", 
    timeStyle: "short"
  }));
  
  const filteredCommits = filterCommitsByTime();
  updateScatterplot(filteredCommits);
}

function updateScatterplot(filteredCommits) {
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

  // Remove existing SVG if any
  d3.select('#chart svg').remove();

  // Create the SVG container
  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // Create scales
  xScale = d3.scaleTime()
    .domain(d3.extent(filteredCommits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear()
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

  // Create a radius scale for commit dot sizes
  const [minLines, maxLines] = d3.extent(filteredCommits, d => d.totalLines);
  rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]);

  // Sort commits (largest dots first so that smaller dots appear on top)
  const sortedCommits = d3.sort(filteredCommits, (a, b) => b.totalLines - a.totalLines);
  const dots = svg.append('g').attr('class', 'dots');
  dots.selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    // Add CSS variable for transition duration
    .style('--r', d => rScale(d.totalLines))
    .on('mouseenter', function(event, d) {
      d3.select(event.currentTarget)
        .style('fill-opacity', 1)
        .classed('selected', isCommitSelected(d));
      updateTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', function(event, d) {
      d3.select(event.currentTarget)
        .style('fill-opacity', 0.7)
        .classed('selected', isCommitSelected(d));
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });

  function updateSelection() {
    dots.selectAll('circle')
      .classed('selected', d => isCommitSelected(d));
  }

  function updateSelectionCount() {
    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
  }

  function updateLanguageBreakdown() {
    const container = document.getElementById('language-breakdown');
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const lines = selectedCommits.flatMap(d => d.lines);
    const breakdown = d3.rollup(lines, v => v.length, d => d.type);
    container.innerHTML = '';
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
      container.innerHTML += `<dt>${language}</dt><dd>${count} lines</dd><dd>(${formatted})</dd>`;
    }
    return breakdown;
  }

  function brushed(event) {
    const brushSelection = event.selection;
    selectedCommits = !brushSelection
      ? []
      : filteredCommits.filter((commit) => {
          const min = { x: brushSelection[0][0], y: brushSelection[0][1] };
          const max = { x: brushSelection[1][0], y: brushSelection[1][1] };
          const x = xScale(commit.datetime);
          const y = yScale(commit.hourFrac);
  
          return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
        });
    
    updateSelection();
    updateSelectionCount();
    updateLanguageBreakdown();
  }

  // Create and attach the brush
  const brush = d3.brush().on('start brush end', brushed);
  svg.call(brush);
  // Raise dots so that tooltips remain accessible
  svg.selectAll('.dots, .overlay ~ *').raise();
}

// Global tooltip functions (they don't depend on xScale/yScale)
function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  if (Object.keys(commit).length === 0) {
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

// Wait for the DOM to load, then load data and create the scatterplot
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  const filteredCommits = filterCommitsByTime();
  createTimeSlider();
  updateScatterplot(filteredCommits);
});