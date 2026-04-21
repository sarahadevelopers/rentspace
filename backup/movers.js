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

// ========== MOBILE DROPDOWNS (ONLY ON MOBILE) ==========
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

// Initialize mobile dropdowns
initMobileDropdowns();
window.addEventListener('resize', initMobileDropdowns);

// ========== AUTO-FILL DESTINATION FROM URL ==========
const urlParams = new URLSearchParams(window.location.search);
const destinationParam = urlParams.get('destination');
const destinationInput = document.getElementById('destination');

if (destinationParam && destinationInput) {
  destinationInput.value = decodeURIComponent(destinationParam);
}

// ========== FORM SUBMISSION WITH WHATSAPP ==========
const form = document.getElementById('movingQuoteForm');
const overlay = document.getElementById('connectingOverlay');

if (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form values
    const origin = document.getElementById('origin').value;
    const destination = document.getElementById('destination').value;
    const volume = document.getElementById('volume').value;
    const includeFumigation = document.getElementById('includeFumigation').checked;
    
    // Validate
    if (!origin || !destination) {
      alert('Please fill in both origin and destination estates.');
      return;
    }
    
    // Build WhatsApp message
    let message = '*RENTSPACE RELOCATION INQUIRY*%0A%0A';
    message += `*Origin:* ${origin}%0A`;
    message += `*Destination:* ${destination}%0A`;
    message += `*Estate Volume:* ${volume}%0A`;
    message += `*Sanctuary Prep:* ${includeFumigation ? 'Yes, include' : 'No, thank you'}%0A%0A`;
    message += `Please reach out to discuss the logistics of this move.`;
    
    // Show connecting overlay
    overlay.classList.add('active');
    
    // Redirect to WhatsApp after a brief delay
    setTimeout(() => {
      window.location.href = `https://wa.me/254723562484?text=${message}`;
    }, 800);
  });
}

// Close overlay if user clicks on it
if (overlay) {
  overlay.addEventListener('click', () => {
    overlay.classList.remove('active');
  });
}