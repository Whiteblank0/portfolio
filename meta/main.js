let data = [];
let commits = [];

async function loadData() {
  data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  processCommits();
  console.log(commits);
}

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

