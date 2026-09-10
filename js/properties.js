// js/property.js
// This file handles dynamic interactions on static property pages

// ========== DYNAMIC PATH HELPER ==========
const getBasePath = () => {
    if (window.location.hostname === 'sarahadevelopers.github.io') {
        return '/rentspace-markeplace';
    }
    return ''; // for rentspace.co.ke
};

const basePath = getBasePath();

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

let allProperties = [];
let currentProperty = null;

// Get property slug from current URL (for static pages)
function getPropertySlugFromURL() {
    const path = window.location.pathname;
    const match = path.match(/\/property\/(.+)\.html$/);
    return match ? match[1] : null;
}

// ========== HAMBURGER MENU TOGGLE ==========
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-links');
    const menuOverlay = document.getElementById('menuOverlay');

    if (!hamburger || !navMenu) {
        console.error('Menu elements not found');
        return;
    }

    navMenu.classList.remove('active');
    if (menuOverlay) menuOverlay.classList.remove('active');
    hamburger.classList.remove('active');
    document.body.style.overflow = '';

    function closeMenu() {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
        if (menuOverlay) menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function openMenu() {
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

    const newHamburger = hamburger.cloneNode(true);
    hamburger.parentNode.replaceChild(newHamburger, hamburger);
    newHamburger.addEventListener('click', toggleMenu);
    window.hamburgerElement = newHamburger;

    if (menuOverlay) {
        const newOverlay = menuOverlay.cloneNode(true);
        menuOverlay.parentNode.replaceChild(newOverlay, menuOverlay);
        newOverlay.addEventListener('click', closeMenu);
        window.menuOverlayElement = newOverlay;
    }

    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && navMenu.classList.contains('active')) {
            closeMenu();
        }
    });
}

// ========== MOBILE DROPDOWN TOGGLE ==========
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

// ========== GALLERY FUNCTIONALITY ==========
function initGallery() {
    const mainImg = document.getElementById('mainGalleryImg');
    const thumbs = document.querySelectorAll('.thumb');
    const prevBtn = document.getElementById('galleryPrevBtn');
    const nextBtn = document.getElementById('galleryNextBtn');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');

    if (!mainImg || thumbs.length === 0) return;

    let currentIndex = 0;

    function updateMainImage(index) {
        if (index < 0) index = 0;
        if (index >= thumbs.length) index = thumbs.length - 1;
        currentIndex = index;
        const newSrc = thumbs[currentIndex].querySelector('img').src;
        mainImg.src = newSrc;
        if (lightboxImg) lightboxImg.src = newSrc;

        thumbs.forEach(t => t.classList.remove('active'));
        thumbs[currentIndex].classList.add('active');
    }

    thumbs.forEach((thumb, i) => {
        thumb.addEventListener('click', () => updateMainImage(i));
    });

    if (prevBtn) prevBtn.addEventListener('click', () => updateMainImage(currentIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => updateMainImage(currentIndex + 1));

    if (mainImg && lightbox) {
        mainImg.addEventListener('click', () => {
            lightbox.classList.add('show');
            lightboxImg.src = mainImg.src;
        });
    }

    if (lightboxClose) lightboxClose.addEventListener('click', () => lightbox.classList.remove('show'));

    if (lightboxPrev) lightboxPrev.addEventListener('click', () => updateMainImage(currentIndex - 1));
    if (lightboxNext) lightboxNext.addEventListener('click', () => updateMainImage(currentIndex + 1));

    document.addEventListener('keydown', (e) => {
        if (lightbox && lightbox.classList.contains('show')) {
            if (e.key === 'ArrowLeft') updateMainImage(currentIndex - 1);
            if (e.key === 'ArrowRight') updateMainImage(currentIndex + 1);
            if (e.key === 'Escape') lightbox.classList.remove('show');
        }
    });

    if (thumbs.length > 0) {
        updateMainImage(0);
    }
}

// Smooth scroll to concierge section
function initSmoothScroll() {
    const inquireBtn = document.querySelector('.nav-inquire') || document.querySelector('.nav-cta');
    if (inquireBtn) {
        inquireBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const concierge = document.querySelector('.concierge-section');
            if (concierge) {
                concierge.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
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
async function loadMoreRecommendations(currentEstate, currentSlug) {
    try {
        const response = await fetch('https://rentspace-markeplace.onrender.com/api/properties');
        const data = await response.json();
        const properties = data.properties || [];

        const similar = properties
            .filter(p => p.estate === currentEstate && p.slug !== currentSlug && p.status === 'approved')
            .slice(0, 4);

        const recContainer = document.querySelector('.recommendation-cards');
        if (recContainer && similar.length > 0 && recContainer.children.length === 0) {
            similar.forEach(prop => {
                const card = document.createElement('a');
                card.href = `${basePath}/property/${prop.slug}.html`;
                card.className = 'rec-card';
                card.innerHTML = `
                    <div class="rec-card-image">
                        <img src="${prop.images?.[0] || `${basePath}/images/placeholder.jpg`}" alt="${prop.title}" loading="lazy">
                    </div>
                    <div class="rec-card-info">
                        <h4>${escapeHtml(prop.title)}</h4>
                        <p>${prop.estate} · KES ${prop.price.toLocaleString()} / mo</p>
                    </div>
                `;
                recContainer.appendChild(card);
            });
        } else if (recContainer && similar.length === 0) {
            recContainer.innerHTML = '<p class="no-rec">More properties coming soon.</p>';
        }
    } catch (error) {
        console.error('Error loading recommendations from API:', error);
        const recContainer = document.querySelector('.recommendation-cards');
        if (recContainer) {
            recContainer.innerHTML = '<p class="no-rec">Unable to load recommendations. Please check back later.</p>';
        }
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
            console.log('Open fullscreen for:', item.src);
        });
    });
}

// ========== ADD SUBSCRIPTION BADGE TO PROPERTY HEADER ==========
// ========== ADD SUBSCRIPTION BADGE TO PROPERTY HEADER ==========
async function addSubscriptionBadge() {
    const titleElement = document.querySelector('.property-title');
    if (!titleElement) return;

    // Avoid duplicates
    if (document.querySelector('.property-subscription-badge')) return;

    // Get slug from URL
    const slug = getPropertySlugFromURL();
    if (!slug) return;

    // Badge config
    const badgeConfig = {
        basic:     { label: 'Silver Listing',   color: '#c0c0c0', className: 'badge-silver' },
        pro:       { label: 'Gold Listing',     color: '#d4af37', className: 'badge-gold' },
        developer: { label: 'Platinum Listing', color: '#e5e4e2', className: 'badge-platinum' }
    };

    let plan = 'free';

    // Fetch the plan from the API
    try {
        const res = await fetch(`https://rentspace-markeplace.onrender.com/api/properties/${slug}`);
        if (res.ok) {
            const data = await res.json();
            plan = data?.property?.ownerSubscriptionPlan || 'free';
        }
    } catch (err) {
        console.warn('Could not fetch property plan:', err);
    }

    const config = badgeConfig[plan] || null;

    let badgeHTML = '';

    if (config) {
        // Subscription badge (Silver / Gold / Platinum)
        badgeHTML = `
            <span class="property-subscription-badge ${config.className}" style="
                display: inline-block;
                padding: 4px 14px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 600;
                color: ${config.color};
                border: 1px solid ${config.color}40;
                background: rgba(0,0,0,0.4);
                backdrop-filter: blur(4px);
                margin-left: 12px;
                vertical-align: middle;
            ">
                <i class="fas fa-crown" style="margin-right: 4px;"></i>
                ${config.label}
            </span>
        `;
    } else {
        // Fallback: show listing type badge for free users
        const listingType = document.querySelector('meta[name="listing-type"]')?.content || '';
        const fallbackLabel = (listingType === 'rent' || listingType === 'long_term')
            ? 'For Rent'
            : listingType === 'sale'
                ? 'For Sale'
                : 'Property';

        badgeHTML = `
            <span class="property-listing-badge" style="
                display: inline-block;
                padding: 4px 14px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 600;
                color: var(--text-muted);
                border: 1px solid var(--border);
                background: rgba(255,255,255,0.05);
                margin-left: 12px;
                vertical-align: middle;
            ">
                ${fallbackLabel}
            </span>
        `;
    }

    // Insert the badge after the title
    titleElement.insertAdjacentHTML('afterend', badgeHTML);
}

// ========== CONTACT REVEAL FEATURE ==========
const PHONE_NUMBER = "+254723562484";
const PHONE_DISPLAY = "0723 562 484";

function addContactRevealFeature() {
    const priceTag = document.querySelector('.price-tag');
    if (!priceTag) return;

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

// ========== INITIALIZE EVERYTHING ==========
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
    
    // ✅ Add subscription badge to property header
    addSubscriptionBadge();

    // Load recommendations if needed
    const recContainer = document.querySelector('.recommendation-cards');
    if (recContainer && currentProperty && recContainer.children.length === 0) {
        const currentSlug = getPropertySlugFromURL();
        loadMoreRecommendations(currentProperty.estate, currentSlug);
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