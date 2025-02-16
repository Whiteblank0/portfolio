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

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
});