// ============================================
// LAND PORTAL - COMPLETE FUNCTIONALITY
// ============================================

// ========== DYNAMIC PATH HELPER ==========
const getBasePath = () => {
    if (window.location.hostname === 'sarahadevelopers.github.io') {
        return '/rentspace-markeplace';
    }
    return ''; // for rentspace.co.ke
};
const basePath = getBasePath();

// ========== AUTO-FILTER FROM URL PARAMETERS ==========
function getLocationFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const location = urlParams.get('location');
    const estate = urlParams.get('estate');
    const type = urlParams.get('type');
    return { location: location || estate || null, type: type || null };
}

// Dynamic year
const yearSpan = document.getElementById('year');
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// ========== HAMBURGER MENU TOGGLE ==========
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

if (navMenu) {
    const links = navMenu.querySelectorAll('a');
    links.forEach(function(link) {
        link.addEventListener('click', closeMenu);
    });
}

window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && navMenu && navMenu.classList.contains('active')) {
        closeMenu();
    }
});

// ========== MOBILE DROPDOWNS ==========
function initMobileDropdowns() {
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

if (window.innerWidth <= 768) {
    initMobileDropdowns();
}

window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
        initMobileDropdowns();
    }
});

// ========== FILTER DRAWER LOGIC ==========
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
        const neighborhoodSection = document.getElementById('neighborhoodChips');
        if (neighborhoodSection) neighborhoodSection.scrollIntoView({ behavior: 'smooth' });
    });
}
if (filterTypeBtn) {
    filterTypeBtn.addEventListener('click', () => {
        openDrawer();
        const typeSection = document.getElementById('typeChips');
        if (typeSection) typeSection.scrollIntoView({ behavior: 'smooth' });
    });
}
if (filterBudgetBtn) {
    filterBudgetBtn.addEventListener('click', () => {
        openDrawer();
        const priceSection = document.getElementById('priceRange');
        if (priceSection) priceSection.scrollIntoView({ behavior: 'smooth' });
    });
}

// ========== PAGINATION VARIABLES ==========
let allProperties = [];
let currentFilteredProperties = [];
let currentFilters = {
    neighborhood: 'all',
    type: 'all',
    maxPrice: 100000000
};
let currentPage = 1;
const ITEMS_PER_PAGE = 12;

const propertyGrid = document.getElementById('propertyGrid');
const skeletonLoader = document.getElementById('skeletonLoader');
const emptyState = document.getElementById('emptyState');
const resultCountSpan = document.getElementById('countValue');
const priceRange = document.getElementById('priceRange');
const maxPriceLabel = document.getElementById('maxPriceLabel');
let paginationContainer;

// ========== IMAGE CAROUSEL ==========
const propertyImagesMap = new Map();
let imageIntervals = [];

function stopAllImageShuffling() {
    imageIntervals.forEach(interval => clearInterval(interval));
    imageIntervals = [];
}

function startImageShuffle(cardElement, imagesArray) {
    if (!imagesArray || imagesArray.length <= 1) return;
    let currentIndex = 0;
    const imageWrapper = cardElement.querySelector('.card-image-wrapper');
    if (!imageWrapper) return;
    
    const existingImages = imageWrapper.querySelectorAll('.card-image');
    if (existingImages.length === 1 && imagesArray.length > 1) {
        const firstImage = existingImages[0];
        imageWrapper.innerHTML = '';
        imagesArray.forEach((src, idx) => {
            const img = document.createElement('img');
            img.src = src;
            img.alt = cardElement.querySelector('.card-title')?.textContent || 'Land';
            img.className = 'card-image';
            img.setAttribute('data-image-index', idx);
            img.style.position = 'absolute';
            img.style.top = '0';
            img.style.left = '0';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.transition = 'opacity 0.5s ease-in-out';
            img.style.opacity = idx === 0 ? '1' : '0';
            imageWrapper.appendChild(img);
        });
    }
    
    const images = imageWrapper.querySelectorAll('.card-image');
    if (images.length <= 1) return;
    
    const interval = setInterval(() => {
        const nextIndex = (currentIndex + 1) % images.length;
        images[currentIndex].style.opacity = '0';
        images[nextIndex].style.opacity = '1';
        currentIndex = nextIndex;
    }, 10000);
    imageIntervals.push(interval);
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
    let paginationHTML = '';
    if (currentPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="window.changePage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
    }
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="window.changePage(1)">1</button>`;
        if (startPage > 2) paginationHTML += `<span class="pagination-dots">...</span>`;
    }
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="window.changePage(${i})">${i}</button>`;
    }
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) paginationHTML += `<span class="pagination-dots">...</span>`;
        paginationHTML += `<button class="pagination-btn" onclick="window.changePage(${totalPages})">${totalPages}</button>`;
    }
    if (currentPage < totalPages) {
        paginationHTML += `<button class="pagination-btn" onclick="window.changePage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
    }
    paginationContainer.innerHTML = paginationHTML;
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
    
    paginatedProperties.forEach(prop => {
        const images = prop.images || [prop.images?.[0] || '/images/placeholder.jpg'];
        propertyImagesMap.set(prop.id, images);
    });
    
   propertyGrid.innerHTML = paginatedProperties.map(prop => {
    const images = propertyImagesMap.get(prop.id) || [prop.images?.[0] || '/images/placeholder.jpg'];
    const firstImage = images[0];
    
    // Determine land type label
    let landType = 'Land';
    if (prop.propertyType && prop.propertyType.includes('comm')) landType = 'Commercial';
    else if (prop.propertyType && prop.propertyType.includes('res')) landType = 'Residential';
    else if (prop.propertyType && prop.propertyType.includes('ranch')) landType = 'Agricultural';
    
    // ─── SUBSCRIPTION BADGE ──────────────────────────────────────
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
                <img class="card-image" src="${firstImage}" alt="${prop.title}" loading="lazy">
                <div class="card-badge">${landType}</div>
                <div class="card-price">KES ${prop.price.toLocaleString()}</div>
            </div>
            <div class="card-info">
                <h3 class="card-title">${escapeHtml(prop.title)}</h3>
                <div class="card-location">${prop.estate || 'Nairobi'}</div>
                <div class="card-features">
                    ${prop.size ? `<span><i class="fas fa-arrows-alt"></i> ${escapeHtml(prop.size)}</span>` : ''}
                    ${prop.bedrooms ? `<span><i class="fas fa-bed"></i> ${prop.bedrooms}</span>` : ''}
                    ${!prop.size && !prop.bedrooms ? '<span>View details</span>' : ''}
                </div>
                ${config ? `<div class="boost-tag"><i class="fas fa-arrow-up" style="color:${config.color};"></i> <span style="color:${config.color};">Boosted visibility</span></div>` : ''}
            </div>
            <div class="card-cta">View Details</div>
        </a>
    `;
}).join('');
    
    setTimeout(() => {
        paginatedProperties.forEach(prop => {
            const card = document.querySelector(`.property-card[data-property-id="${prop.id}"]`);
            if (card) {
                const images = propertyImagesMap.get(prop.id);
                if (images && images.length > 1) {
                    startImageShuffle(card, images);
                }
            }
        });
    }, 100);
    renderPagination();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== FILTER FUNCTIONS ==========
function applyFilters() {
    let filtered = [...allProperties];
    if (currentFilters.neighborhood !== 'all') {
        filtered = filtered.filter(prop => prop.estate === currentFilters.neighborhood);
    }
    if (currentFilters.type !== 'all') {
        filtered = filtered.filter(prop => prop.propertyType === currentFilters.type);
    }
    if (currentFilters.maxPrice < 100000000) {
        filtered = filtered.filter(prop => prop.price <= currentFilters.maxPrice);
    }
    return filtered;
}

function applyAndRender() {
    currentFilteredProperties = applyFilters();
    currentPage = 1;
    stopAllImageShuffling();
    renderProperties();
    closeDrawer();
    if (resultCountSpan) resultCountSpan.textContent = currentFilteredProperties.length;
}

function filterByLocationFromURL(location) {
    if (!location) {
        currentFilteredProperties = [...allProperties];
        currentFilters.neighborhood = 'all';
        if (filterNeighborhoodBtn) {
            filterNeighborhoodBtn.innerHTML = `Neighborhood <i class="fas fa-chevron-down"></i>`;
            filterNeighborhoodBtn.style.borderColor = '';
            filterNeighborhoodBtn.style.color = '';
        }
    } else {
        currentFilteredProperties = allProperties.filter(prop => 
            prop.estate && prop.estate.toLowerCase() === location.toLowerCase()
        );
        currentFilters.neighborhood = location;
        if (filterNeighborhoodBtn) {
            filterNeighborhoodBtn.innerHTML = `${location} <i class="fas fa-chevron-down"></i>`;
            filterNeighborhoodBtn.style.borderColor = 'var(--gold)';
            filterNeighborhoodBtn.style.color = 'var(--gold)';
        }
        const neighborhoodChips = document.querySelectorAll('#neighborhoodChips .filter-chip');
        neighborhoodChips.forEach(chip => {
            if (chip.dataset.value && chip.dataset.value.toLowerCase() === location.toLowerCase()) {
                neighborhoodChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            }
        });
    }
    currentPage = 1;
    stopAllImageShuffling();
    renderProperties();
    console.log(`📍 Showing ${currentFilteredProperties.length} land listings in: ${location || 'all locations'}`);
}

function filterByTypeFromURL(type) {
    if (!type) return;
    const matchedChip = document.querySelector(`#typeChips .filter-chip[data-value="${type}"]`);
    if (matchedChip) {
        document.querySelectorAll('#typeChips .filter-chip').forEach(c => c.classList.remove('active'));
        matchedChip.classList.add('active');
        currentFilters.type = type;
        if (filterTypeBtn) {
            const label = matchedChip.textContent.trim();
            filterTypeBtn.innerHTML = `${label} <i class="fas fa-chevron-down"></i>`;
            filterTypeBtn.style.borderColor = 'var(--gold)';
            filterTypeBtn.style.color = 'var(--gold)';
        }
        applyAndRender();
    }
}

function applyFiltersFromURL() {
    const { location, type } = getLocationFromURL();
    if (location) {
        setTimeout(() => filterByLocationFromURL(location), 100);
    }
    if (type) {
        setTimeout(() => filterByTypeFromURL(type), 150);
    }
}

window.changePage = function(page) {
    const totalPages = Math.ceil(currentFilteredProperties.length / ITEMS_PER_PAGE);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        stopAllImageShuffling();
        renderProperties();
        if (propertyGrid) propertyGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

// ========== FILTER CHIP LISTENERS ==========
function initChipListeners() {
    document.querySelectorAll('#neighborhoodChips .filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#neighborhoodChips .filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilters.neighborhood = chip.dataset.value;
            currentPage = 1;
            if (filterNeighborhoodBtn) {
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
            applyAndRender();
        });
    });

    document.querySelectorAll('#typeChips .filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#typeChips .filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilters.type = chip.dataset.value;
            currentPage = 1;
            if (filterTypeBtn) {
                if (currentFilters.type !== 'all') {
                    const label = chip.textContent.trim();
                    filterTypeBtn.innerHTML = `${label} <i class="fas fa-chevron-down"></i>`;
                    filterTypeBtn.style.borderColor = 'var(--gold)';
                    filterTypeBtn.style.color = 'var(--gold)';
                } else {
                    filterTypeBtn.innerHTML = `Land Type <i class="fas fa-chevron-down"></i>`;
                    filterTypeBtn.style.borderColor = '';
                    filterTypeBtn.style.color = '';
                }
            }
            applyAndRender();
        });
    });
    
    function updateBudgetButton() {
        if (filterBudgetBtn) {
            if (currentFilters.maxPrice < 100000000) {
                filterBudgetBtn.innerHTML = `Under KES ${currentFilters.maxPrice.toLocaleString()} <i class="fas fa-chevron-down"></i>`;
                filterBudgetBtn.style.borderColor = 'var(--gold)';
                filterBudgetBtn.style.color = 'var(--gold)';
            } else {
                filterBudgetBtn.innerHTML = `Budget <i class="fas fa-chevron-down"></i>`;
                filterBudgetBtn.style.borderColor = '';
                filterBudgetBtn.style.color = '';
            }
        }
    }
    if (priceRange) {
        priceRange.addEventListener('change', updateBudgetButton);
    }
    updateBudgetButton();
}

// ========== PRICE RANGE HANDLER ==========
if (priceRange) {
    priceRange.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (val >= 100000000) {
            if (maxPriceLabel) maxPriceLabel.textContent = 'KES 100M+';
        } else {
            if (maxPriceLabel) maxPriceLabel.textContent = `KES ${val.toLocaleString()}`;
        }
        currentFilters.maxPrice = val;
        currentPage = 1;
        applyAndRender();
    });
}

// ========== RESET FILTERS ==========
function resetFilters() {
    currentFilters = {
        neighborhood: 'all',
        type: 'all',
        maxPrice: 100000000
    };
    currentPage = 1;
    document.querySelectorAll('#neighborhoodChips .filter-chip').forEach(chip => {
        if (chip.dataset.value === 'all') chip.classList.add('active');
        else chip.classList.remove('active');
    });
    document.querySelectorAll('#typeChips .filter-chip').forEach(chip => {
        if (chip.dataset.value === 'all') chip.classList.add('active');
        else chip.classList.remove('active');
    });
    if (priceRange) {
        priceRange.value = 100000000;
        if (maxPriceLabel) maxPriceLabel.textContent = 'KES 100M+';
    }
    if (filterNeighborhoodBtn) {
        filterNeighborhoodBtn.innerHTML = `Neighborhood <i class="fas fa-chevron-down"></i>`;
        filterNeighborhoodBtn.style.borderColor = '';
        filterNeighborhoodBtn.style.color = '';
    }
    if (filterTypeBtn) {
        filterTypeBtn.innerHTML = `Land Type <i class="fas fa-chevron-down"></i>`;
        filterTypeBtn.style.borderColor = '';
        filterTypeBtn.style.color = '';
    }
    if (filterBudgetBtn) {
        filterBudgetBtn.innerHTML = `Budget <i class="fas fa-chevron-down"></i>`;
        filterBudgetBtn.style.borderColor = '';
        filterBudgetBtn.style.color = '';
    }
    stopAllImageShuffling();
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

const applyBtn = document.getElementById('applyFiltersBtn');
if (applyBtn) {
    applyBtn.addEventListener('click', () => {
        applyAndRender();
        closeDrawer();
    });
}

// ========== LOAD PROPERTIES (FILTERED FOR LAND) ==========
// ========== LOAD PROPERTIES (FILTERED FOR LAND) ==========
async function loadProperties() {
    try {
        if (skeletonLoader) skeletonLoader.style.display = 'flex';

        const response = await fetch('https://rentspace-markeplace.onrender.com/api/properties?limit=200');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const propertiesFromAPI = data.properties || [];

        // Map and filter to ONLY land properties
        allProperties = propertiesFromAPI
            .map(prop => ({
                id: prop._id,
                title: prop.title,
                slug: prop.slug,
                estate: prop.estate,
                price: Number(prop.price) || 0,
                type: prop.propertyType || 'Land',
                images: prop.images || [],
                bedrooms: prop.bedrooms || 0,
                bathrooms: prop.bathrooms || 0,
                parking: prop.parking || 0,
                size: prop.size || '',
                description: prop.description || '',
                listingType: prop.listingType,
                propertyType: prop.propertyType,
                status: prop.status,
                ownerSubscriptionPlan: prop.ownerSubscriptionPlan || 'free'
            }))
            .filter(prop =>
                prop.listingType === 'sale' &&
                prop.propertyType &&
                prop.propertyType.toLowerCase().includes('land')
            );

        console.log(`🌍 Found ${allProperties.length} land listings`);

        if (skeletonLoader) skeletonLoader.style.display = 'none';
        ensurePaginationContainer();

        currentFilteredProperties = [...allProperties];
        renderProperties();
        initChipListeners();
        addResetButton();
        applyFiltersFromURL();

    } catch (error) {
        console.error('Error loading land properties:', error);
        if (skeletonLoader) skeletonLoader.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'block';
            const emptyTitle = emptyState.querySelector('h3');
            if (emptyTitle) emptyTitle.textContent = 'Unable to Load Land Listings';
            const emptyText = emptyState.querySelector('p');
            if (emptyText) emptyText.textContent = 'Please check back later.';
        }
    }
}

window.addEventListener('beforeunload', () => {
    stopAllImageShuffling();
});

// Start loading
loadProperties();