// js/property.js
// This file handles dynamic interactions on static property pages

// ========== DYNAMIC PATH HELPER ==========
const getBasePath = () => {
    // GitHub Pages
    if (window.location.hostname === 'sarahadevelopers.github.io') {
        return '/rentspace';
    }
    // Local development
    return '';
};
const basePath = getBasePath();

let allProperties = [];
let currentProperty = null;

// Get property slug from current URL (for static pages)
function getPropertySlugFromURL() {
  const path = window.location.pathname;
  const match = path.match(/\/property\/(.+)\.html$/);
  return match ? match[1] : null;
}

// ========== HAMBURGER MENU TOGGLE ==========
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.querySelector('.nav-links');
  const menuOverlay = document.getElementById('menuOverlay');
  
  if (!hamburger || !navMenu) {
    console.error('Menu elements not found');
    return;
  }
  
  // Force hide menu on page load (ensure it's closed)
  navMenu.classList.remove('active');
  if (menuOverlay) menuOverlay.classList.remove('active');
  hamburger.classList.remove('active');
  document.body.style.overflow = '';
  
  function closeMenu() {
    console.log('closeMenu called');
    navMenu.classList.remove('active');
    hamburger.classList.remove('active');
    if (menuOverlay) menuOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  
  function openMenu() {
    console.log('openMenu called');
    navMenu.classList.add('active');
    hamburger.classList.add('active');
    if (menuOverlay) menuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  
  function toggleMenu(e) {
    e.stopPropagation();
    if (navMenu.classList.contains('active')) {
      closeMenu();
    } else {
      openMenu();
    }
  }
  
  // Clean up existing listeners
  const newHamburger = hamburger.cloneNode(true);
  hamburger.parentNode.replaceChild(newHamburger, hamburger);
  
  // Add click listener
  newHamburger.addEventListener('click', toggleMenu);
  
  // Update reference
  window.hamburgerElement = newHamburger;
  
  // Overlay click
  if (menuOverlay) {
    const newOverlay = menuOverlay.cloneNode(true);
    menuOverlay.parentNode.replaceChild(newOverlay, menuOverlay);
    newOverlay.addEventListener('click', closeMenu);
    window.menuOverlayElement = newOverlay;
  }
  
  // Close when clicking a link
  const navLinks = navMenu.querySelectorAll('a');
  navLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });
  
  // Close on resize
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && navMenu.classList.contains('active')) {
      closeMenu();
    }
  });
}

// ========== MOBILE DROPDOWN TOGGLE ==========
function initMobileDropdowns() {
  const dropdowns = document.querySelectorAll('.dropdown');
  
  dropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.dropdown-trigger');
    const menu = dropdown.querySelector('.dropdown-menu');
    
    if (trigger && menu) {
      // Remove any existing listeners to avoid duplicates
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

// ========== GALLERY FUNCTIONALITY ==========
function initGallery() {
  const mainImg = document.getElementById('mainGalleryImg');
  const thumbs = document.querySelectorAll('.thumb');
  const prevBtn = document.getElementById('galleryPrevBtn');
  const nextBtn = document.getElementById('galleryNextBtn');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  
  if (!mainImg || thumbs.length === 0) return;
  
  let currentIndex = 0;
  
  function updateMainImage(index) {
    if (index < 0) index = 0;
    if (index >= thumbs.length) index = thumbs.length - 1;
    currentIndex = index;
    const newSrc = thumbs[currentIndex].querySelector('img').src;
    mainImg.src = newSrc;
    if (lightboxImg) lightboxImg.src = newSrc;
    
    thumbs.forEach(t => t.classList.remove('active'));
    thumbs[currentIndex].classList.add('active');
  }
  
  thumbs.forEach((thumb, i) => {
    thumb.addEventListener('click', () => updateMainImage(i));
  });
  
  if (prevBtn) prevBtn.addEventListener('click', () => updateMainImage(currentIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => updateMainImage(currentIndex + 1));
  
  if (mainImg && lightbox) {
    mainImg.addEventListener('click', () => {
      lightbox.classList.add('show');
      lightboxImg.src = mainImg.src;
    });
  }
  
  if (lightboxClose) lightboxClose.addEventListener('click', () => lightbox.classList.remove('show'));
  
  if (lightboxPrev) lightboxPrev.addEventListener('click', () => updateMainImage(currentIndex - 1));
  if (lightboxNext) lightboxNext.addEventListener('click', () => updateMainImage(currentIndex + 1));
  
  document.addEventListener('keydown', (e) => {
    if (lightbox && lightbox.classList.contains('show')) {
      if (e.key === 'ArrowLeft') updateMainImage(currentIndex - 1);
      if (e.key === 'ArrowRight') updateMainImage(currentIndex + 1);
      if (e.key === 'Escape') lightbox.classList.remove('show');
    }
  });
  
  // Set first thumbnail active
  if (thumbs.length > 0) {
    updateMainImage(0);
  }
}

// Smooth scroll to concierge section
function initSmoothScroll() {
  const inquireBtn = document.querySelector('.nav-inquire') || document.querySelector('.nav-cta');
  if (inquireBtn) {
    inquireBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const concierge = document.querySelector('.concierge-section');
      if (concierge) {
        concierge.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const contactSection = document.querySelector('.contact-section') || document.querySelector('.premium-footer');
        if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

// Lazy load images
function initLazyLoading() {
  const images = document.querySelectorAll('img[loading="lazy"]');
  if ('loading' in HTMLImageElement.prototype) {
    images.forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
    });
  } else {
    const lazyLoadObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
          }
          lazyLoadObserver.unobserve(img);
        }
      });
    });
    
    images.forEach(img => lazyLoadObserver.observe(img));
  }
}

// Track user interaction for analytics
function trackUserInteraction() {
  const buttons = document.querySelectorAll('.btn-concierge, .sticky-inquiry-btn, .sticky-call-btn, .nav-inquire, .nav-cta, .reveal-contact-btn, .whatsapp-inquiry-btn');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const action = button.classList.contains('btn-concierge') ? 'concierge' :
                     button.classList.contains('sticky-inquiry-btn') ? 'sticky-whatsapp' :
                     button.classList.contains('sticky-call-btn') ? 'sticky-call' :
                     button.classList.contains('nav-inquire') ? 'inquire' :
                     button.classList.contains('nav-cta') ? 'book-viewing' :
                     button.classList.contains('reveal-contact-btn') ? 'reveal-contact' : 'whatsapp-inquiry';
      console.log(`[Analytics] User clicked: ${action} - ${currentProperty?.title || 'unknown property'}`);
    });
  });
}

// Dynamic recommendations enhancement
async function loadMoreRecommendations(currentEstate, currentId) {
  try {
    const response = await fetch(`${basePath}/data/properties.json`);
    const properties = await response.json();
    const similar = properties
      .filter(p => p.estate === currentEstate && p.id !== currentId)
      .slice(0, 4);
    
    const recContainer = document.querySelector('.recommendation-cards');
    if (recContainer && similar.length > 0 && recContainer.children.length === 0) {
      similar.forEach(prop => {
        const card = document.createElement('a');
        card.href = `${basePath}/property/${prop.slug}.html`;
        card.className = 'rec-card';
        card.innerHTML = `
          <div class="rec-card-image">
            <img src="${prop.images?.[0] || `${basePath}/images/placeholder.jpg`}" alt="${prop.title}" loading="lazy">
          </div>
          <div class="rec-card-info">
            <h4>${prop.title}</h4>
            <p>${prop.estate} · KES ${prop.price.toLocaleString()} / mo</p>
          </div>
        `;
        recContainer.appendChild(card);
      });
    }
  } catch (error) {
    console.error('Error loading recommendations:', error);
  }
}

// Add micro-interactions
function addMicroInteractions() {
  const specItems = document.querySelectorAll('.spec-item');
  specItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
      item.style.transform = 'translateY(-2px)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.transform = 'translateY(0)';
    });
  });
  
  const galleryItems = document.querySelectorAll('.gallery-item');
  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      console.log('Open fullscreen for:', item.src);
    });
  });
}

// ========== CONTACT REVEAL FEATURE ==========
const PHONE_NUMBER = "+254723562484";
const PHONE_DISPLAY = "0723 562 484";

function addContactRevealFeature() {
  const priceTag = document.querySelector('.price-tag');
  if (!priceTag) return;
  
  if (document.querySelector('.contact-buttons-container')) return;
  
  const contactContainer = document.createElement('div');
  contactContainer.className = 'contact-buttons-container';
  
  const revealBtn = document.createElement('button');
  revealBtn.className = 'reveal-contact-btn';
  revealBtn.innerHTML = '<i class="fas fa-phone-alt"></i> Reveal Contact';
  
  const contactInfo = document.createElement('div');
  contactInfo.className = 'contact-info-revealed';
  
  const callLink = document.createElement('a');
  callLink.href = `tel:${PHONE_NUMBER}`;
  callLink.className = 'contact-call-btn';
  callLink.innerHTML = `<i class="fas fa-phone-alt"></i> Call ${PHONE_DISPLAY}`;
  
  const whatsappBtn = document.createElement('a');
  whatsappBtn.className = 'whatsapp-inquiry-btn';
  whatsappBtn.target = '_blank';
  whatsappBtn.innerHTML = `<i class="fab fa-whatsapp"></i> WhatsApp Inquiry`;
  
  function updateWhatsAppLink() {
    const title = document.querySelector('.property-title')?.textContent || 'Property';
    const estate = document.querySelector('.location-meta')?.textContent.replace(/[^\w\s]/g, '').trim() || 'Nairobi';
    const price = document.querySelector('.price-tag')?.textContent.replace('KES', '').replace('/month', '').trim() || '';
    const url = window.location.href;
    
    const message = `*RENTSPACE PROPERTY INQUIRY*%0A%0A` +
                    `*Property:* ${title}%0A` +
                    `*Location:* ${estate}, Nairobi%0A` +
                    `*Price:* KES ${price}%0A` +
                    `*Listing:* ${url}%0A%0A` +
                    `Hello, I'm interested in this property. Please share more details.`;
    
    whatsappBtn.href = `https://wa.me/${PHONE_NUMBER.replace(/[^0-9]/g, '')}?text=${message}`;
  }
  
  let isRevealed = false;
  revealBtn.addEventListener('click', () => {
    if (!isRevealed) {
      contactInfo.style.display = 'flex';
      revealBtn.style.display = 'none';
      updateWhatsAppLink();
      isRevealed = true;
      console.log(`[Analytics] Contact revealed for: ${currentProperty?.title || 'property'}`);
    }
  });
  
  contactInfo.appendChild(callLink);
  contactInfo.appendChild(whatsappBtn);
  contactContainer.appendChild(revealBtn);
  contactContainer.appendChild(contactInfo);
  
  priceTag.insertAdjacentElement('afterend', contactContainer);
}

// ========== INITIALIZE EVERYTHING ==========
document.addEventListener('DOMContentLoaded', () => {
  // Get property info from page
  const titleElement = document.querySelector('.property-title');
  const locationElement = document.querySelector('.location-meta');
  if (titleElement && locationElement) {
    currentProperty = {
      title: titleElement.textContent,
      estate: locationElement.textContent.replace(/[^\w\s]/g, '').trim()
    };
  }
  
  // Initialize all features
  initMobileMenu();
  initMobileDropdowns();
  initGallery();
  initSmoothScroll();
  initLazyLoading();
  trackUserInteraction();
  addMicroInteractions();
  addContactRevealFeature();
  
  // Load recommendations if needed
  const recContainer = document.querySelector('.recommendation-cards');
  if (recContainer && currentProperty && recContainer.children.length === 0) {
    const currentId = parseInt(new URLSearchParams(window.location.search).get('id'));
    loadMoreRecommendations(currentProperty.estate, currentId);
  }
});

// Re-initialize mobile dropdowns on window resize
window.addEventListener('resize', () => {
  initMobileDropdowns();
});

// Export for debugging
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initGallery, initSmoothScroll, initMobileMenu, initMobileDropdowns };
}