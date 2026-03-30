// js/property.js
// This file handles dynamic interactions on static property pages
// and serves as a fallback if the static generation needs enhancement

let allProperties = [];
let currentProperty = null;

// Get property ID from URL (for dynamic fallback mode)
function getPropertyIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  return id ? parseInt(id) : null;
}

// Get property slug from current URL (for static pages)
function getPropertySlugFromURL() {
  const path = window.location.pathname;
  const match = path.match(/\/property\/(.+)\.html$/);
  return match ? match[1] : null;
}

// Enhanced gallery functionality for static pages
function initGallery() {
  const mainImage = document.getElementById('mainImage');
  const thumbs = document.querySelectorAll('.thumb');
  const galleryCounter = document.getElementById('galleryCounter');
  const galleryStage = document.getElementById('galleryStage');
  
  if (thumbs.length > 0 && mainImage) {
    // Thumbnail click handler
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

// Smooth scroll to concierge section
function initSmoothScroll() {
  const inquireBtn = document.querySelector('.nav-inquire');
  if (inquireBtn) {
    inquireBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const concierge = document.querySelector('.concierge-section');
      if (concierge) {
        concierge.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

// Lazy load images
function initLazyLoading() {
  const images = document.querySelectorAll('img[loading="lazy"]');
  if ('loading' in HTMLImageElement.prototype) {
    // Native lazy loading supported
    images.forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
    });
  } else {
    // Fallback for older browsers
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

// Track user interaction for analytics (optional)
function trackUserInteraction() {
  const buttons = document.querySelectorAll('.btn-concierge, .wa-float, .nav-inquire');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const action = button.classList.contains('btn-concierge') ? 'concierge' :
                     button.classList.contains('wa-float') ? 'whatsapp' : 'inquire';
      console.log(`[Analytics] User clicked: ${action} - ${currentProperty?.title || 'unknown property'}`);
      // Here you can send to Google Analytics or your tracking system
    });
  });
}

// Dynamic recommendations enhancement (load more recommendations via AJAX if needed)
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
  // Hover effect for spec items
  const specItems = document.querySelectorAll('.spec-item');
  specItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
      item.style.transform = 'translateY(-2px)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.transform = 'translateY(0)';
    });
  });
  
  // Gallery item click to open fullscreen (optional)
  const galleryItems = document.querySelectorAll('.gallery-item');
  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      // Optional: implement lightbox/fullscreen mode
      console.log('Open fullscreen for:', item.src);
    });
  });
}

// Copy property details to clipboard (optional feature)
function addCopyFeature() {
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-details-btn';
  copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Details';
  copyBtn.style.cssText = `
    background: transparent;
    border: 1px solid var(--gold);
    color: var(--gold);
    padding: 6px 12px;
    border-radius: 30px;
    font-size: 11px;
    cursor: pointer;
    margin-left: 1rem;
    transition: all 0.3s;
  `;
  
  const propertyHeader = document.querySelector('.property-header');
  if (propertyHeader) {
    const priceTag = document.querySelector('.price-tag');
    if (priceTag) {
      priceTag.appendChild(copyBtn);
      copyBtn.addEventListener('click', () => {
        const details = `${currentProperty?.title}\n${currentProperty?.estate}, Nairobi\nKES ${currentProperty?.price?.toLocaleString()}/month\n${window.location.href}`;
        navigator.clipboard.writeText(details).then(() => {
          copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
          setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Details';
          }, 2000);
        });
      });
    }
  }
}

// Initialize all functionality when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // For static pages, we don't need to fetch property data
  // Just initialize UI enhancements
  initGallery();
  initSmoothScroll();
  initLazyLoading();
  trackUserInteraction();
  addMicroInteractions();
  addCopyFeature();
  
  // Try to get property info from page data for tracking
  const titleElement = document.querySelector('.property-title');
  const locationElement = document.querySelector('.location-meta');
  if (titleElement && locationElement) {
    currentProperty = {
      title: titleElement.textContent,
      estate: locationElement.textContent.replace(/[^\w\s]/g, '').trim()
    };
  }
  
  // Optional: Load dynamic recommendations if container is empty
  const recContainer = document.querySelector('.recommendation-cards');
  if (recContainer && currentProperty && recContainer.children.length === 0) {
    const currentId = parseInt(new URLSearchParams(window.location.search).get('id'));
    loadMoreRecommendations(currentProperty.estate, currentId);
  }
});

// Export for debugging (optional)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initGallery, initSmoothScroll };
}