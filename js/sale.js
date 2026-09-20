// ============================================
// SALE PORTAL - COMPLETE FUNCTIONALITY
// ============================================

// ========== SLIDER CONFIG ==========
// Sale prices run higher than rentals
const PRICE_CEILING = 50000000;   // 50M
const PRICE_STEP = 500000;        // 500K

// ========== DYNAMIC PATH HELPER ==========
const getBasePath = () => {
    if (window.location.hostname === 'sarahadevelopers.github.io') {
        return '/rentspace-markeplace';
    }
    return '';
};
const basePath = getBasePath();

// ========== AUTO-FILTER FROM URL ==========
function getLocationFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const location = urlParams.get('location');
    const estate = urlParams.get('estate');
    return location || estate || null;
}

// Dynamic year
const yearSpan = document.getElementById('year');
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// ========== HAMBURGER MENU ==========
const hamburger = document.getElementById('hamburger');
const navMenu = document.querySelector('.nav-links');
const menuOverlay = document.getElementById('menuOverlay');

if (navMenu) navMenu.classList.remove('active');
if (hamburger) hamburger.classList.remove('active');
if (menuOverlay) menuOverlay.classList.remove('active');

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
    hamburger.addEventListener('click', function(e) {
        e.stopPropagation();
        if (navMenu && navMenu.classList.contains('active')) closeMenu();
        else openMenu();
    });
}
if (menuOverlay) menuOverlay.addEventListener('click', closeMenu);
if (navMenu) navMenu.querySelectorAll('a').forEach(l => l.addEventListener('click', closeMenu));

window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && navMenu && navMenu.classList.contains('active')) closeMenu();
});

// ========== MOBILE DROPDOWNS ==========
function initMobileDropdowns() {
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
if (window.innerWidth <= 768) initMobileDropdowns();
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) initMobileDropdowns();
});

// ========== DRAWER ==========
const drawerOverlay = document.getElementById('drawerOverlay');
const filterDrawer = document.getElementById('filterDrawer');
const openDrawerBtn = document.getElementById('openDrawerBtn');
const closeDrawerBtn = document.getElementById('closeDrawerBtn');
const filterNeighborhoodBtn = document.getElementById('filterNeighborhoodBtn');
const filterTypeBtn = document.getElementById('filterTypeBtn');
const filterBudgetBtn = document.getElementById('filterBudgetBtn');

function openDrawer() {
    if (drawerOverlay) drawerOverlay.classList.add('active');
    if (filterDrawer) filterDrawer.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeDrawer() {
    if (drawerOverlay) drawerOverlay.classList.remove('active');
    if (filterDrawer) filterDrawer.classList.remove('active');
    document.body.style.overflow = '';
}

if (openDrawerBtn) openDrawerBtn.addEventListener('click', openDrawer);
if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

if (filterNeighborhoodBtn) {
    filterNeighborhoodBtn.addEventListener('click', () => {
        openDrawer();
        const s = document.getElementById('neighborhoodChips');
        if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}
if (filterTypeBtn) {
    filterTypeBtn.addEventListener('click', () => {
        openDrawer();
        const s = document.getElementById('typeChips');
        if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}
if (filterBudgetBtn) {
    filterBudgetBtn.addEventListener('click', () => {
        openDrawer();
        const s = document.getElementById('dualSlider');
        if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

// ========== STATE ==========
let allProperties = [];
let currentFilteredProperties = [];
let currentFilters = {
    neighborhood: 'all',
    type: 'all',
    minPrice: 0,
    maxPrice: PRICE_CEILING
};
let currentPage = 1;
const ITEMS_PER_PAGE = 12;

const propertyGrid = document.getElementById('propertyGrid');
const skeletonLoader = document.getElementById('skeletonLoader');
const emptyState = document.getElementById('emptyState');
const resultCountSpan = document.getElementById('countValue');

const priceMin = document.getElementById('priceMin');
const priceMax = document.getElementById('priceMax');
const minPriceLabel = document.getElementById('minPriceLabel');
const maxPriceLabel = document.getElementById('maxPriceLabel');
const priceFill = document.getElementById('priceFill');
const pricePresets = document.getElementById('pricePresets');

let paginationContainer;

// ========== BUTTON TEXT HELPERS ==========
function compactPrice(val) {
    if (val >= 1000000) {
        const m = val / 1000000;
        return (m % 1 === 0 ? m : m.toFixed(1)) + 'M';
    }
    if (val >= 1000) {
        const k = val / 1000;
        return (k % 1 === 0 ? k : k.toFixed(1)) + 'K';
    }
    return val.toString();
}

function updateNeighborhoodButton() {
    if (!filterNeighborhoodBtn) return;
    if (currentFilters.neighborhood !== 'all') {
        filterNeighborhoodBtn.innerHTML = `${currentFilters.neighborhood} <i class="fas fa-chevron-down"></i>`;
        filterNeighborhoodBtn.style.borderColor = 'var(--gold)';
        filterNeighborhoodBtn.style.color = 'var(--gold)';
    } else {
        filterNeighborhoodBtn.innerHTML = `Neighborhood <i class="fas fa-chevron-down"></i>`;
        filterNeighborhoodBtn.style.borderColor = '';
        filterNeighborhoodBtn.style.color = '';
    }
}

function updateTypeButton() {
    if (!filterTypeBtn) return;
    if (currentFilters.type !== 'all') {
        filterTypeBtn.innerHTML = `${currentFilters.type} <i class="fas fa-chevron-down"></i>`;
        filterTypeBtn.style.borderColor = 'var(--gold)';
        filterTypeBtn.style.color = 'var(--gold)';
    } else {
        filterTypeBtn.innerHTML = `Property Type <i class="fas fa-chevron-down"></i>`;
        filterTypeBtn.style.borderColor = '';
        filterTypeBtn.style.color = '';
    }
}

function updateBudgetButton() {
    if (!filterBudgetBtn) return;
    const isFiltered = currentFilters.minPrice > 0 || currentFilters.maxPrice < PRICE_CEILING;
    if (!isFiltered) {
        filterBudgetBtn.innerHTML = `Budget <i class="fas fa-chevron-down"></i>`;
        filterBudgetBtn.style.borderColor = '';
        filterBudgetBtn.style.color = '';
        return;
    }
    let label;
    if (currentFilters.minPrice === 0) {
        label = `Under ${compactPrice(currentFilters.maxPrice)}`;
    } else if (currentFilters.maxPrice >= PRICE_CEILING) {
        label = `${compactPrice(currentFilters.minPrice)}+`;
    } else {
        label = `${compactPrice(currentFilters.minPrice)} – ${compactPrice(currentFilters.maxPrice)}`;
    }
    filterBudgetBtn.innerHTML = `${label} <i class="fas fa-chevron-down"></i>`;
    filterBudgetBtn.style.borderColor = 'var(--gold)';
    filterBudgetBtn.style.color = 'var(--gold)';
}

function updateAllButtons() {
    updateNeighborhoodButton();
    updateTypeButton();
    updateBudgetButton();
}

// ========== DYNAMIC FILTER CHIPS ==========
function renderDynamicFilters() {
    renderNeighborhoodChips();
    renderTypeChips();
    initChipListeners();
}

function renderNeighborhoodChips() {
    const container = document.getElementById('neighborhoodChips');
    if (!container) return;

    const estates = [...new Set(
        allProperties
            .map(p => p.estate ? String(p.estate).trim() : null)
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    if (currentFilters.neighborhood !== 'all' && !estates.includes(currentFilters.neighborhood)) {
        currentFilters.neighborhood = 'all';
    }

    let html = `<div class="filter-chip ${currentFilters.neighborhood === 'all' ? 'active' : ''}" data-value="all">All Estates</div>`;
    estates.forEach(name => {
        const isActive = currentFilters.neighborhood === name;
        html += `<div class="filter-chip ${isActive ? 'active' : ''}" data-value="${escapeHtml(name)}">${escapeHtml(name)}</div>`;
    });

    container.innerHTML = html;
}

function renderTypeChips() {
    const container = document.getElementById('typeChips');
    if (!container) return;

    const types = [...new Set(
        allProperties
            .map(p => p.type)
            .filter(v => v && String(v).trim())
    )].sort((a, b) => a.localeCompare(b));

    if (currentFilters.type !== 'all' && !types.includes(currentFilters.type)) {
        currentFilters.type = 'all';
    }

    let html = `<div class="filter-chip ${currentFilters.type === 'all' ? 'active' : ''}" data-value="all">All Types</div>`;
    types.forEach(name => {
        const isActive = currentFilters.type === name;
        html += `<div class="filter-chip ${isActive ? 'active' : ''}" data-value="${escapeHtml(name)}">${escapeHtml(name)}</div>`;
    });

    container.innerHTML = html;
}

// ========== PAGINATION ==========
function ensurePaginationContainer() {
    if (!document.getElementById('paginationContainer') && propertyGrid && propertyGrid.parentNode) {
        const container = document.createElement('div');
        container.id = 'paginationContainer';
        container.className = 'pagination-container';
        propertyGrid.parentNode.insertBefore(container, propertyGrid.nextSibling);
    }
    paginationContainer = document.getElementById('paginationContainer');
}

function renderPagination() {
    if (!paginationContainer) return;
    const totalPages = Math.ceil(currentFilteredProperties.length / ITEMS_PER_PAGE);
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    paginationContainer.style.display = 'flex';
    let html = '';
    if (currentPage > 1) {
        html += `<button class="pagination-btn" onclick="window.changePage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
    }
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="window.changePage(1)">1</button>`;
        if (startPage > 2) html += `<span class="pagination-dots">...</span>`;
    }
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="window.changePage(${i})">${i}</button>`;
    }
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="pagination-dots">...</span>`;
        html += `<button class="pagination-btn" onclick="window.changePage(${totalPages})">${totalPages}</button>`;
    }
    if (currentPage < totalPages) {
        html += `<button class="pagination-btn" onclick="window.changePage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
    }
    paginationContainer.innerHTML = html;
}

// ========== RENDER PROPERTIES ==========
function renderProperties() {
    if (!propertyGrid) return;

    if (currentFilteredProperties.length === 0) {
        propertyGrid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        if (resultCountSpan) resultCountSpan.textContent = '0';
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
    }

    propertyGrid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    if (resultCountSpan) resultCountSpan.textContent = currentFilteredProperties.length;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedProperties = currentFilteredProperties.slice(startIndex, endIndex);

    propertyGrid.innerHTML = paginatedProperties.map(prop => {
        const firstImage = prop.images?.[0] || '/images/placeholder.jpg';
        const badge = 'For Sale';

        // Subscription badge
        const plan = prop.ownerSubscriptionPlan || 'free';
        const badgeConfig = {
            basic: { label: 'Silver', color: '#c0c0c0', icon: 'fa-gem', className: 'badge-silver' },
            pro: { label: 'Gold', color: '#d4af37', icon: 'fa-crown', className: 'badge-gold' },
            developer: { label: 'Platinum', color: '#e5e4e2', icon: 'fa-gem', className: 'badge-platinum' }
        };
        const config = badgeConfig[plan] || null;
        let premiumBadgeHTML = '';
        if (config) {
            premiumBadgeHTML = `
                <div class="property-badge ${config.className}">
                    <i class="fas ${config.icon}"></i> ${config.label}
                </div>
            `;
        }

        return `
            <a href="${basePath}/property/${prop.slug}.html" class="property-card" data-property-id="${prop.id}">
                <div class="card-image-wrapper" style="position:relative;">
                    ${premiumBadgeHTML}
                    <img class="card-image" src="${firstImage}" alt="${escapeHtml(prop.title)}" loading="lazy">
                    <div class="card-badge">${badge}</div>
                    <div class="card-price">KES ${prop.price.toLocaleString()}</div>
                </div>
                <div class="card-info">
                    <h3 class="card-title">${escapeHtml(prop.title)}</h3>
                    <div class="card-location">${escapeHtml(prop.estate || 'Nairobi')}</div>
                    <div class="card-features">
                        <span><i class="fas fa-bed"></i> ${prop.bedrooms || 0}</span>
                        <span><i class="fas fa-bath"></i> ${prop.bathrooms || 0}</span>
                        <span><i class="fas fa-car"></i> ${prop.parking || 0}</span>
                    </div>
                    ${config ? `<div class="boost-tag"><i class="fas fa-arrow-up" style="color:${config.color};"></i> <span style="color:${config.color};">Boosted visibility</span></div>` : ''}
                </div>
                <div class="card-cta">View Details</div>
            </a>
        `;
    }).join('');

    renderPagination();
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

// ========== FILTER ==========
function applyFilters() {
    let filtered = [...allProperties];
    if (currentFilters.neighborhood !== 'all') {
        filtered = filtered.filter(prop => prop.estate === currentFilters.neighborhood);
    }
    if (currentFilters.type !== 'all') {
        filtered = filtered.filter(prop => prop.type === currentFilters.type);
    }
    if (currentFilters.minPrice > 0) {
        filtered = filtered.filter(prop => prop.price >= currentFilters.minPrice);
    }
    if (currentFilters.maxPrice < PRICE_CEILING) {
        filtered = filtered.filter(prop => prop.price <= currentFilters.maxPrice);
    }
    return filtered;
}

function applyAndRender() {
    currentFilteredProperties = applyFilters();
    currentPage = 1;
    renderProperties();
    if (resultCountSpan) resultCountSpan.textContent = currentFilteredProperties.length;
}

// ========== URL AUTO-FILTER ==========
function filterByLocationFromURL(location) {
    if (!location) {
        currentFilteredProperties = [...allProperties];
        currentFilters.neighborhood = 'all';
    } else {
        const match = [...new Set(allProperties.map(p => p.estate))]
            .find(e => e && e.toLowerCase() === location.toLowerCase());
        if (match) {
            currentFilters.neighborhood = match;
            currentFilteredProperties = allProperties.filter(p => p.estate === match);
        } else {
            currentFilters.neighborhood = 'all';
            currentFilteredProperties = [...allProperties];
        }
    }

    renderNeighborhoodChips();
    initChipListeners();
    updateAllButtons();

    currentPage = 1;
    renderProperties();
    console.log(`📍 Showing ${currentFilteredProperties.length} properties for sale in: ${location || 'all locations'}`);
}

function applyFilterFromURL() {
    const location = getLocationFromURL();
    if (location) setTimeout(() => filterByLocationFromURL(location), 100);
}

window.changePage = function(page) {
    const totalPages = Math.ceil(currentFilteredProperties.length / ITEMS_PER_PAGE);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderProperties();
        if (propertyGrid) propertyGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

// ========== CHIP LISTENERS (event delegation) ==========
function initChipListeners() {
    const hoods = document.getElementById('neighborhoodChips');
    const types = document.getElementById('typeChips');

    if (hoods && !hoods.dataset.bound) {
        hoods.addEventListener('click', (e) => {
            const chip = e.target.closest('.filter-chip');
            if (!chip) return;
            hoods.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilters.neighborhood = chip.dataset.value;
            updateNeighborhoodButton();
        });
        hoods.dataset.bound = '1';
    }

    if (types && !types.dataset.bound) {
        types.addEventListener('click', (e) => {
            const chip = e.target.closest('.filter-chip');
            if (!chip) return;
            types.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilters.type = chip.dataset.value;
            updateTypeButton();
        });
        types.dataset.bound = '1';
    }
}

// ========== DUAL-RANGE PRICE ==========
function formatPrice(val) {
    return 'KES ' + val.toLocaleString();
}

function updateSliderVisuals() {
    if (!priceMin || !priceMax) return;

    let minVal = parseInt(priceMin.value, 10) || 0;
    let maxVal = parseInt(priceMax.value, 10) || PRICE_CEILING;

    if (minVal > maxVal - PRICE_STEP) {
        if (document.activeElement === priceMin) {
            minVal = Math.max(0, maxVal - PRICE_STEP);
            priceMin.value = minVal;
        } else {
            maxVal = Math.min(PRICE_CEILING, minVal + PRICE_STEP);
            priceMax.value = maxVal;
        }
    }

    const minPct = (minVal / PRICE_CEILING) * 100;
    const maxPct = (maxVal / PRICE_CEILING) * 100;
    if (priceFill) {
        priceFill.style.left = minPct + '%';
        priceFill.style.right = (100 - maxPct) + '%';
    }

    if (minPriceLabel) {
        minPriceLabel.textContent = formatPrice(minVal);
        minPriceLabel.classList.toggle('active-value', minVal > 0);
    }
    if (maxPriceLabel) {
        if (maxVal >= PRICE_CEILING) {
            maxPriceLabel.textContent = formatPrice(PRICE_CEILING) + '+';
            maxPriceLabel.classList.remove('active-value');
        } else {
            maxPriceLabel.textContent = formatPrice(maxVal);
            maxPriceLabel.classList.add('active-value');
        }
    }

    currentFilters.minPrice = minVal;
    currentFilters.maxPrice = maxVal;
    updateBudgetButton();
}

function syncActivePreset() {
    if (!pricePresets) return;
    const min = currentFilters.minPrice;
    const max = currentFilters.maxPrice;
    pricePresets.querySelectorAll('.price-preset').forEach(btn => {
        const bMin = parseInt(btn.dataset.min, 10);
        const bMax = parseInt(btn.dataset.max, 10);
        btn.classList.toggle('active', bMin === min && bMax === max);
    });
}

if (priceMin) priceMin.addEventListener('input', updateSliderVisuals);
if (priceMax) priceMax.addEventListener('input', updateSliderVisuals);

if (pricePresets) {
    pricePresets.querySelectorAll('.price-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const min = parseInt(btn.dataset.min, 10);
            const max = parseInt(btn.dataset.max, 10);
            if (priceMin) priceMin.value = min;
            if (priceMax) priceMax.value = max;
            updateSliderVisuals();
            syncActivePreset();
        });
    });
}

updateSliderVisuals();

// ========== RESET ==========
function resetFilters() {
    currentFilters = {
        neighborhood: 'all',
        type: 'all',
        minPrice: 0,
        maxPrice: PRICE_CEILING
    };
    currentPage = 1;

    document.querySelectorAll('#neighborhoodChips .filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.value === 'all');
    });
    document.querySelectorAll('#typeChips .filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.value === 'all');
    });

    if (priceMin) priceMin.value = 0;
    if (priceMax) priceMax.value = PRICE_CEILING;
    updateSliderVisuals();
    if (pricePresets) {
        pricePresets.querySelectorAll('.price-preset').forEach(b => b.classList.remove('active'));
    }

    updateAllButtons();
    applyAndRender();
}

function addResetButton() {
    const drawerHeader = document.querySelector('.drawer-header');
    if (drawerHeader && !document.getElementById('resetFiltersBtn')) {
        const resetBtn = document.createElement('button');
        resetBtn.id = 'resetFiltersBtn';
        resetBtn.textContent = 'Reset All';
        resetBtn.style.cssText = `
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text-muted);
            padding: 6px 12px;
            border-radius: 30px;
            font-size: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        resetBtn.addEventListener('click', resetFilters);
        drawerHeader.appendChild(resetBtn);
    }
}

// ========== "SHOW RESULTS" ==========
const applyBtn = document.getElementById('applyFiltersBtn');
if (applyBtn) {
    applyBtn.addEventListener('click', () => {
        applyAndRender();
        closeDrawer();
    });
}

// ========== LOAD PROPERTIES (FILTERED FOR SALE) ==========
async function loadProperties() {
    try {
        if (skeletonLoader) skeletonLoader.style.display = 'flex';

        const response = await fetch('https://rentspace-markeplace.onrender.com/api/properties?limit=200');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const propertiesFromAPI = data.properties || [];

        allProperties = propertiesFromAPI
            .map(prop => ({
                id: prop._id,
                title: prop.title,
                slug: prop.slug,
                estate: prop.estate,
                price: Number(prop.price) || 0,
                type: prop.propertyType || 'Property',
                images: prop.images || [],
                bedrooms: prop.bedrooms || 0,
                bathrooms: prop.bathrooms || 0,
                parking: prop.parking || 0,
                description: prop.description || '',
                listingType: prop.listingType,
                propertyType: prop.propertyType,
                status: prop.status,
                ownerSubscriptionPlan: prop.ownerSubscriptionPlan || 'free'
            }))
            // Only sale properties, excluding land
            .filter(prop =>
                prop.listingType === 'sale' &&
                prop.propertyType &&
                !prop.propertyType.toLowerCase().includes('land')
            );

        console.log(`🏠 Found ${allProperties.length} properties for sale`);

        if (skeletonLoader) skeletonLoader.style.display = 'none';
        ensurePaginationContainer();

        currentFilteredProperties = [...allProperties];
        renderProperties();
        renderDynamicFilters();
        addResetButton();
        updateAllButtons();
        applyFilterFromURL();

    } catch (error) {
        console.error('Error loading properties for sale:', error);
        if (skeletonLoader) skeletonLoader.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'block';
            const emptyTitle = emptyState.querySelector('h3');
            if (emptyTitle) emptyTitle.textContent = 'Unable to Load Properties';
            const emptyText = emptyState.querySelector('p');
            if (emptyText) emptyText.textContent = 'Please check back later.';
        }
    }
}

loadProperties();