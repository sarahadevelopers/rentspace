// js/read-more.js
// Adds a "Read More / Show Less" toggle to long property descriptions.
// Works on any page with <p class="property-description">.
// Used by both property detail pages and Airbnb detail pages.

(function () {
  'use strict';

  function initReadMore() {
    const descriptions = document.querySelectorAll('.property-description');
    if (!descriptions.length) return;

    descriptions.forEach(desc => {
      // Skip if already initialized
      if (desc.dataset.readMoreInit === 'true') return;
      desc.dataset.readMoreInit = 'true';

      // Clamp by default (CSS handles the visual clamp)
      desc.classList.add('clamped');

      // Wait a tick for layout, then check if actually clamped
      requestAnimationFrame(() => {
        const isClamped = desc.scrollHeight > desc.clientHeight + 5;

        if (!isClamped) {
          // Text is short enough — no button needed
          desc.classList.remove('clamped');
          return;
        }

        // Create the button
        const btn = document.createElement('button');
        btn.className = 'read-more-btn';
        btn.type = 'button';
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = 'Read More <i class="fas fa-chevron-down"></i>';

        btn.addEventListener('click', () => {
          const expanded = desc.classList.toggle('expanded');
          desc.classList.toggle('clamped', !expanded);
          btn.classList.toggle('expanded', expanded);
          btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
          btn.innerHTML = expanded
            ? 'Show Less <i class="fas fa-chevron-up"></i>'
            : 'Read More <i class="fas fa-chevron-down"></i>';

          // When collapsing, scroll back to top of description
          if (!expanded) {
            desc.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });

        // Insert the button right after the description
        desc.parentNode.insertBefore(btn, desc.nextSibling);
      });
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReadMore);
  } else {
    initReadMore();
  }

  // Re-run if content is dynamically added later (e.g. AJAX)
  window.initReadMore = initReadMore;
})();