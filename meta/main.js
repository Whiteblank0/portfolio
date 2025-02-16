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
        url: 'https://github.com/YOUR_REPO/commit/' + commit, // Replace YOUR_REPO accordingly
        author,
        date,
        time,
        timezone,
        datetime,
        // Calculate hour fraction for time-of-day analysis (e.g., 2:30 PM becomes 14.5)
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        // Total number of lines modified in this commit
        totalLines: lines.length,
      };

      // Add the original line data as a hidden property using Object.defineProperty.
      // Setting enumerable: false ensures it doesn't clutter up the output when printed.
      Object.defineProperty(ret, 'lines', {
        value: lines,
        writable: true,     // Allow changes if needed
        configurable: true, // Allow the property to be reconfigured later
        enumerable: false   // Hide it from standard enumeration (e.g., console.log)
      });

      return ret;
    });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
});