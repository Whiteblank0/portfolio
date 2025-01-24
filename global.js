console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  // Select multiple elements within the given context
  return Array.from(context.querySelectorAll(selector));
}

// Get all nav links
const navLinks = $$("nav a");

// Find the current link and add a 'current' class
let currentLink = navLinks.find(
  (a) => a.host === location.host && a.pathname === location.pathname
);

if (currentLink) {
  currentLink.classList.add('current');
}