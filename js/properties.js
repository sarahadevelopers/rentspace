// js/property.js
// This file handles dynamic interactions on static property pages

let allProperties = [];
let currentProperty = null;

// Get property slug from current URL (for static pages)
function getPropertySlugFromURL() {
  const path = window.location.pathname;
  const match = path.match(/\/property\/(.+)\.html$/);
  return match ? match[1] : null;
}

// ========== HAMBURGER MENU TOGGLE ==========
// ========== HAMBURGER MENU TOGGLE (FIXED) ==========
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

// Make sure to call this AFTER DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  initMobileMenu();
  initMobileDropdowns();
});

// ========== MOBILE DROPDOWN TOGGLE ==========
// Add this function to your property.js
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

// Call this in your DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
  // ... existing code ...
  initMobileDropdowns();
});

// Enhanced gallery functionality for static pages
function initGallery() {
  const mainImage = document.getElementById('mainImage');
  const thumbs = document.querySelectorAll('.thumb');
  const galleryCounter = document.getElementById('galleryCounter');
  const galleryStage = document.getElementById('galleryStage');
  
  if (thumbs.length > 0 && mainImage) {
    thumbs.forEach((thumb, index) => {
      thumb.addEventListener('click', () => {
        mainImage.src = thumb.src;
        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        if (galleryCounter) {
          document.getElementById('currentIndex').textContent = index + 1;
        }
      });
    });
  }
  
  // Gallery scroll counter for horizontal gallery
  if (galleryStage && galleryCounter) {
    const items = document.querySelectorAll('.gallery-item');
    const total = items.length;
    const currentSpan = document.getElementById('currentIndex');
    
    if (currentSpan && total > 0) {
      function updateCounter() {
        const scrollLeft = galleryStage.scrollLeft;
        const itemWidth = items[0]?.offsetWidth + 12 || 0;
        const activeIndex = Math.round(scrollLeft / itemWidth) + 1;
        currentSpan.textContent = Math.min(activeIndex, total);
      }
      
      galleryStage.addEventListener('scroll', updateCounter);
      updateCounter();
    }
  }
}

// Smooth scroll to concierge section (updated for new navbar)
function initSmoothScroll() {
  // Try both possible button classes
  const inquireBtn = document.querySelector('.nav-inquire') || document.querySelector('.nav-cta');
  if (inquireBtn) {
    inquireBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const concierge = document.querySelector('.concierge-section');
      if (concierge) {
        concierge.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Fallback to contact section or footer
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
    const response = await fetch('/data/properties.json');
    const properties = await response.json();
    const similar = properties
      .filter(p => p.estate === currentEstate && p.id !== currentId)
      .slice(0, 4);
    
    const recContainer = document.querySelector('.recommendation-cards');
    if (recContainer && similar.length > 0 && recContainer.children.length === 0) {
      similar.forEach(prop => {
        const card = document.createElement('a');
        card.href = `/property/${prop.slug}.html`;
        card.className = 'rec-card';
        card.innerHTML = `
          <div class="rec-card-image">
            <img src="${prop.images?.[0] || '/images/placeholder.jpg'}" alt="${prop.title}" loading="lazy">
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
      // Optional: implement lightbox/fullscreen mode
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
  
  // Check if already added
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

// Initialize all functionality when DOM is ready
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