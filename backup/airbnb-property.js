// js/airbnb-property.js
// Dynamic interactions for Airbnb property pages

document.addEventListener('DOMContentLoaded', function() {
  initMobileMenu();
  initMobileDropdowns();
  initGallery();
  trackInteractions();
});

function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.querySelector('.nav-links');
  const menuOverlay = document.getElementById('menuOverlay');
  
  if (!hamburger || !navMenu) return;
  
  function closeMenu() {
    navMenu.classList.remove('active');
    hamburger.classList.remove('active');
    if (menuOverlay) menuOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  
  function openMenu() {
    navMenu.classList.add('active');
    hamburger.classList.add('active');
    if (menuOverlay) menuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (navMenu.classList.contains('active')) {
      closeMenu();
    } else {
      openMenu();
    }
  });
  
  if (menuOverlay) {
    menuOverlay.addEventListener('click', closeMenu);
  }
  
  const navLinks = navMenu.querySelectorAll('a');
  navLinks.forEach(link => link.addEventListener('click', closeMenu));
}

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

function initGallery() {
  const gallery = document.getElementById('galleryStage');
  const counter = document.getElementById('currentIndex');
  const items = document.querySelectorAll('.gallery-item');
  
  if (gallery && counter && items.length) {
    const total = items.length;
    document.getElementById('totalCount').textContent = total;
    
    function updateCounter() {
      const scrollLeft = gallery.scrollLeft;
      const itemWidth = items[0]?.offsetWidth + 12 || 0;
      const activeIndex = Math.min(Math.round(scrollLeft / itemWidth) + 1, total);
      counter.textContent = activeIndex;
    }
    
    gallery.addEventListener('scroll', updateCounter);
    updateCounter();
  }
}

function trackInteractions() {
  const buttons = document.querySelectorAll('.sticky-book-btn, .btn-concierge, .nav-cta');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      console.log('[Analytics] Airbnb booking interaction');
    });
  });
}

window.addEventListener('resize', initMobileDropdowns);