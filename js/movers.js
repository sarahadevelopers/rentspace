  // Dynamic year
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // ========== HAMBURGER MENU ==========
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-links');
    
    if (hamburger) {
      hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
      });
    }
    
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
        let message = '*ELITE RELOCATION INQUIRY*%0A%0A';
        message += `*Origin:* ${origin}%0A`;
        message += `*Destination:* ${destination}%0A`;
        message += `*Estate Volume:* ${volume}%0A`;
        message += `*Sanctuary Prep:* ${includeFumigation ? 'Yes, include' : 'No, thank you'}%0A%0A`;
        message += `Please reach out to discuss the logistics of this move.`;
        
        // Show connecting overlay
        overlay.classList.add('active');
        
        // Redirect to WhatsApp after a brief delay for premium feel
        setTimeout(() => {
          window.location.href = `https://wa.me/254723562484?text=${message}`;
        }, 800);
      });
    }
    
    // Close overlay if user clicks on it (optional)
    if (overlay) {
      overlay.addEventListener('click', () => {
        overlay.classList.remove('active');
      });
    }