// ========== DYNAMIC PATH HELPER ==========
const getBasePath = () => {
    if (window.location.hostname === 'sarahadevelopers.github.io') {
        return '/rentspace-markeplace';
    }
    return ''; // for rentspace.co.ke
};
const basePath = getBasePath();

// API base URL – your live backend on Render
const API_BASE = 'https://rentspace-markeplace.onrender.com/api';

// ========== AUTO-FILTER AIRBNB FROM URL ==========
function getLocationFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('location');
}

// Dynamic year
document.getElementById('year').textContent = new Date().getFullYear();

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
    setTimeout(() => initMobileDropdowns(), 100);
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

if (menuOverlay) menuOverlay.addEventListener('click', closeMenu);

if (navMenu) {
    navMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
}

window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && navMenu && navMenu.classList.contains('active')) closeMenu();
});

// ========== MOBILE DROPDOWNS ==========
function initMobileDropdowns() {
    if (window.innerWidth > 768) return;
    document.querySelectorAll('.dropdown').forEach(dropdown => {
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

// ========== AIRBNB PROPERTIES VARIABLES ==========
let allAirbnbProperties = [];
let currentFilteredProperties = [];
let currentPage = 1;
const itemsPerPage = 12;

// Filter state
let currentLocationFilter = 'all';
let currentPriceFilter = 'all';
let currentGuestsFilter = 'all';

// ========== FILTER FUNCTION ==========
function applyAllFilters() {
    let filtered = [...allAirbnbProperties];
    
    if (currentLocationFilter !== 'all') {
        filtered = filtered.filter(p => p.estate === currentLocationFilter);
    }
    
    if (currentPriceFilter !== 'all') {
        filtered = filtered.filter(p => {
            const nightPrice = p.priceNight || Math.round(p.price / 30);
            if (currentPriceFilter === '0-3000') return nightPrice < 3000;
            if (currentPriceFilter === '3000-5000') return nightPrice >= 3000 && nightPrice < 5000;
            if (currentPriceFilter === '5000-8000') return nightPrice >= 5000 && nightPrice < 8000;
            if (currentPriceFilter === '8000-15000') return nightPrice >= 8000 && nightPrice < 15000;
            if (currentPriceFilter === '15000+') return nightPrice >= 15000;
            return true;
        });
    }
    
    if (currentGuestsFilter !== 'all') {
        const guestNum = parseInt(currentGuestsFilter);
        filtered = filtered.filter(p => {
            const guestCapacity = (p.bedrooms || 1) * 2;
            if (currentGuestsFilter === '6') return guestCapacity >= 6;
            return guestCapacity >= guestNum;
        });
    }
    
    currentFilteredProperties = filtered;
    currentPage = 1;
    renderProperties(currentFilteredProperties);
    
    const resultSpan = document.getElementById('countValue');
    if (resultSpan) resultSpan.textContent = currentFilteredProperties.length;
}

// ========== RENDER PROPERTY CARDS ==========
function renderProperties(properties) {
    const grid = document.getElementById('propertyGrid');
    const paginationDiv = document.getElementById('pagination');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    if (!grid) return;
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    
    if (!properties || properties.length === 0) {
        grid.style.display = 'none';
        if (paginationDiv) paginationDiv.style.display = 'none';
        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.style.display = 'block';
        const resultSpan = document.getElementById('countValue');
        if (resultSpan) resultSpan.textContent = '0';
        return;
    }
    
    grid.style.display = 'grid';
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.style.display = 'none';
    const resultSpan = document.getElementById('countValue');
    if (resultSpan) resultSpan.textContent = properties.length;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = properties.slice(start, end);
    const totalPages = Math.ceil(properties.length / itemsPerPage);
    
    grid.innerHTML = paginated.map(prop => {
    const nightPrice = prop.price || 0;
    const rating = prop.airbnb_rating || '4.9';
    const reviews = prop.airbnb_reviews || 25;
    const imageUrl = prop.images?.[0] || `${basePath}/images/placeholder.jpg`;

    // ─── SUBSCRIPTION BADGE ───────────────────────────────
    const plan = prop.ownerSubscriptionPlan || 'free';
    const badgeConfig = {
        basic:     { label: 'Silver',   color: '#c0c0c0', icon: 'fa-gem',   className: 'badge-silver' },
        pro:       { label: 'Gold',     color: '#d4af37', icon: 'fa-crown', className: 'badge-gold' },
        developer: { label: 'Platinum', color: '#e5e4e2', icon: 'fa-gem',   className: 'badge-platinum' }
    };
    const config = badgeConfig[plan] || null;
    const premiumBadgeHTML = config ? `
        <div class="property-badge ${config.className}">
            <i class="fas ${config.icon}"></i> ${config.label}
        </div>
    ` : '';

  return `
    <a href="${basePath}/airbnb/${prop.slug}.html" class="property-card">
        <div class="card-image-wrapper">
            ${premiumBadgeHTML}
            <img class="card-image" src="${imageUrl}" alt="${escapeHtml(prop.title)}" loading="lazy" onerror="this.src='${basePath}/images/placeholder.jpg'">
            <div class="card-badge"><i class="fab fa-airbnb"></i> Short-stay</div>
            <div class="card-price">KES ${nightPrice.toLocaleString()}<span>/night</span></div>
        </div>
        <div class="card-info">
            <h3 class="card-title">${escapeHtml(prop.title)}</h3>
            <div class="card-location">
                <i class="fas fa-map-marker-alt"></i>
                ${escapeHtml(prop.estate || 'Nairobi')}
            </div>
            <div class="card-features">
                <span><i class="fas fa-bed"></i> ${prop.bedrooms || 0} bed${(prop.bedrooms || 0) !== 1 ? 's' : ''}</span>
                <span><i class="fas fa-bath"></i> ${prop.bathrooms || 0} bath${(prop.bathrooms || 0) !== 1 ? 's' : ''}</span>
                <span><i class="fas fa-users"></i> ${(prop.bedrooms || 1) * 2} guests</span>
            </div>
            <div class="card-rating">
                <i class="fas fa-star"></i>
                <span>${rating}</span>
                <span class="reviews">(${reviews} reviews)</span>
            </div>
            <div class="card-cta">Book Now →</div>
        </div>
    </a>
`;
}).join('');
    
    if (totalPages <= 1) {
        if (paginationDiv) paginationDiv.style.display = 'none';
        return;
    }
    
    if (paginationDiv) {
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
}

// ========== ESCAPE HTML HELPER ==========
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
    const locationBtn = document.getElementById('filterLocationBtn');
    const locationDropdown = document.getElementById('locationDropdown');
    if (locationBtn) {
        locationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            if (locationDropdown) locationDropdown.classList.toggle('show');
            locationBtn.classList.toggle('active');
        });
    }
    
    document.querySelectorAll('#locationDropdown .filter-option').forEach(opt => {
        opt.addEventListener('click', () => {
            currentLocationFilter = opt.dataset.location;
            updateFilterButtonText('filterLocationBtn', currentLocationFilter === 'all' ? 'Location' : currentLocationFilter);
            applyAllFilters();
            if (locationDropdown) locationDropdown.classList.remove('show');
            if (locationBtn) locationBtn.classList.remove('active');
        });
    });
    
    const priceBtn = document.getElementById('filterPriceBtn');
    const priceDropdown = document.getElementById('priceDropdown');
    if (priceBtn) {
        priceBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            if (priceDropdown) priceDropdown.classList.toggle('show');
            priceBtn.classList.toggle('active');
        });
    }
    
    document.querySelectorAll('#priceDropdown .filter-option').forEach(opt => {
        opt.addEventListener('click', () => {
            currentPriceFilter = opt.dataset.price;
            const displayText = opt.textContent;
            updateFilterButtonText('filterPriceBtn', displayText === 'All Prices' ? 'Price Range' : displayText);
            applyAllFilters();
            if (priceDropdown) priceDropdown.classList.remove('show');
            if (priceBtn) priceBtn.classList.remove('active');
        });
    });
    
    const guestsBtn = document.getElementById('filterGuestsBtn');
    const guestsDropdown = document.getElementById('guestsDropdown');
    if (guestsBtn) {
        guestsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            if (guestsDropdown) guestsDropdown.classList.toggle('show');
            guestsBtn.classList.toggle('active');
        });
    }
    
    document.querySelectorAll('#guestsDropdown .filter-option').forEach(opt => {
        opt.addEventListener('click', () => {
            currentGuestsFilter = opt.dataset.guests;
            const displayText = opt.textContent;
            updateFilterButtonText('filterGuestsBtn', displayText === 'Any Guests' ? 'Guests' : displayText);
            applyAllFilters();
            if (guestsDropdown) guestsDropdown.classList.remove('show');
            if (guestsBtn) guestsBtn.classList.remove('active');
        });
    });
    
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

// ========== LOAD AIRBNB PROPERTIES FROM RENDER API ==========
async function loadAirbnbProperties() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const propertyGrid = document.getElementById('propertyGrid');
    
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    
    try {
        const response = await fetch(`${API_BASE}/properties?type=short_term&limit=200`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        allAirbnbProperties = data.properties || [];
        
        console.log(`✅ Found ${allAirbnbProperties.length} Airbnb properties from API`);
        
        const locationFromURL = getLocationFromURL();
        if (locationFromURL) {
            currentLocationFilter = locationFromURL;
            updateFilterButtonText('filterLocationBtn', locationFromURL);
        }
        
        applyAllFilters();
        
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (propertyGrid) propertyGrid.style.display = 'grid';
        
    } catch (error) {
        console.error('Error loading properties from API:', error);
        if (loadingSpinner) {
            loadingSpinner.innerHTML = `
                <div style="text-align: center;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #FF5A5F; margin-bottom: 20px;"></i>
                    <h3>Unable to load properties</h3>
                    <p style="color: var(--text-muted);">Please check back later.</p>
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