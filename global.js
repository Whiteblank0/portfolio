console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  // Select multiple elements within the given context
  return Array.from(context.querySelectorAll(selector));
}

// // Get all nav links
// const navLinks = $$("nav a");

// // Find the current link and add a 'current' class
// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname
// );

// if (currentLink) {
//   currentLink.classList.add('current');
// }

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'cv/', title: 'CV' },
]

// Detect if we are on the home page
const ARE_WE_HOME = document.documentElement.classList.contains('home');

// Create the <nav> element
let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;
  
  // Adjust the URL for non-home pages
  url = !ARE_WE_HOME && !url.startsWith('http') ? '../' + url : url;

  // Create the <a> element
  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  // Highlight the current page
  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
  );

  // Open external links in a new tab
  a.toggleAttribute('target', a.host !== location.host);

  // Append the link to <nav>
  nav.append(a);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select id="theme-switcher">
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const themeSwitcher = document.getElementById('theme-switcher');

function updateColorScheme(value) {
  document.documentElement.style.setProperty('color-scheme', value);
  localStorage.setItem('color-scheme', value);
}

function getOSColorScheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light';
}

// Update "Automatic" label based on OS color scheme
const automaticOption = themeSwitcher.querySelector('option[value="light dark"]');
automaticOption.textContent = `Automatic (${getOSColorScheme()})`;

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  automaticOption.textContent = `Automatic (${getOSColorScheme()})`;
});

// Restore saved preference or default to "Automatic"
const savedScheme = localStorage.getItem('color-scheme') || 'light dark';
themeSwitcher.value = savedScheme;
updateColorScheme(savedScheme);

// Add event listener for dropdown changes
themeSwitcher.addEventListener('change', (event) => {
  const selectedValue = event.target.value;
  updateColorScheme(selectedValue);
});

// Try to get the form element (in case this script runs on pages without a form)
const form = document.querySelector('form[action^="mailto"]');

form?.addEventListener('submit', function (event) {
  // Stop the form from submitting the default way
  event.preventDefault();

  // Create a FormData object from the form
  const data = new FormData(form);
  
  // Build the query parameters (subject=...&body=...)
  let params = [];

  for (let [name, value] of data) {
    // Encode both the key and the value to avoid special character issues
    const encodedName = encodeURIComponent(name);
    const encodedValue = encodeURIComponent(value);
    params.push(`${encodedName}=${encodedValue}`);
  }

  // Join the parameters with &
  const queryString = params.join('&');

  // mailto URL = form.action + "?" + queryString
  const url = form.action + '?' + queryString;

  // Navigate to this URL, which opens the mail client
  location.href = url;
});

export async function fetchJSON(url) {
  try {
      // Fetch the JSON file from the given URL
      const response = await fetch(url);

      // Log the response object to the console
      console.log('Response Object:', response);

      // Check if the request was successful
      if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      // Parse the JSON data
      const data = await response.json();
      console.log('Fetched Data:', data); // Debugging: Log data to the console

      return data;
  } catch (error) {
      console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  // Ensure the containerElement is valid
  if (!containerElement || !(containerElement instanceof HTMLElement)) {
      console.error('Invalid containerElement provided');
      return;
  }

  // Validate the headingLevel to ensure it's an appropriate heading tag
  const validHeadingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  if (!validHeadingLevels.includes(headingLevel)) {
      console.warn(`Invalid headingLevel "${headingLevel}", defaulting to "h2".`);
      headingLevel = 'h2';
  }

  // Clear existing content to prevent duplication
  containerElement.innerHTML = '';

  // Loop through the projects array and create an article for each project
  projects.forEach(project => {
      // Validate project data
      if (!project.title || !project.description) {
          console.warn('Skipping project due to missing title or description:', project);
          return;
      }

      // Create an <article> element
      const article = document.createElement('article');

      // Create dynamic heading
      const heading = document.createElement(headingLevel);
      heading.textContent = project.title;

      // Create an image element if an image URL is provided
      const img = document.createElement('img');
      if (project.image) {
          img.src = project.image;
          img.alt = project.title;
      } else {
          img.alt = 'No image available'; // Fallback for missing images
          img.style.display = 'none'; // Hide image if missing
      }

      // Create a paragraph for the description
      const description = document.createElement('p');
      description.textContent = project.description;

      // Append elements to the article
      article.appendChild(heading);
      article.appendChild(img);
      article.appendChild(description);

      // Append the article to the container
      containerElement.appendChild(article);
  });
}

export async function fetchGitHubData(username) {
  // fetchJSON returns a Promise that resolves to the parsed JSON data.
  return fetchJSON(`https://api.github.com/users/Whiteblank0`);
}