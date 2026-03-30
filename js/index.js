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
      const heroTitle = document.querySelector('.hero-title');
      if (heroTitle) {
        let greeting = '';
        if (hour < 12) greeting = 'Good Morning';
        else if (hour < 18) greeting = 'Good Afternoon';
        else greeting = 'Good Evening';
        
        // Don't replace the main title, just update a hidden element or keep as is
        // The hero title remains "Refining Residential Living in Nairobi"
      }
    }

    // ========== HAMBURGER MENU ==========
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-links');

    if (hamburger) {
      hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
      });
    }

    // ========== LOAD FEATURED PROPERTIES ==========
    async function loadFeaturedProperties() {
      try {
        const response = await fetch('/data/properties.json');
        const properties = await response.json();
        
        // Get first 4 featured properties
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
    });

    // Close menu when clicking outside (for mobile)
    document.addEventListener('click', (e) => {
      if (navMenu && navMenu.classList.contains('active')) {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
          navMenu.classList.remove('active');
          hamburger.classList.remove('active');
        }
      }
    });