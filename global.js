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