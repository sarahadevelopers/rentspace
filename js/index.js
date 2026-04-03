// Dynamic year
document.getElementById('year').textContent = new Date().getFullYear();

// ========== SPLASH SCREEN ==========
function hideSplash() {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => {
        splash.style.display = 'none';
      }, 800);
    }
  }, 2200);
}

// ========== DYNAMIC GREETING ==========
function updateGreeting() {
  const hour = new Date().getHours();
  // Optional: update a greeting element if you add one
}

// ========== HAMBURGER MENU WITH OVERLAY ==========
const hamburger = document.getElementById('hamburger');
const navMenu = document.querySelector('.nav-links');
const menuOverlay = document.getElementById('menuOverlay');

function closeMenu() {
  if (navMenu) navMenu.classList.remove('active');
  if (hamburger) hamburger.classList.remove('active');
  if (menuOverlay) menuOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

function openMenu() {
  if (navMenu) navMenu.classList.add('active');
  if (hamburger) hamburger.classList.add('active');
  if (menuOverlay) menuOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

if (hamburger) {
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (navMenu && navMenu.classList.contains('active')) {
      closeMenu();
    } else {
      openMenu();
    }
  });
}

if (menuOverlay) {
  menuOverlay.addEventListener('click', closeMenu);
}

// Close menu when clicking a link
if (navMenu) {
  const navLinks = navMenu.querySelectorAll('a');
  navLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}

// Close menu on window resize
window.addEventListener('resize', () => {
  if (window.innerWidth > 768 && navMenu && navMenu.classList.contains('active')) {
    closeMenu();
  }
});

// ========== MOBILE DROPDOWNS (ONLY ON MOBILE) ==========
function initMobileDropdowns() {
  if (window.innerWidth > 768) return;
  
  const dropdowns = document.querySelectorAll('.dropdown');
  dropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.dropdown-trigger');
    const menu = dropdown.querySelector('.dropdown-menu');
    if (trigger && menu) {
      const newTrigger = trigger.cloneNode(true);
      trigger.parentNode.replaceChild(newTrigger, trigger);
      
      newTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdown.classList.toggle('open');
        menu.classList.toggle('open');
      });
    }
  });
}

// ========== LOAD FEATURED PROPERTIES ==========
async function loadFeaturedProperties() {
  try {
    const response = await fetch('/data/properties.json');
    const properties = await response.json();
    
    const featured = properties.filter(p => p.isFeatured).slice(0, 4);
    
    const featuredScroll = document.getElementById('featuredScroll');
    if (featuredScroll && featured.length > 0) {
      featuredScroll.innerHTML = featured.map(prop => `
        <a href="/property/${prop.slug}.html" class="featured-card">
          <img src="${prop.images?.[0] || '/images/placeholder.jpg'}" alt="${prop.title}">
          <div class="featured-info">
            <h4>${prop.title}</h4>
            <p>${prop.estate} · KES ${prop.price.toLocaleString()}/mo</p>
          </div>
        </a>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading featured properties:', error);
  }
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', () => {
  updateGreeting();
  loadFeaturedProperties();
  hideSplash();
  initMobileDropdowns();
});

// Re-initialize dropdowns on resize
window.addEventListener('resize', initMobileDropdowns);