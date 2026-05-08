(function() {
    // ========== DYNAMIC PATH HELPER ==========
    const getBasePath = () => {
        if (window.location.hostname === 'sarahadevelopers.github.io') {
            return '/rentspace';
        }
        return '';
    };
    const basePath = getBasePath();

    // Wait for DOM to be fully ready
    document.addEventListener('DOMContentLoaded', function() {
        // Set copyright year (safe)
        const yearSpan = document.getElementById('year');
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
        
        // ========== HAMBURGER MENU (only if elements exist) ==========
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

        if (navMenu) {
            const navLinks = navMenu.querySelectorAll('a');
            navLinks.forEach(link => {
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
            if (window.innerWidth > 768) return;
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
        initMobileDropdowns();
        window.addEventListener('resize', initMobileDropdowns);

        // ========== BLOG-ONLY FUNCTIONALITY (skip if not a blog post) ==========
        const categoryElement = document.querySelector('.post-category');
        if (!categoryElement) {
            // Not a blog post page – exit early (no errors)
            return;
        }

        const blogCategory = categoryElement.textContent.trim().toLowerCase();
        const categoryDisplayName = blogCategory.charAt(0).toUpperCase() + blogCategory.slice(1);
        const categorySlug = blogCategory.toLowerCase();

        // ========== RUIRU → SYOKIMAU TRANSFORMATION (only for syokimau) ==========
        function transformRuiruToSyokimau() {
            if (blogCategory !== 'syokimau') return;

            const replacements = [
                { from: /\bRuiru\b/g, to: 'Syokimau' },
                { from: /\bruiru\b/g, to: 'syokimau' },
                { from: /\bMwihoko\b/g, to: 'Katani' },
                { from: /\bKahawa Sukari\b/g, to: 'Gateway Mall area' },
                { from: /\bKamakis\b/g, to: 'Greatwall estate' },
                { from: /\bMembley\b/g, to: 'Syokimau proper' },
                { from: /\bKimbo\b/g, to: 'Lukenya' },
                { from: /\bGwa Kairu\b/g, to: 'Kwa Jomvu' },
                { from: /\bTatu City\b/g, to: 'Syokimau Heights' },
                { from: /Thika Road/g, to: 'Mombasa Road / Syokimau Railway' }
            ];

            function replaceInElement(el) {
                if (!el) return;
                if (el.nodeType === Node.TEXT_NODE) {
                    let text = el.nodeValue;
                    let changed = false;
                    for (const { from, to } of replacements) {
                        const newText = text.replace(from, to);
                        if (newText !== text) {
                            text = newText;
                            changed = true;
                        }
                    }
                    if (changed) el.nodeValue = text;
                } else if (el.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE'].includes(el.tagName)) {
                    Array.from(el.childNodes).forEach(replaceInElement);
                }
            }

            // Replace in title, meta tags, and visible content
            if (document.title) {
                let newTitle = document.title;
                for (const { from, to } of replacements) {
                    newTitle = newTitle.replace(from, to);
                }
                if (newTitle !== document.title) document.title = newTitle;
            }

            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc && metaDesc.content) {
                let newDesc = metaDesc.content;
                for (const { from, to } of replacements) {
                    newDesc = newDesc.replace(from, to);
                }
                if (newDesc !== metaDesc.content) metaDesc.content = newDesc;
            }

            const postTitle = document.querySelector('.post-title');
            if (postTitle) replaceInElement(postTitle);

            const postContent = document.querySelector('.post-content');
            if (postContent) replaceInElement(postContent);

            const faqSection = document.querySelector('.faq-section');
            if (faqSection) replaceInElement(faqSection);
        }

        transformRuiruToSyokimau();

        // Update recommendation headers (safe)
        const recHeader = document.querySelector('.recommendation-header h3');
        const recHeaderText = document.querySelector('.recommendation-header p');
        const viewAllLink = document.getElementById('viewAllLink');
        const airbnbViewAllLink = document.getElementById('airbnbViewAllLink');
        
        if (recHeader) recHeader.innerHTML = `🏠 Currently Available in ${categoryDisplayName}`;
        if (recHeaderText) recHeaderText.innerHTML = `Explore these hand-picked long-term properties in ${categoryDisplayName}. Find your perfect home today.`;
        if (viewAllLink) viewAllLink.href = `${basePath}/rentals.html?estate=${categoryDisplayName}`;
        if (airbnbViewAllLink) airbnbViewAllLink.href = `${basePath}/airbnb.html?location=${categorySlug}`;

        // Helper: nearby estates
        function getNearbyEstates(category) {
            const nearbyMap = {
                'kitengela': ['athi river', 'syokimau', 'machakos'],
                'ngong': ['kibiko', 'matasia', 'karen'],
                'syokimau': ['katani', 'gateway mall', 'greatwall', 'lukenya'],
                'karen': ['langata', 'hardy', 'miotoni'],
                'kilimani': ['hurlingham', 'lavington', 'kileleshwa'],
                'hurlingham': ['kilimani', 'upper hill', 'cbd']
            };
            return nearbyMap[category] || [];
        }

        // ========== LOAD PROPERTY RECOMMENDATIONS (with error handling) ==========
        async function loadPropertyRecommendations() {
            const grid = document.getElementById('recommendationGrid');
            if (!grid) return;

            try {
                const response = await fetch(`${basePath}/data/properties.json`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const properties = await response.json();
                
                const filtered = properties.filter(prop => 
                    prop.estate && prop.estate.toLowerCase() === blogCategory &&
                    (!prop.available_for || prop.available_for.includes('long_term'))
                );
                const recommendations = filtered.slice(0, 3);

                if (recommendations.length === 0) {
                    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px;">
                        <i class="fas fa-home" style="font-size:48px; color:var(--gold); opacity:0.5;"></i>
                        <h4>No long-term properties currently listed in ${categoryDisplayName}</h4>
                        <p>Contact our concierge for off-market opportunities.</p>
                        <a href="${basePath}/contact.html" style="display:inline-block; margin-top:1rem; background:var(--gold); color:#000; padding:10px 24px; border-radius:40px;">Contact Concierge →</a>
                    </div>`;
                    return;
                }

                grid.innerHTML = recommendations.map(prop => `
                    <a href="${basePath}/property/${prop.slug}.html" class="rec-property-card">
                        <img src="${prop.images?.[0] || `${basePath}/images/placeholder.jpg`}" alt="${prop.title}" class="rec-property-image" loading="lazy">
                        <div class="rec-property-info">
                            <h4 class="rec-property-title">${escapeHtml(prop.title)}</h4>
                            <div class="rec-property-location">${escapeHtml(prop.estate)}, Nairobi</div>
                            <div class="rec-property-features">
                                <span><i class="fas fa-bed"></i> ${prop.specs?.bedrooms || 0}</span>
                                <span><i class="fas fa-bath"></i> ${prop.specs?.bathrooms || 0}</span>
                                <span><i class="fas fa-car"></i> ${prop.specs?.parking || 0}</span>
                            </div>
                            <div class="rec-property-price">KES ${prop.price.toLocaleString()} / month</div>
                            <div class="rec-property-cta">View Details →</div>
                        </div>
                    </a>
                `).join('');
            } catch (err) {
                console.warn('Property load error:', err);
                grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px;"><p>Unable to load properties. Please check back later.</p></div>`;
            }
        }

        async function loadAirbnbRecommendations() {
            const container = document.getElementById('airbnbGrid');
            if (!container) return;

            try {
                const response = await fetch(`${basePath}/data/properties.json`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const allProperties = await response.json();

                const airbnbProps = allProperties.filter(p => 
                    p.rental_type === 'short_term' || (p.available_for && p.available_for.includes('short_term'))
                );
                let recommendations = airbnbProps.filter(p => 
                    p.estate && p.estate.toLowerCase() === blogCategory
                );
                if (recommendations.length < 3) {
                    const nearby = getNearbyEstates(blogCategory);
                    const nearbyProps = airbnbProps.filter(p => nearby.includes(p.estate.toLowerCase()));
                    recommendations = [...recommendations, ...nearbyProps];
                }
                recommendations = recommendations.filter((v,i,a) => a.findIndex(t => t.id === v.id) === i).slice(0,3);

                if (recommendations.length > 0) {
                    container.innerHTML = `<div class="airbnb-recommendation-grid">
                        ${recommendations.map(prop => {
                            const nightly = prop.price_night || Math.round(prop.price / 30);
                            return `
                            <a href="${basePath}/airbnb/${prop.slug}.html" class="airbnb-card">
                                <div class="airbnb-card-image">
                                    <img src="${prop.images?.[0] || `${basePath}/images/placeholder.jpg`}" alt="${prop.title}" loading="lazy">
                                    <span class="airbnb-badge"><i class="fab fa-airbnb"></i> Short-stay</span>
                                </div>
                                <div class="airbnb-card-info">
                                    <h4>${escapeHtml(prop.title)}</h4>
                                    <p class="airbnb-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(prop.estate)}, Nairobi</p>
                                    <div class="airbnb-features">
                                        <span><i class="fas fa-bed"></i> ${prop.specs?.bedrooms || 0}</span>
                                        <span><i class="fas fa-bath"></i> ${prop.specs?.bathrooms || 0}</span>
                                        <span><i class="fas fa-users"></i> ${(prop.specs?.bedrooms || 0) * 2} guests</span>
                                    </div>
                                    <div class="airbnb-rating">
                                        <i class="fas fa-star"></i> <span>${prop.airbnb_rating || '4.9'}</span>
                                        <span class="reviews">(${prop.airbnb_reviews || 25} reviews)</span>
                                    </div>
                                    <div class="airbnb-price">
                                        <span class="nightly">KES ${nightly.toLocaleString()}<span>/night</span></span>
                                        <span class="book-btn">Book Now →</span>
                                    </div>
                                </div>
                            </a>`;
                        }).join('')}
                    </div>`;
                } else {
                    container.innerHTML = `<div class="airbnb-empty"><i class="fab fa-airbnb"></i><p>No short-stay properties currently available in ${categoryDisplayName}.</p><a href="${basePath}/contact.html" class="airbnb-contact-btn">Contact Concierge →</a></div>`;
                }
            } catch (err) {
                console.warn('Airbnb load error:', err);
                container.innerHTML = '<div class="airbnb-empty"><p>Unable to load short-stay properties. Please check back later.</p></div>';
            }
        }

        async function loadRelatedPosts() {
            const container = document.getElementById('relatedPosts');
            if (!container) return;
            try {
                const response = await fetch('../data/posts.json');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const posts = await response.json();
                const currentSlug = window.location.pathname.split('/').pop().replace('.html', '');
                const currentPost = posts.find(p => p.slug === currentSlug);
                if (currentPost) {
                    const related = posts.filter(p => p.category === currentPost.category && p.slug !== currentSlug).slice(0,3);
                    if (related.length === 0) {
                        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-muted);">More articles coming soon.</p>';
                    } else {
                        container.innerHTML = related.map(post => `
                            <a href="${basePath}/blog/${post.slug}.html" style="text-decoration:none;">
                                <img src="${post.image}" alt="${post.title}" style="width:100%; height:150px; object-fit:cover; border-radius:12px;">
                                <div style="padding:12px 0;"><h4 style="font-size:14px; font-weight:500; color:var(--text-primary);">${escapeHtml(post.title)}</h4><p style="font-size:11px; color:var(--text-muted);">${post.date}</p></div>
                            </a>
                        `).join('');
                    }
                }
            } catch (err) {
                console.warn('Related posts error:', err);
                container.innerHTML = '<p style="grid-column:1/-1; text-align:center;">Could not load related posts.</p>';
            }
        }

        // Helper to prevent XSS
        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        }

        // Initialize all blog features
        loadPropertyRecommendations();
        loadAirbnbRecommendations();
        loadRelatedPosts();
    });
})();