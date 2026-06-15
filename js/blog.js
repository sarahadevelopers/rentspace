// ========== DYNAMIC PATH HELPER ==========
const getBasePath = () => {
    if (window.location.hostname === 'sarahadevelopers.github.io') {
        return '/rentspace';
    }
    return '';
};
const basePath = getBasePath();

// Default placeholder image (working URL)
const DEFAULT_IMAGE = 'https://placehold.co/600x400/1a1a1a/c9a45c?text=No+Image';

// ========== SAFELY UPDATE ELEMENT TEXT ==========
function safeSetText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function safeSetHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

// Dynamic year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

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

// ========== BLOG DATA WITH PAGINATION ==========
let allBlogPosts = [];
let currentCategory = 'all';
let currentPage = 1;
const postsPerPage = 12;
let isLoading = false;
let loadingTimeout = null;

function getValidImageUrl(imageUrl) {
    if (!imageUrl || imageUrl === '' || imageUrl.includes('placeholder')) {
        return DEFAULT_IMAGE;
    }
    return imageUrl;
}

// Update category counts – only for categories that actually exist in the HTML
function updateCategoryCounts() {
    // Only these categories have corresponding span elements in your blog.html
    const categoriesToUpdate = ['kitengela', 'syokimau'];
    
    // Count posts per category
    const counts = { kitengela: 0, syokimau: 0 };
    for (const post of allBlogPosts) {
        if (post.category === 'kitengela') counts.kitengela++;
        else if (post.category === 'syokimau') counts.syokimau++;
    }
    
    // Safely update each count element if it exists
    categoriesToUpdate.forEach(cat => {
        safeSetText(`${cat}Count`, counts[cat] || 0);
    });
}

// Render blog posts with pagination
function renderBlogPosts() {
    const blogGrid = document.getElementById('blogGrid');
    const paginationDiv = document.getElementById('pagination');
    
    if (!blogGrid) return; // Exit if grid doesn't exist
    
    let filteredPosts = allBlogPosts;
    if (currentCategory !== 'all') {
        filteredPosts = allBlogPosts.filter(post => post.category === currentCategory);
    }
    
    const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
    const start = (currentPage - 1) * postsPerPage;
    const paginatedPosts = filteredPosts.slice(start, start + postsPerPage);
    
    if (paginatedPosts.length === 0) {
        blogGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px;">
                <i class="fas fa-newspaper" style="font-size: 48px; color: var(--gold); opacity: 0.5; margin-bottom: 20px;"></i>
                <h3>No posts found</h3>
            </div>
        `;
        if (paginationDiv) paginationDiv.style.display = 'none';
        return;
    }
    
    blogGrid.innerHTML = paginatedPosts.map(post => {
        const imageUrl = getValidImageUrl(post.image);
        return `
            <a href="${basePath}/blog/${post.slug}.html" class="blog-card">
                <img src="${imageUrl}" alt="${escapeHtml(post.title)}" class="blog-image" loading="lazy">
                <div class="blog-content">
                    <span class="blog-category">${(post.category || '').toUpperCase()}</span>
                    <h3 class="blog-title">${escapeHtml(post.title)}</h3>
                    <p class="blog-excerpt">${(post.excerpt || '').substring(0, 120)}${(post.excerpt || '').length > 120 ? '...' : ''}</p>
                    <div class="blog-meta">
                        <span><i class="far fa-calendar-alt"></i> ${post.date || ''}</span>
                        <span><i class="far fa-clock"></i> ${post.readTime || '5 min'}</span>
                        <span class="read-more">Read More <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>
            </a>
        `;
    }).join('');
    
    if (!paginationDiv) return;
    
    if (totalPages <= 1) {
        paginationDiv.style.display = 'none';
        return;
    }
    
    let paginationHTML = '';
    if (currentPage > 1) {
        paginationHTML += `<a href="#" class="page-link" data-page="${currentPage - 1}"><i class="fas fa-chevron-left"></i></a>`;
    }
    
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        paginationHTML += `<a href="#" class="page-link" data-page="1">1</a>`;
        if (startPage > 2) paginationHTML += `<span class="page-dots">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<a href="#" class="page-link ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</a>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) paginationHTML += `<span class="page-dots">...</span>`;
        paginationHTML += `<a href="#" class="page-link" data-page="${totalPages}">${totalPages}</a>`;
    }
    
    if (currentPage < totalPages) {
        paginationHTML += `<a href="#" class="page-link" data-page="${currentPage + 1}"><i class="fas fa-chevron-right"></i></a>`;
    }
    
    paginationDiv.innerHTML = paginationHTML;
    paginationDiv.style.display = 'flex';
    
    document.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page);
            if (!isNaN(page)) {
                currentPage = page;
                renderBlogPosts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

// Popular posts (top 3 by views)
function renderPopularPosts() {
    const container = document.getElementById('popularPosts');
    if (!container) return;
    
    if (allBlogPosts.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">No posts yet</p>';
        return;
    }
    
    const popular = [...allBlogPosts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3);
    container.innerHTML = popular.map(post => {
        const imageUrl = getValidImageUrl(post.image);
        return `
            <a href="${basePath}/blog/${post.slug}.html" class="popular-post">
                <img src="${imageUrl}" alt="${escapeHtml(post.title)}" loading="lazy">
                <div>
                    <h4>${escapeHtml(post.title.length > 50 ? post.title.substring(0, 50) + '...' : post.title)}</h4>
                    <p>${post.date || ''} · ${post.readTime || '5 min'}</p>
                </div>
            </a>
        `;
    }).join('');
}

// Category filter buttons (top buttons)
function initCategoryFilters() {
    const categoryBtns = document.querySelectorAll('.category-btn');
    if (categoryBtns.length === 0) return;
    
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            currentPage = 1;
            renderBlogPosts();
        });
    });
    
    // Sidebar category links
    const categoryLinks = document.querySelectorAll('#categoryList a');
    categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.dataset.category;
            // Update top buttons active state
            categoryBtns.forEach(btn => {
                if (btn.dataset.category === category) btn.classList.add('active');
                else btn.classList.remove('active');
            });
            currentCategory = category;
            currentPage = 1;
            renderBlogPosts();
        });
    });
}

// Search functionality
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchTerm = e.target.value.toLowerCase().trim();
            if (searchTerm.length === 0) {
                renderBlogPosts();
                return;
            }
            
            let filtered = allBlogPosts;
            if (currentCategory !== 'all') {
                filtered = filtered.filter(p => p.category === currentCategory);
            }
            
            const searched = filtered.filter(p => 
                (p.title || '').toLowerCase().includes(searchTerm) || 
                (p.excerpt || '').toLowerCase().includes(searchTerm)
            );
            
            const blogGrid = document.getElementById('blogGrid');
            const paginationDiv = document.getElementById('pagination');
            
            if (!blogGrid) return;
            
            if (searched.length === 0) {
                blogGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;"><i class="fas fa-search" style="font-size:48px;color:var(--gold);opacity:0.5;margin-bottom:20px;"></i><h3>No results found for "${escapeHtml(searchTerm)}"</h3></div>`;
                if (paginationDiv) paginationDiv.style.display = 'none';
            } else {
                const paginated = searched.slice(0, postsPerPage);
                blogGrid.innerHTML = paginated.map(post => {
                    const imageUrl = getValidImageUrl(post.image);
                    return `
                        <a href="${basePath}/blog/${post.slug}.html" class="blog-card">
                            <img src="${imageUrl}" alt="${escapeHtml(post.title)}" class="blog-image" loading="lazy">
                            <div class="blog-content">
                                <span class="blog-category">${(post.category || '').toUpperCase()}</span>
                                <h3 class="blog-title">${escapeHtml(post.title)}</h3>
                                <p class="blog-excerpt">${(post.excerpt || '').substring(0, 120)}...</p>
                                <div class="blog-meta">
                                    <span><i class="far fa-calendar-alt"></i> ${post.date || ''}</span>
                                    <span><i class="far fa-clock"></i> ${post.readTime || '5 min'}</span>
                                    <span class="read-more">Read More <i class="fas fa-arrow-right"></i></span>
                                </div>
                            </div>
                        </a>
                    `;
                }).join('');
                if (paginationDiv) paginationDiv.style.display = 'none';
            }
        }, 300);
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

// Load posts from JSON file
async function loadPosts() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const blogGrid = document.getElementById('blogGrid');
    
    if (!loadingSpinner || !blogGrid) return;
    
    loadingTimeout = setTimeout(() => {
        if (isLoading) {
            loadingSpinner.innerHTML = `
                <div style="text-align: center;">
                    <div class="spinner"></div>
                    <p style="margin-top: 1rem;">Loading posts... Please wait</p>
                </div>
            `;
        }
    }, 2000);
    
    isLoading = true;
    
    try {
        const response = await fetch(`${basePath}/data/posts.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        allBlogPosts = await response.json();
        console.log(`✅ Loaded ${allBlogPosts.length} blog posts`);
        
        clearTimeout(loadingTimeout);
        
        loadingSpinner.style.display = 'none';
        blogGrid.style.display = 'grid';
        
        updateCategoryCounts();
        renderBlogPosts();
        renderPopularPosts();
        initCategoryFilters();
        initSearch();
        
    } catch (error) {
        console.error('Error loading posts:', error);
        clearTimeout(loadingTimeout);
        loadingSpinner.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; color: var(--gold); margin-bottom: 20px;"></i>
                <h3>Unable to load blog posts</h3>
                <p style="color: var(--text-muted);">Please refresh the page or try again later.</p>
                <button onclick="location.reload()" style="margin-top: 1rem; background: var(--gold); color: #000; border: none; padding: 10px 24px; border-radius: 40px; cursor: pointer;">Retry</button>
            </div>
        `;
    } finally {
        isLoading = false;
    }
}

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
    loadPosts();
    initMobileDropdowns();
});