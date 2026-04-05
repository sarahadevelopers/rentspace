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

    // ========== AUTO-FILTER AIRBNB FROM URL ==========
    function getLocationFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('location');
    }

    // Dynamic year
    document.getElementById('year').textContent = new Date().getFullYear();

    // ========== HAMBURGER MENU WITH OVERLAY (UPDATED) ==========
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
        
        // Re-initialize dropdowns after menu opens
        setTimeout(() => {
            initMobileDropdowns();
        }, 100);
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

    // ========== MOBILE DROPDOWNS (FIXED) ==========
    function initMobileDropdowns() {
        // Only run on mobile
        if (window.innerWidth > 768) return;
        
        console.log('Initializing mobile dropdowns...');
        
        const dropdowns = document.querySelectorAll('.dropdown');
        console.log('Found dropdowns:', dropdowns.length);
        
        dropdowns.forEach((dropdown, index) => {
            const trigger = dropdown.querySelector('.dropdown-trigger');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            if (!trigger || !menu) {
                console.log(`Dropdown ${index}: missing trigger or menu`);
                return;
            }
            
            console.log(`Dropdown ${index}: initializing`);
            
            // Remove any existing click listeners to avoid duplicates
            const newTrigger = trigger.cloneNode(true);
            trigger.parentNode.replaceChild(newTrigger, trigger);
            
            // Add click event listener
            newTrigger.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Dropdown clicked, toggling open class');
                
                // Toggle open class on dropdown and menu
                dropdown.classList.toggle('open');
                menu.classList.toggle('open');
            });
        });
    }

    // ========== AIRBNB PROPERTIES VARIABLES ==========
    let allAirbnbProperties = []; // Store all Airbnb properties
    let currentFilteredProperties = []; // Store currently filtered properties
    let currentPage = 1;
    const itemsPerPage = 12;

    // ========== FILTER STATE ==========
    let currentLocationFilter = 'all';
    let currentPriceFilter = 'all';
    let currentGuestsFilter = 'all';

    // ========== FILTER FUNCTION ==========
    function applyAllFilters() {
        let filtered = [...allAirbnbProperties];
        
        // Apply location filter
        if (currentLocationFilter !== 'all') {
            filtered = filtered.filter(p => p.estate === currentLocationFilter);
        }
        
        // Apply price filter
        if (currentPriceFilter !== 'all') {
            filtered = filtered.filter(p => {
                const price = p.price_night || Math.round(p.price / 30);
                if (currentPriceFilter === '0-3000') return price < 3000;
                if (currentPriceFilter === '3000-5000') return price >= 3000 && price < 5000;
                if (currentPriceFilter === '5000-8000') return price >= 5000 && price < 8000;
                if (currentPriceFilter === '8000-15000') return price >= 8000 && price < 15000;
                if (currentPriceFilter === '15000+') return price >= 15000;
                return true;
            });
        }
        
        // Apply guests filter
        if (currentGuestsFilter !== 'all') {
            const guestNum = parseInt(currentGuestsFilter);
            filtered = filtered.filter(p => {
                const guestCapacity = (p.specs?.bedrooms || 1) * 2;
                if (currentGuestsFilter === '6') return guestCapacity >= 6;
                return guestCapacity >= guestNum;
            });
        }
        
        currentFilteredProperties = filtered;
        currentPage = 1;
        renderProperties(currentFilteredProperties);
        
        // Update result count
        const resultSpan = document.getElementById('countValue');
        if (resultSpan) resultSpan.textContent = currentFilteredProperties.length;
    }

    // ========== RENDER PROPERTY CARDS ==========
    function renderProperties(properties) {
        const grid = document.getElementById('propertyGrid');
        const paginationDiv = document.getElementById('pagination');
        
        if (!grid) return;
        
        if (!properties || properties.length === 0) {
            grid.style.display = 'none';
            if (paginationDiv) paginationDiv.style.display = 'none';
            document.getElementById('emptyState').style.display = 'block';
            const resultSpan = document.getElementById('countValue');
            if (resultSpan) resultSpan.textContent = '0';
            return;
        }
        
        grid.style.display = 'grid';
        document.getElementById('emptyState').style.display = 'none';
        const resultSpan = document.getElementById('countValue');
        if (resultSpan) resultSpan.textContent = properties.length;
        
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginated = properties.slice(start, end);
        const totalPages = Math.ceil(properties.length / itemsPerPage);
        
        grid.innerHTML = paginated.map(prop => `
            <a href="${basePath}/airbnb/${prop.slug}.html" class="property-card">
                <div class="card-image-wrapper">
                    <img class="card-image" src="${prop.images?.[0] || '/images/placeholder.jpg'}" alt="${prop.title}" loading="lazy">
                    <div class="card-badge"><i class="fab fa-airbnb"></i> Short-stay</div>
                    <div class="card-price">KES ${(prop.price_night || Math.round(prop.price / 30)).toLocaleString()}<span>/night</span></div>
                </div>
                <div class="card-info">
                    <h3 class="card-title">${escapeHtml(prop.title)}</h3>
                    <div class="card-location">${prop.estate}, Nairobi</div>
                    <div class="card-features">
                        <span><i class="fas fa-bed"></i> ${prop.specs?.bedrooms || 0}</span>
                        <span><i class="fas fa-bath"></i> ${prop.specs?.bathrooms || 0}</span>
                        <span><i class="fas fa-users"></i> ${(prop.specs?.bedrooms || 0) * 2} guests</span>
                    </div>
                    ${prop.airbnb_rating ? `
                    <div class="card-rating">
                        <i class="fas fa-star"></i>
                        <span>${prop.airbnb_rating}</span>
                        <span class="reviews">(${prop.airbnb_reviews} reviews)</span>
                    </div>
                    ` : ''}
                    <div class="card-cta">Book Now →</div>
                </div>
            </a>
        `).join('');
        
        // Pagination
        if (totalPages <= 1) {
            paginationDiv.style.display = 'none';
            return;
        }
        
        paginationDiv.style.display = 'flex';
        let paginationHTML = '';
        
        if (currentPage > 1) {
            paginationHTML += `<a href="#" class="page-link" data-page="${currentPage - 1}"><i class="fas fa-chevron-left"></i></a>`;
        }
        
        for (let i = 1; i <= Math.min(totalPages, 5); i++) {
            paginationHTML += `<a href="#" class="page-link ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</a>`;
        }
        
        if (currentPage < totalPages) {
            paginationHTML += `<a href="#" class="page-link" data-page="${currentPage + 1}"><i class="fas fa-chevron-right"></i></a>`;
        }
        
        paginationDiv.innerHTML = paginationHTML;
        
        document.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.dataset.page);
                if (!isNaN(page)) {
                    currentPage = page;
                    renderProperties(currentFilteredProperties);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    // Escape HTML helper
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // ========== FILTER DROPDOWN HANDLERS ==========
    function initFilterDropdowns() {
        // Location dropdown
        const locationBtn = document.getElementById('filterLocationBtn');
        const locationDropdown = document.getElementById('locationDropdown');
        if (locationBtn) {
            locationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAllDropdowns();
                locationDropdown.classList.toggle('show');
                locationBtn.classList.toggle('active');
            });
        }
        
        document.querySelectorAll('#locationDropdown .filter-option').forEach(opt => {
            opt.addEventListener('click', () => {
                currentLocationFilter = opt.dataset.location;
                updateFilterButtonText('filterLocationBtn', currentLocationFilter === 'all' ? 'Location' : currentLocationFilter);
                applyAllFilters();
                locationDropdown.classList.remove('show');
                if (locationBtn) locationBtn.classList.remove('active');
            });
        });
        
        // Price dropdown
        const priceBtn = document.getElementById('filterPriceBtn');
        const priceDropdown = document.getElementById('priceDropdown');
        if (priceBtn) {
            priceBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAllDropdowns();
                priceDropdown.classList.toggle('show');
                priceBtn.classList.toggle('active');
            });
        }
        
        document.querySelectorAll('#priceDropdown .filter-option').forEach(opt => {
            opt.addEventListener('click', () => {
                currentPriceFilter = opt.dataset.price;
                const displayText = opt.textContent;
                updateFilterButtonText('filterPriceBtn', displayText === 'All Prices' ? 'Price Range' : displayText);
                applyAllFilters();
                priceDropdown.classList.remove('show');
                if (priceBtn) priceBtn.classList.remove('active');
            });
        });
        
        // Guests dropdown
        const guestsBtn = document.getElementById('filterGuestsBtn');
        const guestsDropdown = document.getElementById('guestsDropdown');
        if (guestsBtn) {
            guestsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAllDropdowns();
                guestsDropdown.classList.toggle('show');
                guestsBtn.classList.toggle('active');
            });
        }
        
        document.querySelectorAll('#guestsDropdown .filter-option').forEach(opt => {
            opt.addEventListener('click', () => {
                currentGuestsFilter = opt.dataset.guests;
                const displayText = opt.textContent;
                updateFilterButtonText('filterGuestsBtn', displayText === 'Any Guests' ? 'Guests' : displayText);
                applyAllFilters();
                guestsDropdown.classList.remove('show');
                if (guestsBtn) guestsBtn.classList.remove('active');
            });
        });
        
        // Reset button
        const resetBtn = document.getElementById('resetFiltersBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                currentLocationFilter = 'all';
                currentPriceFilter = 'all';
                currentGuestsFilter = 'all';
                updateFilterButtonText('filterLocationBtn', 'Location');
                updateFilterButtonText('filterPriceBtn', 'Price Range');
                updateFilterButtonText('filterGuestsBtn', 'Guests');
                applyAllFilters();
                closeAllDropdowns();
            });
        }
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            closeAllDropdowns();
        });
    }

    function closeAllDropdowns() {
        document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    }

    function updateFilterButtonText(btnId, text) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.innerHTML = `${text} <i class="fas fa-chevron-down"></i>`;
        }
    }

    // ========== LOAD ALL AIRBNB PROPERTIES ==========
    async function loadAirbnbProperties() {
        const loadingSpinner = document.getElementById('loadingSpinner');
        const propertyGrid = document.getElementById('propertyGrid');
        
        try {
            // FIXED: Use basePath for dynamic paths
            const response = await fetch(`${basePath}/data/properties.json`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const allProperties = await response.json();
            
            allAirbnbProperties = allProperties.filter(prop => 
                prop.rental_type === 'short_term'
            );
            
            console.log(`✅ Found ${allAirbnbProperties.length} Airbnb properties`);
            
            // Check URL for location filter
            const locationFromURL = getLocationFromURL();
            if (locationFromURL) {
                currentLocationFilter = locationFromURL;
                updateFilterButtonText('filterLocationBtn', locationFromURL);
            }
            
            applyAllFilters();
            
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (propertyGrid) propertyGrid.style.display = 'grid';
            
        } catch (error) {
            console.error('Error loading properties:', error);
            if (loadingSpinner) {
                loadingSpinner.innerHTML = `
                    <div style="text-align: center;">
                        <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #FF5A5F; margin-bottom: 20px;"></i>
                        <h3 style="font-weight: 400;">Unable to load properties</h3>
                        <p style="color: var(--text-muted);">Please check back later.</p>
                        <p style="color: var(--text-muted); font-size: 12px;">Error: ${error.message}</p>
                    </div>
                `;
            }
        }
    }

    // ========== LOCATION QUICK NAVIGATION ==========
    function initLocationNav() {
        const locationLinks = document.querySelectorAll('.location-nav-link');
        locationLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const location = link.dataset.location;
                if (location) {
                    currentLocationFilter = location;
                    updateFilterButtonText('filterLocationBtn', location);
                    applyAllFilters();
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                    locationLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            });
        });
    }

    // ========== CLOSE MENU WHEN CLICKING OUTSIDE ==========
    function initCloseMenuOnOutsideClick() {
        document.addEventListener('click', (e) => {
            if (navMenu && navMenu.classList.contains('active')) {
                if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                    closeMenu();
                }
            }
        });
    }

    // ========== INITIALIZE ==========
    async function init() {
        initMobileDropdowns();
        initFilterDropdowns();
        await loadAirbnbProperties();
        initLocationNav();
        initCloseMenuOnOutsideClick();
    }

    window.addEventListener('resize', function() {
        initMobileDropdowns();
    });

    document.addEventListener('DOMContentLoaded', function() {
        init();
    });