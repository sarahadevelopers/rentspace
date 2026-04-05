// ============================================
// RENTALS PORTAL - COMPLETE FUNCTIONALITY
// ============================================

// ========== AUTO-FILTER FROM URL PARAMETERS ==========
function getLocationFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const location = urlParams.get('location');
    const estate = urlParams.get('estate');
    return location || estate || null;
}

// Dynamic year
const yearSpan = document.getElementById('year');
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// ========== HAMBURGER MENU TOGGLE (SIMPLIFIED) ==========
const hamburger = document.getElementById('hamburger');
const navMenu = document.querySelector('.nav-links');
const menuOverlay = document.getElementById('menuOverlay');

// Ensure menu starts closed
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

// Close menu when clicking any link inside
if (navMenu) {
    const links = navMenu.querySelectorAll('a');
    links.forEach(function(link) {
        link.addEventListener('click', closeMenu);
    });
}

// Close menu on window resize
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
            // Remove existing listeners to avoid duplicates
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

// Initialize dropdowns on mobile
if (window.innerWidth <= 768) {
    initMobileDropdowns();
}

// Re-initialize on resize
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

// Quick filter buttons on strip
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
    maxPrice: 500000
};
let currentPage = 1;
const ITEMS_PER_PAGE = 12;

// Elements
const propertyGrid = document.getElementById('propertyGrid');
const skeletonLoader = document.getElementById('skeletonLoader');
const emptyState = document.getElementById('emptyState');
const resultCountSpan = document.getElementById('countValue');
const priceRange = document.getElementById('priceRange');
const maxPriceLabel = document.getElementById('maxPriceLabel');
let paginationContainer;

// ========== AUTO-SHUFFLING IMAGE CAROUSEL ==========
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
            img.alt = cardElement.querySelector('.card-title')?.textContent || 'Property';
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
    }, 3000);
    
    imageIntervals.push(interval);
}

// ========== PAGINATION FUNCTIONS ==========
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
        
        return `
            <a href="/property/${prop.slug}.html" class="property-card" data-property-id="${prop.id}">
                <div class="card-image-wrapper">
                    <img class="card-image" src="${firstImage}" alt="${prop.title}" loading="lazy">
                    <div class="card-badge">${prop.type}</div>
                    <div class="card-price">KES ${prop.price.toLocaleString()}/mo</div>
                </div>
                <div class="card-info">
                    <h3 class="card-title">${escapeHtml(prop.title)}</h3>
                    <div class="card-location">${prop.estate}, Nairobi</div>
                    <div class="card-features">
                        <span><i class="fas fa-bed"></i> ${prop.specs?.bedrooms || 0}</span>
                        <span><i class="fas fa-bath"></i> ${prop.specs?.bathrooms || 0}</span>
                        <span><i class="fas fa-car"></i> ${prop.specs?.parking || 0}</span>
                    </div>
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
        filtered = filtered.filter(prop => prop.type === currentFilters.type);
    }
    if (currentFilters.maxPrice < 500000) {
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

// ========== FILTER BY LOCATION FROM URL ==========
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
    
    console.log(`📍 Showing ${currentFilteredProperties.length} properties for: ${location || 'all locations'}`);
}

// ========== APPLY FILTER FROM URL ON PAGE LOAD ==========
function applyFilterFromURL() {
    const location = getLocationFromURL();
    if (location) {
        setTimeout(() => filterByLocationFromURL(location), 100);
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
                    filterTypeBtn.innerHTML = `${currentFilters.type} <i class="fas fa-chevron-down"></i>`;
                    filterTypeBtn.style.borderColor = 'var(--gold)';
                    filterTypeBtn.style.color = 'var(--gold)';
                } else {
                    filterTypeBtn.innerHTML = `Property Type <i class="fas fa-chevron-down"></i>`;
                    filterTypeBtn.style.borderColor = '';
                    filterTypeBtn.style.color = '';
                }
            }
            
            applyAndRender();
        });
    });
    
    function updateBudgetButton() {
        if (filterBudgetBtn) {
            if (currentFilters.maxPrice < 500000) {
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
        if (val >= 500000) {
            if (maxPriceLabel) maxPriceLabel.textContent = 'KES 500,000+';
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
        maxPrice: 500000
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
        priceRange.value = 500000;
        if (maxPriceLabel) maxPriceLabel.textContent = 'KES 500,000+';
    }
    
    if (filterNeighborhoodBtn) {
        filterNeighborhoodBtn.innerHTML = `Neighborhood <i class="fas fa-chevron-down"></i>`;
        filterNeighborhoodBtn.style.borderColor = '';
        filterNeighborhoodBtn.style.color = '';
    }
    if (filterTypeBtn) {
        filterTypeBtn.innerHTML = `Property Type <i class="fas fa-chevron-down"></i>`;
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

// ========== APPLY FILTERS BUTTON ==========
const applyBtn = document.getElementById('applyFiltersBtn');
if (applyBtn) {
    applyBtn.addEventListener('click', () => {
        applyAndRender();
        closeDrawer();
    });
}

// ========== LOAD PROPERTIES ==========
async function loadProperties() {
    try {
        const response = await fetch('/rentspace/data/properties.json');
        allProperties = await response.json();
        
        if (skeletonLoader) skeletonLoader.style.display = 'none';
        ensurePaginationContainer();
        
        currentFilteredProperties = [...allProperties];
        
        renderProperties();
        initChipListeners();
        addResetButton();
        
        applyFilterFromURL();
        
    } catch (error) {
        console.error('Error loading properties:', error);
        if (skeletonLoader) skeletonLoader.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'block';
            const emptyTitle = emptyState.querySelector('h3');
            if (emptyTitle) emptyTitle.textContent = 'Unable to Load Properties';
        }
    }
}

// Clean up intervals on page unload
window.addEventListener('beforeunload', () => {
    stopAllImageShuffling();
});

// Start loading
loadProperties();