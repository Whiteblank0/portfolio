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

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;
  
  // Adjust the URL for non-home pages
  url = !ARE_WE_HOME && !url.startsWith('http') ? '../' + url : url;

  // Create link and add it to nav
  nav.insertAdjacentHTML('beforeend', `<a href="${url}">${title}</a>`);
}