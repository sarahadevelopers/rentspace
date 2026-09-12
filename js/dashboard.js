// =============================================
// dashboard.js – RentSpace full version
// =============================================
// This file handles:
// - JWT authentication (token from localStorage)
// - CRUD operations for properties (only for the logged-in user)
// - Image upload with preview (Cloudinary via backend)
// - Features/amenities management
// - Pagination, image modal, toasts
// - Dynamic price labels for Sale/Rent/Airbnb
// - Subscription management (plans, upgrade, STK push)
// - Auto-retry property creation after subscription
// - AVAILABLE_FOR & RENTAL_TYPE auto‑computed from listing type
// =============================================

// =========================
// Global State
// =========================
let currentEditId = null;
let existingImages = [];
let existingPublicIds = [];
let allProperties = [];
let features = [];
let selectedImages = [];
let pendingFormData = null; // Store form data for retry
let filterStatus = 'all';
let filterType = 'all';
let filterEstate = 'all';
// ─── Global Constants ──────────────────────────────────────────
const PLAN_DISPLAY_MAP = {
    free: 'Bronze',
    basic: 'Silver',
    pro: 'Gold',
    developer: 'Platinum'
};

// =========================
// Properties Table
// =========================
const PropertiesTable = {
  currentPage: 1,
  itemsPerPage: 10,
  sortField: 'createdAt',    // default sort
  sortDirection: 'desc',     // 'asc' or 'desc'

  // ── Get filtered + sorted properties ──
   getFilteredAndSortedProperties() {
    // 1. Filter
    let filtered = [...allProperties];

    if (filterStatus && filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }
    if (filterType && filterType !== 'all') {
      filtered = filtered.filter(p => p.propertyType === filterType);
    }
    if (filterEstate && filterEstate !== 'all') {
      filtered = filtered.filter(p => p.estate === filterEstate);
    }

    // 2. Sort (precompute keys once per item)
    const field = this.sortField;
    const dir = this.sortDirection === 'asc' ? 1 : -1;

    const normalisers = {
      price:        v => Number(v) || 0,
      createdAt:    v => (v ? new Date(v).getTime() : 0),
      title:        v => String(v || '').toLowerCase(),
      estate:       v => String(v || '').toLowerCase(),
      propertyType: v => String(v || '').toLowerCase(),
      status:       v => String(v || '').toLowerCase()
    };
    const normalise = normalisers[field] || (v => v);

    filtered = filtered
      .map(p => ({ p, key: normalise(p[field]) }))
      .sort((a, b) => {
        if (a.key < b.key) return -1 * dir;
        if (a.key > b.key) return 1 * dir;
        return 0;
      })
      .map(({ p }) => p);

    return filtered;
  },
  // ── Render the table with current filters + sorting ──
  render(properties) {
    allProperties = properties;
    this.currentPage = 1;
    // Reset sort to default
    this.sortField = 'createdAt';
    this.sortDirection = 'desc';
    this.renderPage();
    this.renderPagination();
    if (propertyCountDisplay) propertyCountDisplay.textContent = properties.length;
 // ── Populate estate filter from the loaded properties ──
    populateEstateFilter();

  },

  renderPage() {
    if (!propertiesTable) return;

    // Get filtered + sorted data
    const displayProperties = this.getFilteredAndSortedProperties();

    const start = (this.currentPage - 1) * this.itemsPerPage;
    const pageProperties = displayProperties.slice(start, start + this.itemsPerPage);

    if (!displayProperties.length) {
      propertiesTable.innerHTML = `
        <tr>
          <td colspan="8" class="text-center" style="padding:40px;">
            <i class="fas fa-filter" style="font-size:32px; color:var(--text-muted); opacity:0.3; display:block; margin-bottom:12px;"></i>
            <p style="color:var(--text-light);">No properties match your current filters</p>
            <button class="btn btn-outline" id="clearFiltersFromEmpty" style="margin-top:12px;">
              <i class="fas fa-times"></i> Clear Filters
            </button>
          </td>
        </tr>
      `;
      document.getElementById('clearFiltersFromEmpty')?.addEventListener('click', clearFilters);
      return;
    }

    // Build table rows
    propertiesTable.innerHTML = '';
    pageProperties.forEach(property => {
      const tr = document.createElement('tr');
      const thumbSrc = property.images && property.images[0]
        ? property.images[0]
        : 'https://via.placeholder.com/44x34?text=No+Img';
      let listingDisplay = (property.listingType || '').toUpperCase();
      if (property.isAirbnb) listingDisplay = 'AIRBNB';

      tr.innerHTML = `
  <td data-label="Title"><strong>${this.escapeHtml(property.title)}</strong></td>
  <td data-label="Images">
    <div style="display:flex;align-items:center;gap:10px;">
      <img src="${thumbSrc}" alt="thumb" style="width:44px;height:34px;object-fit:cover;border-radius:8px;cursor:pointer;"
           data-property-id="${property._id}" class="thumbnail-clickable">
      <span class="badge bg-success">${property.images ? property.images.length : 0}</span>
    </div>
  </td>
  <td data-label="Estate">${this.escapeHtml(property.estate || '')}</td>
  <td data-label="Type">${this.escapeHtml(property.propertyType || '')}</td>
  <td data-label="Listing">${listingDisplay}</td>
  <td data-label="Price">${Utils.formatPrice(property.price)}</td>
  <td data-label="Status"><span class="status-badge ${property.status || 'draft'}">${property.status || 'Draft'}</span></td>
  <td data-label="Actions" class="actions-cell">
    <button class="btn btn-sm btn-edit edit-btn" data-id="${property._id}"><i class="fas fa-edit"></i> Edit</button>
    <button class="btn btn-sm btn-delete delete-btn" data-id="${property._id}"><i class="fas fa-trash"></i> Delete</button>
  </td>
`;
      propertiesTable.appendChild(tr);
    });

    // Update result count (outside the table)
    const resultSpan = document.getElementById('filterResultCount');
    if (resultSpan) {
      const hasFilters = (filterStatus !== 'all' || filterType !== 'all' || filterEstate !== 'all');
      if (hasFilters) {
        resultSpan.innerHTML = `Showing <span>${displayProperties.length}</span> of ${allProperties.length} properties`;
      } else {
        resultSpan.innerHTML = `Showing <span>${displayProperties.length}</span> properties`;
      }
    }

    this.attachEventListeners();

    // ── Attach sort handlers to table headers ──
    this.attachSortHandlers();
  },

  // ── Render pagination using filtered data ──
  renderPagination() {
    if (!paginationControls) return;
    const displayProperties = this.getFilteredAndSortedProperties();
    const totalPages = Math.ceil(displayProperties.length / this.itemsPerPage);

    if (totalPages <= 1) {
      paginationControls.innerHTML = '';
      return;
    }

    let html = '';
    if (this.currentPage > 1) {
      html += `<button class="pagination-btn" data-page="${this.currentPage - 1}">Prev</button>`;
    }
    for (let i = 1; i <= totalPages; i++) {
      if (i === this.currentPage) {
        html += `<button class="pagination-btn active" data-page="${i}">${i}</button>`;
      } else if (Math.abs(i - this.currentPage) <= 2 || i === 1 || i === totalPages) {
        html += `<button class="pagination-btn" data-page="${i}">${i}</button>`;
      } else if (Math.abs(i - this.currentPage) === 3) {
        html += `<span style="margin:0 4px;">...</span>`;
      }
    }
    if (this.currentPage < totalPages) {
      html += `<button class="pagination-btn" data-page="${this.currentPage + 1}">Next</button>`;
    }

    paginationControls.innerHTML = html;
    paginationControls.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const page = parseInt(btn.dataset.page);
        if (!isNaN(page)) {
          this.currentPage = page;
          this.renderPage();
          this.renderPagination();
        }
      });
    });
  },

  // ── Attach sort handlers to column headers ──
    attachSortHandlers() {
    const thead = document.querySelector('#propertiesTable thead');
    if (!thead) return;

    // 1. Strip existing listeners & arrows by cloning each <th>
    thead.querySelectorAll('th').forEach(th => {
      const newTh = th.cloneNode(true);
      th.parentNode.replaceChild(newTh, th);
    });

    // 2. Bind click handlers based on the data-sort attribute
    thead.querySelectorAll('th').forEach(th => {
      const field = th.dataset.sort;
      if (!field) return;   // Images, Listing, Actions → not sortable

      th.style.cursor = 'pointer';
      th.title = 'Click to sort';

      th.addEventListener('click', () => {
        // Toggle direction if same field, else set to asc
        if (this.sortField === field) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortField = field;
          this.sortDirection = 'asc';
        }
        this.currentPage = 1;
        this.renderPage();
        this.renderPagination();
      });

      // Show current sort indicator
      if (this.sortField === field) {
        const arrow = this.sortDirection === 'asc' ? ' ▲' : ' ▼';
        th.textContent = th.textContent.replace(/[ ▲▼]/g, '') + arrow;
      }
    });
  },

  // ── Other helper methods ──
  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  },

  attachEventListeners() {
    // Edit buttons
    propertiesTable.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          const property = await PropertyAPI.getPropertyById(id);
          FormManager.populateForEdit(property);
        } catch (error) {
          Utils.showToast('Failed to load property', 'error');
        }
      });
    });

    // Delete buttons
    propertiesTable.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Delete this property permanently?')) return;
        try {
          await PropertyAPI.deleteProperty(id);
          Utils.showToast('Property deleted');
          await PropertiesTable.loadAndRender();
          if (currentEditId === id) FormManager.reset();
        } catch (error) {
          Utils.showToast('Failed to delete', 'error');
        }
      });
    });

    // Thumbnail click -> open image modal
    propertiesTable.querySelectorAll('.thumbnail-clickable').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const id = thumb.dataset.propertyId;
        const property = allProperties.find(p => p._id === id);
        if (property && property.images && property.images.length) {
          ImageModal.open(property.images);
        }
      });
    });
  },

  async loadAndRender() {
    this.showLoading();
    try {
      const properties = await PropertyAPI.fetchMyProperties();
      this.render(properties);
    } catch (error) {
      this.showError(error.message);
    }
  },

  showLoading() {
    if (!propertiesTable) return;
    propertiesTable.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>`;
    if (paginationControls) paginationControls.innerHTML = '';
  },

  showError(error) {
    if (!propertiesTable) return;
    propertiesTable.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red;padding:40px;">Error: ${error}</td></tr>`;
    if (paginationControls) paginationControls.innerHTML = '';
  }
};





// =========================
// Clear Filters
// =========================
function clearFilters() {
  document.getElementById('filterStatus').value = 'all';
  document.getElementById('filterType').value = 'all';
  document.getElementById('filterEstate').value = 'all';
  filterStatus = 'all';
  filterType = 'all';
  filterEstate = 'all';
  PropertiesTable.currentPage = 1;
  PropertiesTable.renderPage();
  PropertiesTable.renderPagination();
}

// =========================
// Filter Change Handlers
// =========================
function initFilters() {
  const statusSelect = document.getElementById('filterStatus');
  const typeSelect = document.getElementById('filterType');
  const estateSelect = document.getElementById('filterEstate');
  const clearBtn = document.getElementById('clearFiltersBtn');

  if (statusSelect) {
    statusSelect.addEventListener('change', function() {
      filterStatus = this.value;
      PropertiesTable.currentPage = 1;
      PropertiesTable.renderPage();
      PropertiesTable.renderPagination();
    });
  }

  if (typeSelect) {
    typeSelect.addEventListener('change', function() {
      filterType = this.value;
      PropertiesTable.currentPage = 1;
      PropertiesTable.renderPage();
      PropertiesTable.renderPagination();
    });
  }

  if (estateSelect) {
    estateSelect.addEventListener('change', function() {
      filterEstate = this.value;
      PropertiesTable.currentPage = 1;
      PropertiesTable.renderPage();
      PropertiesTable.renderPagination();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', clearFilters);
  }
}

// =========================
// Populate Estate Filter from properties
// =========================
function populateEstateFilter() {
    const select = document.getElementById('filterEstate');
    if (!select) return;

    // Get unique estates from allProperties, filter out empty/null
    const estates = [...new Set(
        allProperties
            .map(p => p.estate)
            .filter(e => e && e.trim() !== '')
    )].sort(); // alphabetically

    // Save the currently selected value (if any)
    const currentValue = select.value;

    // Clear existing options (keep the first "All Estates" option)
    select.innerHTML = '<option value="all">All Estates</option>';

    // Add options for each unique estate
    estates.forEach(estate => {
        const option = document.createElement('option');
        option.value = estate;
        option.textContent = estate;
        select.appendChild(option);
    });

    // Restore selected value if it still exists, otherwise set to 'all'
    if (estates.includes(currentValue)) {
        select.value = currentValue;
    } else {
        select.value = 'all';
        // If the current filter was set to a now-missing estate, reset it
        if (filterEstate !== 'all' && !estates.includes(filterEstate)) {
            filterEstate = 'all';
        }
    }
}
// =========================
// API Configuration
// =========================
const API_BASE = 'https://rentspace-markeplace.onrender.com';

// =========================
// Utility Functions
// =========================
const Utils = {
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    showToast: (message, type = 'success') => {
        let toast = document.getElementById('rentspaceToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'rentspaceToast';
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 24px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(toast);
            if (!document.querySelector('#toastStyles')) {
                const style = document.createElement('style');
                style.id = 'toastStyles';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        toast.style.backgroundColor = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8';
        toast.textContent = message;
        toast.style.opacity = '1';
        clearTimeout(toast._hideTimeout);
        toast._hideTimeout = setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
        }, 3000);
    },

    formatPrice: (priceNum) => {
        if (!priceNum || priceNum === 0) return 'Price on request';
        if (priceNum >= 1000000) {
            const millions = priceNum / 1000000;
            return `KES ${millions.toFixed(1)}M`.replace('.0M', 'M');
        } else if (priceNum >= 1000) {
            return `KES ${(priceNum / 1000).toFixed(0)}K`;
        }
        return `KES ${priceNum.toLocaleString('en-KE')}`;
    },

    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};
 // ─── ADD THE FUNCTION HERE ──────────────────────────────
// 👇 Paste it right here, after the Utils object

// ─── Validate Kenyan Phone Numbers ──────────────────────────────
function validateKenyanPhone(phone) {
  // Remove whitespace and common separators
  let cleaned = phone.replace(/[\s\-()]/g, '');
  // Remove leading +
  cleaned = cleaned.replace(/^\+/, '');
  
  // Must start with 0 or 254, followed by exactly 9 digits
  if (!/^(0|254)\d{9}$/.test(cleaned)) {
    return { valid: false, formatted: null };
  }
  
  // Convert 0... to 254...
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1);
  }
  
  // Final format: 254 + 9 digits = 12 chars
  if (cleaned.length === 12 && cleaned.startsWith('254')) {
    return { valid: true, formatted: cleaned };
  }
  
  return { valid: false, formatted: null };
}

// =========================
// Authentication Helpers
// =========================
const getToken = () => localStorage.getItem('rentspace_token');
const redirectToLogin = () => {
    window.location.href = 'login.html';
};

const authFetch = async (url, options = {}) => {
    const token = getToken();
    if (!token) {
        redirectToLogin();
        throw new Error('No token');
    }
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
    if (res.status === 401) {
        localStorage.removeItem('rentspace_token');
        redirectToLogin();
        throw new Error('Unauthorized');
    }
    return res;
};

// =========================
// DOM Elements
// =========================
const propertyForm = document.getElementById('propertyForm');
const propertiesTable = document.querySelector('#propertiesTable tbody');
const logoutBtn = document.getElementById('logoutBtn');
const imageInput = document.getElementById('images');
const imagePreview = document.getElementById('imagePreview');
const existingPreview = document.getElementById('existingImagesPreview');
const formStatus = document.getElementById('formStatus');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetForm');
const propertyCountDisplay = document.getElementById('propertyCountDisplay');
const paginationControls = document.getElementById('paginationControls');




// =========================
// Apply Filters (FIXED)
// =========================


// =========================
// Override renderPage to use passed data
// =========================


// =========================
// Override renderPagination for filtered data
// =========================




// =========================
// Dynamic Price Label / Hint
// =========================
function updatePriceField() {
    const listingType = document.getElementById('listingType')?.value || 'sale';
    const isAirbnb = document.getElementById('isAirbnb')?.value === 'true';
    const propertyType = document.getElementById('propertyType')?.value || '';
    const priceLabel = document.getElementById('priceLabel');
    const priceInput = document.getElementById('price');
    const priceHint = document.getElementById('priceHint');

    if (isAirbnb || propertyType === 'airbnb') {
        priceLabel.innerHTML = 'Nightly Rate (KES) *';
        priceInput.placeholder = 'e.g., 5000 (per night)';
        priceHint.innerHTML = 'Enter the nightly rate in KES (e.g., 5000).';
    } else if (listingType === 'rent') {
        priceLabel.innerHTML = 'Monthly Rent (KES) *';
        priceInput.placeholder = 'e.g., 50000 (per month)';
        priceHint.innerHTML = 'For rent: enter the monthly rent in KES.';
    } else { // sale
        priceLabel.innerHTML = 'Price (KES) *';
        priceInput.placeholder = 'e.g., 5000000';
        priceHint.innerHTML = 'For sale: total price. For rent: monthly rent. For Airbnb: nightly rate.';
    }
}

// =========================
// Image Management
// =========================
const ImageManager = {
    MAX_MB: 10,
    MAX_FILES: 20,
    selectedImages: [],

    init() {
        if (!imageInput) return;

        imageInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.selectedImages = this.sanitizeFiles(files);
            this.syncInput();
            this.previewNewImages();
        });

        const clearBtn = document.getElementById('clearPreview');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.selectedImages = [];
                this.syncInput();
                if (imagePreview) imagePreview.innerHTML = '<p class="text-muted">No images selected</p>';
            });
        }
    },

    sanitizeFiles(files) {
        const valid = [];
        const maxBytes = this.MAX_MB * 1024 * 1024;

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                Utils.showToast(`${file.name} is not an image`, 'error');
                continue;
            }
            if (file.size > maxBytes) {
                Utils.showToast(`${file.name} exceeds ${this.MAX_MB}MB`, 'error');
                continue;
            }
            valid.push(file);
            if (valid.length >= this.MAX_FILES) break;
        }
        return valid;
    },

    syncInput() {
        if (!imageInput) return;
        const dt = new DataTransfer();
        this.selectedImages.forEach(f => dt.items.add(f));
        imageInput.files = dt.files;
    },

    previewNewImages() {
        if (!imagePreview) return;

        if (!this.selectedImages.length) {
            imagePreview.innerHTML = '<p class="text-muted">No images selected</p>';
            return;
        }

        imagePreview.innerHTML = '';
        this.selectedImages.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'preview-image';
                div.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <span class="image-name">${file.name}</span>
                    <span class="image-size">${Utils.formatFileSize(file.size)}</span>
                    <button type="button" class="remove-selected-btn" data-index="${index}" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                div.querySelector('.remove-selected-btn')?.addEventListener('click', () => {
                    this.selectedImages.splice(index, 1);
                    this.syncInput();
                    this.previewNewImages();
                });
                imagePreview.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    },

    displayExistingImages(images, publicIds = []) {
        if (!existingPreview) return;
        existingImages = images || [];
        existingPublicIds = publicIds || [];

        if (!existingImages.length) {
            existingPreview.innerHTML = '<p class="text-muted">No existing images</p>';
            return;
        }

        existingPreview.innerHTML = '';
        existingImages.forEach((url, index) => {
            const div = document.createElement('div');
            div.className = 'preview-image existing';
            div.innerHTML = `
                <img src="${url}" alt="Existing image">
                <span class="image-index">${index === 0 ? '⭐ COVER' : `Image ${index + 1}`}</span>
                <button type="button" class="remove-existing-btn" data-index="${index}" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            `;
            div.querySelector('.remove-existing-btn')?.addEventListener('click', () => {
                existingImages.splice(index, 1);
                existingPublicIds.splice(index, 1);
                this.displayExistingImages(existingImages, existingPublicIds);
            });
            existingPreview.appendChild(div);
        });
    },

    getFinalImages() {
        return existingImages;
    },

    getFinalPublicIds() {
        return existingPublicIds;
    },

    hasNewImages() {
        return this.selectedImages.length > 0;
    },

    getNewImages() {
        return this.selectedImages;
    }
};

// =========================
// Features / Amenities Management
// =========================
const FeaturesManager = {
    init() {
        const addBtn = document.getElementById('addFeature');
        const input = document.getElementById('featureInput');
        if (addBtn) addBtn.addEventListener('click', () => this.addFeature());
        if (input) input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addFeature();
            }
        });
        this.loadFeatures();
    },

    loadFeatures() {
        const input = document.getElementById('features');
        if (input && input.value) {
            try {
                features = JSON.parse(input.value);
                this.displayFeatures();
            } catch (e) {
                features = [];
            }
        }
    },

    addFeature() {
        const input = document.getElementById('featureInput');
        const feature = input.value.trim();
        if (!feature) return;
        features.push(feature);
        document.getElementById('features').value = JSON.stringify(features);
        this.displayFeatures();
        input.value = '';
        input.focus();
    },

    removeFeature(index) {
        if (confirm('Remove this feature?')) {
            features.splice(index, 1);
            document.getElementById('features').value = JSON.stringify(features);
            this.displayFeatures();
        }
    },

    displayFeatures() {
        const container = document.getElementById('featuresList');
        if (!container) return;
        if (!features.length) {
            container.innerHTML = '<p class="text-muted">No amenities added yet</p>';
            return;
        }
        container.innerHTML = '';
        features.forEach((feature, index) => {
            const tag = document.createElement('span');
            tag.className = 'feature-tag';
            tag.innerHTML = `
                ${feature}
                <button type="button" class="remove-feature" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            tag.querySelector('.remove-feature')?.addEventListener('click', () => this.removeFeature(index));
            container.appendChild(tag);
        });
    },

    getFeatures() {
        return features;
    }
};

// =========================
// Form Management
// =========================
const FormManager = {
   reset() {
    // ── Reset form fields ──
    propertyForm?.reset();
    currentEditId = null;
    existingImages = [];
    existingPublicIds = [];
    features = [];
    ImageManager.selectedImages = [];

    // ── Reset listing type to default ──
    document.getElementById('listingType').value = 'sale';
    document.getElementById('isAirbnb').value = 'false';
    document.querySelectorAll('.transaction-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.transaction === 'sale') btn.classList.add('active');
    });

    // ── Reset features ──
    document.getElementById('features').value = '[]';
    FeaturesManager.displayFeatures();

    // ── Reset images ──
    imageInput.value = '';
    imagePreview.innerHTML = '<p class="text-muted">No images selected</p>';
    existingPreview.innerHTML = '<p class="text-muted">No existing images</p>';

    // ── Reset form title and button ──
    formTitle.textContent = 'Add New Property';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Create Property';
    submitBtn.disabled = false;
    formStatus.style.display = 'none';
    document.getElementById('propertyId').value = '';

    // ── Reset property type dropdown ──
    const typeSelect = document.getElementById('propertyType');
    if (typeSelect) typeSelect.value = '';

    // ── Reset price label/hint ──
    updatePriceField();

    // ── ★ NEW: Clear validation states ──
    document.querySelectorAll('.form-control').forEach(el => {
        el.classList.remove('is-valid', 'is-invalid');
    });

    // ── ★ NEW: Remove red border from image upload area ──
    const imageGroup = document.querySelector('.form-group:has(#images)');
    if (imageGroup) imageGroup.style.border = '';

    // ── Scroll to top ──
    window.scrollTo({ top: 0, behavior: 'smooth' });
},

    populateForEdit(property) {
        currentEditId = property._id;
        existingImages = [...(property.images || [])];
        existingPublicIds = [];

        document.getElementById('title').value = property.title || '';
        document.getElementById('estate').value = property.estate || '';
        document.getElementById('county').value = property.county || '';
        document.getElementById('price').value = property.price || '';
        document.getElementById('bedrooms').value = property.bedrooms || 0;
        document.getElementById('description').value = property.description || '';
        document.getElementById('propertyType').value = property.propertyType || '';
        document.getElementById('size').value = property.size || '';
        document.getElementById('bathrooms').value = property.bathrooms || 0;
        document.getElementById('parking').value = property.parking || 0;
        document.getElementById('status').value = property.status || 'available';

        const listingType = property.listingType || 'sale';
        const isAirbnb = property.isAirbnb || false;
        document.getElementById('listingType').value = listingType;
        document.getElementById('isAirbnb').value = isAirbnb ? 'true' : 'false';

        document.querySelectorAll('.transaction-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.transaction === listingType) btn.classList.add('active');
});  // ← Airbnb button ALSO matches when listingType === 'rent'
        if (isAirbnb) {
            document.getElementById('airbnbBtn')?.classList.add('active');
        }

        features = [...(property.amenities || [])];
        document.getElementById('features').value = JSON.stringify(features);
        FeaturesManager.displayFeatures();

        ImageManager.displayExistingImages(property.images || []);

        updatePriceField();

        formTitle.textContent = `Edit Property: ${property.title}`;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Property';
        document.getElementById('propertyId').value = property._id;
        formStatus.style.display = 'block';
        formStatus.className = 'existing-images-notice';
        formStatus.textContent = `Editing property: ${property.title}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    updateStatus(message, type = 'info') {
        if (!formStatus) return;
        formStatus.style.display = 'block';
        formStatus.textContent = message;
        formStatus.className = type === 'info' ? 'existing-images-notice' : type;
    }
};

// =========================
// Property API (RentSpace)
// =========================
const PropertyAPI = {
        async fetchMyProperties() {
        // Backend caps `limit` at 100. Always request the max so the listing
        // count used by loadSubscriptionData (progress bar) is never truncated,
        // regardless of plan tier or admin status.
        const url = `${API_BASE}/api/properties/my-properties?limit=100`;

        const res = await authFetch(url);
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || 'Failed to fetch properties');
        }

        const data = await res.json();

        // Normalise the various shapes the API might return
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.properties)) return data.properties;
        if (data.success && Array.isArray(data.data)) return data.data;

        if (data.error) throw new Error(data.error);
        return [];
    },

    // ✅ NEW — points to /id/:id route and unpacks the property
async getPropertyById(id) {
    const res = await authFetch(`${API_BASE}/api/properties/id/${id}`);
    if (!res.ok) throw new Error('Property not found');
    const data = await res.json();
    return data.property || data;  // unpack {success, property} → property
},

    async createProperty(formData) {
        const res = await fetch(`${API_BASE}/api/properties`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData
        });
        if (!res.ok) {
            let errMsg;
            try {
                const errData = await res.json();
                errMsg = errData.error || 'Creation failed';
            } catch (e) {
                errMsg = await res.text() || 'Creation failed';
            }
            throw new Error(errMsg);
        }
        return await res.json();
    },

    async updateProperty(id, formData) {
        const res = await fetch(`${API_BASE}/api/properties/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData
        });
        if (!res.ok) {
            let errMsg;
            try {
                const errData = await res.json();
                errMsg = errData.error || 'Update failed';
            } catch (e) {
                errMsg = await res.text() || 'Update failed';
            }
            throw new Error(errMsg);
        }
        return await res.json();
    },

    async deleteProperty(id) {
        const res = await authFetch(`${API_BASE}/api/properties/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Delete failed');
        return true;
    }
};



// =========================
// Image Modal
// =========================
const ImageModal = {
    modal: null,
    images: [],
    currentIndex: 0,

    init() {
        this.modal = document.getElementById('imageModal');
        if (!this.modal) return;

        document.querySelector('.modal-close')?.addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => { if (e.target === this.modal) this.close(); });
        document.getElementById('modalPrev')?.addEventListener('click', () => this.prev());
        document.getElementById('modalNext')?.addEventListener('click', () => this.next());
    },

    open(images, startIndex = 0) {
        if (!images || !images.length) return;
        this.images = images;
        this.currentIndex = startIndex;
        this.updateImage();
        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    },

    close() {
        this.modal.classList.remove('show');
        document.body.style.overflow = '';
    },

    next() {
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        this.updateImage();
    },

    prev() {
        this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.updateImage();
    },

    updateImage() {
        const img = document.getElementById('modalImage');
        const counter = document.getElementById('modalCounter');
        if (img) img.src = this.images[this.currentIndex];
        if (counter) counter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
    }
};

// =========================
// Refresh User Data
// =========================
async function refreshUserData() {
  try {
    const token = getToken();
    if (!token) return;

    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      const user = data.user || data;

      // ─── Check if subscription has expired ──────────────────────
      if (user.subscriptionPlan && user.subscriptionPlan !== 'free') {
        const expiry = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null;
        if (expiry && expiry < new Date()) {
          // ── Expired – downgrade to free ────────────────────────
          console.log(`⏳ Subscription expired for ${user.email}. Downgrading to free.`);
          
          // Call the downgrade endpoint
          await fetch(`${API_BASE}/api/auth/downgrade-expired`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          // Refresh user data again after downgrade
          const freshRes = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (freshRes.ok) {
            const freshData = await freshRes.json();
            const freshUser = freshData.user || freshData;
            localStorage.setItem('rentspace_user', JSON.stringify(freshUser));
            await loadSubscriptionData();
            Utils.showToast('⚠️ Your subscription has expired. You\'ve been downgraded to Bronze.', 'warning');
            return;
          }
        }
      }

      // ─── Save user data ──────────────────────────────────────────
      localStorage.setItem('rentspace_user', JSON.stringify(user));
      await loadSubscriptionData();

      // ─── Check for expiry warning banner ──────────────────────
      checkExpiryWarning(user);
    }
  } catch (error) {
    console.error('Failed to refresh user data:', error);
  }
}

function checkExpiryWarning(user) {
  const expiry = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null;
  if (!expiry || user.subscriptionPlan === 'free') {
    // Hide any existing warning banner
    const banner = document.getElementById('expiryWarningBanner');
    if (banner) banner.style.display = 'none';
    return;
  }

  const now = new Date();
  const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  const banner = document.getElementById('expiryWarningBanner') || createExpiryBanner();

  if (daysRemaining <= 3 && daysRemaining > 0) {
    // ─── Show warning banner ──────────────────────────────────────
    banner.style.display = 'block';
    banner.innerHTML = `
      <div class="expiry-warning" style="background: rgba(255, 193, 7, 0.1); border: 1px solid #ffc107; border-radius: 8px; padding: 12px 20px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <i class="fas fa-exclamation-triangle" style="color: #ffc107; margin-right: 10px;"></i>
          <span style="color: #fff;">⚠️ Your <strong>${PLAN_DISPLAY_MAP[user.subscriptionPlan] || user.subscriptionPlan}</strong> plan expires in <strong>${daysRemaining} day${daysRemaining > 1 ? 's' : ''}</strong>. 
          <span style="color: #aaa;">Renew now to keep your listings live!</span></span>
        </div>
        <a href="#" onclick="openUpgradeModal(); return false;" style="background: #ffc107; color: #000; padding: 6px 16px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Renew Now
        </a>
      </div>
    `;
  } else if (daysRemaining <= 0) {
    // ─── Subscription expired – show expired banner ──────────────
    banner.style.display = 'block';
    banner.innerHTML = `
      <div class="expiry-warning" style="background: rgba(220, 53, 69, 0.1); border: 1px solid #dc3545; border-radius: 8px; padding: 12px 20px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <i class="fas fa-exclamation-circle" style="color: #dc3545; margin-right: 10px;"></i>
          <span style="color: #fff;">❌ Your <strong>${PLAN_DISPLAY_MAP[user.subscriptionPlan] || user.subscriptionPlan}</strong> plan has expired. Your listings are now hidden from search results.</span>
        </div>
        <a href="#" onclick="openUpgradeModal(); return false;" style="background: #dc3545; color: #fff; padding: 6px 16px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Reactivate Now
        </a>
      </div>
    `;
  } else {
    banner.style.display = 'none';
  }
}

function createExpiryBanner() {
  const banner = document.createElement('div');
  banner.id = 'expiryWarningBanner';
  // Insert after subscription card or at top of container
  const container = document.querySelector('.admin-container') || document.body;
  container.prepend(banner);
  return banner;
}

// =========================
// Retry Pending Property
// =========================
async function retryPendingProperty() {
    if (!pendingFormData) return;

    try {
        Utils.showToast('🔄 Retrying your property creation...', 'info');
        await PropertyAPI.createProperty(pendingFormData);
        Utils.showToast('✅ Property created successfully!', 'success');
        pendingFormData = null;
        FormManager.reset();
        await PropertiesTable.loadAndRender();
    } catch (error) {
        console.error('Retry failed:', error);
        Utils.showToast('Please try creating your property again manually.', 'error');
    }
}

// =========================
// Subscription Functions
// =========================

async function loadSubscriptionData() {
    try {
        const user = JSON.parse(localStorage.getItem('rentspace_user'));
        if (!user) return;

        const plan = user.subscriptionPlan || null;
        const expiry = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null;

        // ── Check if user is on paid active subscription ──────────
        const isActive = plan && ['basic', 'pro', 'developer'].includes(plan) && expiry && expiry > new Date();

        // ── Check if user is on Bronze trial (free plan, within 30 days of signup) ──
        const isTrial = plan === 'free' && user.createdAt &&
                        (new Date() - new Date(user.createdAt)) < 30 * 24 * 60 * 60 * 1000;

        // ── Calculate days remaining in trial ──────────────────────
        let daysRemaining = 0;
        if (isTrial && user.createdAt) {
            const trialEnd = new Date(new Date(user.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
            daysRemaining = Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24));
        }

        // ── Get listing count ──────────────────────────────────────
        let listingsUsed = 0;
        try {
            const properties = await PropertyAPI.fetchMyProperties();
            listingsUsed = properties.length;
        } catch (e) {}

        // ── Define plan limits ────────────────────────────────────
     const planLimits = {
  free: 2,
  basic: 20,
  pro: 40,
  developer: 9999   // 9999 is treated as "unlimited" in the code below
};
        const maxListings = plan && planLimits[plan] ? planLimits[plan] : 0;
        const isUnlimited = maxListings === 9999;
        const percentage = isUnlimited ? 50 : (maxListings > 0 ? Math.min((listingsUsed / maxListings) * 100, 100) : 0);

        // ── Get plan display name using GLOBAL constant ──────────
        const planDisplayName = plan ? PLAN_DISPLAY_MAP[plan] || plan.charAt(0).toUpperCase() + plan.slice(1) : 'No Active Plan';

        // ── Update badge ──────────────────────────────────────────
        const badge = document.getElementById('planBadge');
        const dot = document.getElementById('planStatusDot');

        // ── Common element references ─────────────────────────────
        const currentPlanEl = document.getElementById('currentPlan');
        const expiryEl = document.getElementById('planExpiry');
        const usedEl = document.getElementById('listingsUsed');
        const priceEl = document.getElementById('planPrice');
        const maxDisplay = document.getElementById('maxListingsDisplay');
        const progressWrapper = document.getElementById('subProgressWrapper');
        const progressBar = document.getElementById('subProgressBar');
        const progressUsed = document.getElementById('progressUsed');
        const progressTotal = document.getElementById('progressTotal');
        const progressStatus = document.getElementById('progressStatus');
        const actionsContainer = document.getElementById('planActions');

        // ── Price map (testing) ──────────────────────────────────
      const priceMap = {
  free: 'KES 0 (Trial)',
  basic: 'KES 999/mo',
  pro: 'KES 1,999/mo',
  developer: 'KES 3,999/mo'
};

        if (isActive) {
            // ─── Active paid subscription ──────────────────────────
            if (badge) {
                badge.textContent = planDisplayName;
                badge.className = 'plan-badge active';
            }
            if (dot) {
                dot.className = 'plan-status-dot active';
            }

            if (currentPlanEl) currentPlanEl.textContent = planDisplayName;
            if (expiryEl) expiryEl.textContent = expiry ? expiry.toLocaleDateString() : '—';
            if (usedEl) usedEl.textContent = listingsUsed;
            if (priceEl) priceEl.textContent = priceMap[plan] || '—';
            if (maxDisplay) {
                maxDisplay.textContent = isUnlimited ? '♾️' : `/ ${maxListings}`;
            }

            // ── Progress bar ──────────────────────────────────────
            if (progressWrapper) progressWrapper.style.display = 'block';
            if (progressUsed) progressUsed.textContent = listingsUsed;
            if (progressTotal) progressTotal.textContent = isUnlimited ? '♾️' : maxListings;
            if (progressBar) {
                progressBar.style.width = isUnlimited ? '50%' : percentage + '%';
                progressBar.classList.remove('warning', 'danger');
                if (!isUnlimited && percentage > 90) progressBar.classList.add('danger');
                else if (!isUnlimited && percentage > 70) progressBar.classList.add('warning');
            }
            if (progressStatus) {
                if (isUnlimited) {
                    progressStatus.textContent = '♾️ Unlimited listings on this plan';
                } else if (percentage > 90) {
                    progressStatus.textContent = '⚠️ You\'re near your listing limit!';
                } else {
                    progressStatus.textContent = `${Math.round(100 - percentage)}% of your slots remaining`;
                }
            }

            // ── Actions ────────────────────────────────────────────
            if (actionsContainer) {
                actionsContainer.innerHTML = `
                    <div style="text-align: right; font-size: 13px; color: var(--text-muted); padding: 8px 0;">
                        <i class="fas fa-check-circle" style="color: #4CAF50;"></i> Your plan is active
                        <a href="#" id="manageSubscriptionLink" style="color: var(--gold); margin-left: 12px; text-decoration: none;">
                            Manage
                        </a>
                    </div>
                `;
                document.getElementById('manageSubscriptionLink')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    Utils.showToast('Manage subscription page coming soon.', 'info');
                });
            }

        } else if (isTrial) {
            // ─── Bronze Trial ──────────────────────────────────────
            if (badge) {
                badge.textContent = `Bronze (Trial)`;
                badge.className = 'plan-badge trial';
            }
            if (dot) {
                dot.className = 'plan-status-dot trial';
            }

            if (currentPlanEl) currentPlanEl.textContent = 'Bronze (Trial)';
            if (expiryEl) expiryEl.textContent = `${daysRemaining} days remaining`;
            if (usedEl) usedEl.textContent = listingsUsed;
            if (priceEl) priceEl.textContent = 'KES 0 (Trial)';
            if (maxDisplay) {
                maxDisplay.textContent = `/ ${planLimits.free}`;
            }

            // ── Progress bar (limited to 2) ──────────────────────
            if (progressWrapper) progressWrapper.style.display = 'block';
            if (progressUsed) progressUsed.textContent = listingsUsed;
            if (progressTotal) progressTotal.textContent = planLimits.free;
            if (progressBar) {
                const pct = Math.min((listingsUsed / planLimits.free) * 100, 100);
                progressBar.style.width = pct + '%';
                progressBar.classList.remove('warning', 'danger');
                if (pct > 90) progressBar.classList.add('danger');
                else if (pct > 70) progressBar.classList.add('warning');
            }
            if (progressStatus) {
                if (listingsUsed >= planLimits.free) {
                    progressStatus.textContent = `⚠️ You've used all your trial listings. Upgrade to add more.`;
                } else {
                    progressStatus.textContent = `⏳ Trial ends in ${daysRemaining} days – upgrade to keep your listings live!`;
                }
            }

            // ── Actions ────────────────────────────────────────────
            if (actionsContainer) {
                actionsContainer.innerHTML = `
                    <div class="upgrade-msg" style="border-left-color: #cd7f32;">
                        <i class="fas fa-clock" style="color: #cd7f32;"></i> 
                        Your Bronze trial ends in ${daysRemaining} days. Upgrade to keep your listings live!
                    </div>
                    <button class="btn-upgrade" id="upgradeBtn">
                        <i class="fas fa-rocket"></i> Upgrade Now – From KES 2/mo
                    </button>
                `;
                document.getElementById('upgradeBtn')?.addEventListener('click', openUpgradeModal);
            }

        } else {
            // ─── No subscription (trial expired or never started) ──
            if (badge) {
                badge.textContent = plan === 'free' ? 'Trial Expired' : 'No Subscription';
                badge.className = 'plan-badge inactive';
            }
            if (dot) {
                dot.className = 'plan-status-dot inactive';
            }

            if (currentPlanEl) currentPlanEl.textContent = plan === 'free' ? 'Trial Expired' : 'No Active Subscription';
            if (expiryEl) expiryEl.textContent = '—';
            if (usedEl) usedEl.textContent = '—';
            if (priceEl) priceEl.textContent = '—';
            if (maxDisplay) maxDisplay.textContent = '';

            // ── Hide progress bar ──────────────────────────────────
            if (progressWrapper) progressWrapper.style.display = 'none';

            // ── Show upgrade CTA ──────────────────────────────────
            if (actionsContainer) {
                const msg = plan === 'free' ? 'Your trial has expired. Subscribe to keep your listings live.' : 'Subscribe to start listing properties.';
                actionsContainer.innerHTML = `
                    <div class="upgrade-msg">
                        <i class="fas fa-lock"></i> ${msg}
                    </div>
                    <button class="btn-upgrade" id="upgradeBtn">
                        <i class="fas fa-rocket"></i> Subscribe Now – From KES 2/mo
                    </button>
                `;
                document.getElementById('upgradeBtn')?.addEventListener('click', openUpgradeModal);
            }
        }

        // ── Update visibility tier ──
        updateVisibilityTier(plan, isActive);

    } catch (error) {
        console.error('Error loading subscription data:', error);
    }
}

// =========================
// Visibility & Ranking
// =========================
function updateVisibilityTier(plan, isActive) {
 const visibilityMap = {
  free: {
    label: 'Bronze',
    badgeClass: 'free',
    boost: '0%',
    rank: 'Standard',
    description: 'Your listings appear in the standard position. Upgrade for more visibility.',
    barWidth: '10%',
    showUpgrade: true
  },
  basic: {
    label: 'Silver',
    badgeClass: 'basic',
    boost: '15%',
    rank: 'Basic Boost',
    description: 'Your listings get a small visibility boost. Upgrade to Gold or Platinum for more exposure.',
    barWidth: '30%',
    showUpgrade: true
  },
  pro: {
    label: 'Gold',
    badgeClass: 'pro',
    boost: '50%',
    rank: 'High Visibility',
    description: 'Your listings are ranked high and shown with a 🔥 Popular badge!',
    barWidth: '60%',
    showUpgrade: true
  },
  developer: {
    label: 'Platinum',
    badgeClass: 'developer',
    boost: '100%',
    rank: 'Top Tier',
    description: 'Your listings appear at the very top with a 🏆 Premium badge!',
    barWidth: '85%',
    showUpgrade: false
  }
};

  const tierKey = (isActive && plan && visibilityMap[plan]) ? plan : 'free';
  const tier = visibilityMap[tierKey] || visibilityMap.free;

  // Update badge
  const badge = document.getElementById('visibilityBadge');
  if (badge) {
    badge.textContent = tier.label;
    badge.className = `visibility-badge ${tier.badgeClass}`;
  }

  // Update description
  const desc = document.getElementById('visibilityDescription');
  if (desc) desc.innerHTML = tier.description;

  // Update bar
  const bar = document.getElementById('tierBar');
  if (bar) bar.style.width = tier.barWidth;

  // Update benefits
  document.getElementById('boostPercent').textContent = tier.boost;
  document.getElementById('visibilityBadgeLabel').textContent = tier.label;
  document.getElementById('visibilityRank').textContent = tier.rank;

  // Show/hide upgrade CTA
  const cta = document.getElementById('visibilityUpgradeCta');
  const activeMsg = document.getElementById('visibilityActive');
  if (cta) cta.style.display = tier.showUpgrade ? 'flex' : 'none';
  if (activeMsg) activeMsg.style.display = tier.showUpgrade ? 'none' : 'block';

  // ─── Link the upgrade button to openUpgradeModal() ───
  const upgradeLink = document.getElementById('visibilityUpgradeLink');
  if (upgradeLink) {
    // Remove existing listeners to prevent duplicates
    const newLink = upgradeLink.cloneNode(true);
    upgradeLink.parentNode.replaceChild(newLink, upgradeLink);
    
    newLink.addEventListener('click', (e) => {
      e.preventDefault();
      openUpgradeModal();  // ← Same function as "Subscribe Now"
    });
  }
}
// =========================
// Compute availability fields
// =========================
function computeAvailabilityFields() {
    const listingType = document.getElementById('listingType')?.value || 'sale';
    const isAirbnb = document.getElementById('isAirbnb')?.value === 'true';
    const propertyType = document.getElementById('propertyType')?.value || '';

    let availableFor = '';
    let rentalType = '';

    if (isAirbnb || propertyType === 'airbnb') {
        // Airbnb: available for both short and long term (we set both)
        availableFor = 'both';
        rentalType = 'short_term';
    } else if (listingType === 'rent') {
        availableFor = 'long_term';
        rentalType = 'long_term';
    } else if (listingType === 'sale') {
        // Land is also sale
        availableFor = 'sale';
        rentalType = 'sale';
    } else {
        // fallback
        availableFor = 'long_term';
        rentalType = 'long_term';
    }

    return { availableFor, rentalType };
}

// =========================
// Form Submit Handler (UPDATED)
// =========================
// =========================
// Form Submit Handler (UPDATED with inline validation)
// =========================
async function handleFormSubmit(e) {
  e.preventDefault();

  // ── Clear previous validation states ──
  document.querySelectorAll('.form-control').forEach(el => {
    el.classList.remove('is-valid', 'is-invalid');
  });

  // ── Define fields to validate ──
  const fields = [
    { id: 'title', msg: 'Please enter a property title' },
    { id: 'propertyType', msg: 'Please select a property type' },
    { id: 'estate', msg: 'Please enter the estate/area' },
    { id: 'county', msg: 'Please enter the county' },
    { id: 'price', msg: 'Please enter a valid price' },
    { id: 'description', msg: 'Please enter a description' }
  ];

  let isValid = true;
  let firstInvalidEl = null;

  for (const field of fields) {
    const el = document.getElementById(field.id);
    if (!el) continue;
    let value = el.value.trim();
    if (el.type === 'number') {
      value = parseFloat(value);
      if (isNaN(value) || value <= 0) {
        el.classList.add('is-invalid');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = el;
        continue;
      }
    }
    if (!value) {
      el.classList.add('is-invalid');
      isValid = false;
      if (!firstInvalidEl) firstInvalidEl = el;
    } else {
      el.classList.add('is-valid');
    }
  }

  // ── Image validation (for new properties only) ──
  if (!currentEditId && ImageManager.getNewImages().length === 0) {
    Utils.showToast('Please select at least one image', 'error');
    const imageGroup = document.querySelector('.form-group:has(#images)');
    if (imageGroup) {
      imageGroup.style.border = '2px solid #dc3545';
      setTimeout(() => { imageGroup.style.border = ''; }, 3000);
    }
    isValid = false;
  }

  if (!isValid) {
    if (firstInvalidEl) {
      firstInvalidEl.focus();
      firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    Utils.showToast('Please fix the highlighted fields', 'error');
    return;
  }

  // ── ★ NEW: Get form element and add loading state ──
  const form = document.getElementById('propertyForm');
  form.classList.add('form-loading');

  // ── If all validations pass, proceed with submission ──
  const title = document.getElementById('title')?.value.trim();
  const estate = document.getElementById('estate')?.value.trim();
  const county = document.getElementById('county')?.value.trim();
  const price = parseFloat(document.getElementById('price')?.value || 0);
  const description = document.getElementById('description')?.value.trim();
  const propertyType = document.getElementById('propertyType')?.value;

  // ── Compute available_for and rental_type ──────────────────
  const { availableFor, rentalType } = computeAvailabilityFields();

  // ── Build FormData ──────────────────────────────────────────
  const formData = new FormData();
  formData.append('title', title);
  formData.append('listingType', document.getElementById('listingType')?.value || 'sale');
  formData.append('isAirbnb', document.getElementById('isAirbnb')?.value === 'true');
  formData.append('propertyType', propertyType);
  formData.append('estate', estate);
  formData.append('county', county);
  formData.append('price', price);
  formData.append('bedrooms', document.getElementById('bedrooms')?.value || 0);
  formData.append('bathrooms', document.getElementById('bathrooms')?.value || 0);
  formData.append('parking', document.getElementById('parking')?.value || 0);
  formData.append('size', document.getElementById('size')?.value || '');
  formData.append('status', document.getElementById('status')?.value || 'available');
  formData.append('description', description);
  formData.append('amenities', JSON.stringify(features));

  // Append computed availability fields
  formData.append('available_for', availableFor);
  formData.append('rental_type', rentalType);

  // Append new images
  ImageManager.getNewImages().forEach(file => formData.append('images', file));

  if (currentEditId) {
    formData.append('existingImages', JSON.stringify(existingImages));
    formData.append('existingPublicIds', JSON.stringify(existingPublicIds));
  }

  // ── Disable submit button ──────────────────────────────────
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${currentEditId ? 'Updating...' : 'Creating...'}`;

  try {
    if (currentEditId) {
      await PropertyAPI.updateProperty(currentEditId, formData);
      Utils.showToast('Property updated successfully');
      FormManager.reset();
      await PropertiesTable.loadAndRender();
    } else {
      await PropertyAPI.createProperty(formData);
      Utils.showToast('Property created successfully');
      FormManager.reset();
      await PropertiesTable.loadAndRender();
    }
  } catch (error) {
    console.error('Save error:', error);
    const errorMsg = error.message || '';
    const isSubscriptionError =
        errorMsg.toLowerCase().includes('subscription') ||
        errorMsg.toLowerCase().includes('subscribe') ||
        errorMsg.toLowerCase().includes('upgrade');

    if (isSubscriptionError) {
      pendingFormData = formData;
      Utils.showToast('📢 You need a subscription to list properties. Upgrade now!', 'warning');
      setTimeout(() => {
        openUpgradeModal();
        const subCard = document.getElementById('subscriptionCard');
        if (subCard) {
          subCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          subCard.style.borderColor = '#c5a059';
          subCard.style.boxShadow = '0 0 20px rgba(197, 160, 89, 0.3)';
          setTimeout(() => {
            subCard.style.borderColor = '#2c2c2c';
            subCard.style.boxShadow = 'none';
          }, 3000);
        }
      }, 500);
    } else {
      Utils.showToast(errorMsg || 'Failed to save property', 'error');
    }
  } finally {
    // ── ★ NEW: Remove loading state ──
    form.classList.remove('form-loading');
    submitBtn.disabled = false;
    submitBtn.innerHTML = currentEditId
        ? '<i class="fas fa-save"></i> Update Property'
        : '<i class="fas fa-save"></i> Create Property';
  }
}
// =========================
// Upgrade Modal (UPDATED)
// =========================
async function openUpgradeModal() {
    const modal = document.getElementById('upgradeModal');
    const planList = document.getElementById('planList');
    modal.style.display = 'flex';

    const title = document.getElementById('title')?.value?.trim() || '';
    const estate = document.getElementById('estate')?.value?.trim() || '';
    const county = document.getElementById('county')?.value?.trim() || '';
    const price = parseFloat(document.getElementById('price')?.value || 0);
    const imageCount = ImageManager.getNewImages().length;
    const hasPending = pendingFormData !== null;
    const isEdit = currentEditId !== null;

    let summaryHTML = '';
    if (hasPending || title || estate || price) {
        const location = estate && county ? `${estate}, ${county}` : estate || county || '—';
        summaryHTML = `
            <div class="modal-property-summary">
                <div class="summary-label">${hasPending ? '📌 You\'re about to list' : isEdit ? '✏️ Editing' : '📋 Property details'}</div>
                <div class="summary-title">${title || 'Untitled'}</div>
                <div class="summary-meta">
                    📍 ${location} ${price > 0 ? `• 💰 KES ${price.toLocaleString()}` : ''} ${imageCount > 0 ? `• 📸 ${imageCount} image${imageCount > 1 ? 's' : ''}` : ''}
                </div>
                ${hasPending ? `<div class="summary-saved"><i class="fas fa-check-circle"></i> Your property data is saved – upgrade to publish it!</div>` : ''}
            </div>
        `;
    } else {
        summaryHTML = `
            <div class="modal-property-summary" style="border-left-color:#c5a059;">
                <div class="summary-meta" style="font-size:14px; color:#aaa;">
                    <i class="fas fa-rocket" style="color:#c5a059;"></i> Upgrade your plan to start listing properties.
                </div>
            </div>
        `;
    }

    const user = JSON.parse(localStorage.getItem('rentspace_user') || '{}');
    let userPhone = '';
    if (user.phone) {
        userPhone = user.phone.replace(/\s/g, '').replace(/^\+/, '');
        if (!userPhone.startsWith('254')) {
            userPhone = '254' + userPhone.replace(/^0+/, '');
        }
    }

   const PACKAGES = {
  monthly: [
    {
      id: 'free',
      name: 'Bronze',
      icon: 'fa-shield',
      price: 0,
      period: 'month',
      features: ['2 listings', 'Standard visibility', '30-day listing expiry'],
      popular: false,
      color: '#cd7f32',
      trial: true
    },
    {
      id: 'basic',
      name: 'Silver',
      icon: 'fa-gem',
      price: 999,
      period: 'month',
      features: ['20 listings', 'Basic boost', 'WhatsApp leads', 'Email support'],
      popular: false,
      color: '#c0c0c0'
    },
    {
      id: 'pro',
      name: 'Gold',
      icon: 'fa-crown',
      price: 1999,
      period: 'month',
      features: ['40 listings', 'Popular badge', 'Priority support', '2 Featured slots'],
      popular: true,
      color: '#d4af37'
    },
    {
      id: 'developer',
      name: 'Platinum',
      icon: 'fa-gem',
      price: 3999,
      period: 'month',
      features: ['Unlimited listings', 'Premium badge', '5 Featured slots', 'Top ranking', 'Bulk upload'],
      popular: false,
      color: '#e5e4e2'
    }
  ],
  quarterly: [
    {
      id: 'basic',
      name: 'Silver',
      icon: 'fa-gem',
      price: 2499,
      period: 'quarter',
     features: ['20 listings', 'Basic boost', 'WhatsApp leads', 'Save KES 500'],
      popular: false,
      color: '#c0c0c0'
    },
    {
      id: 'pro',
      name: 'Gold',
      icon: 'fa-crown',
      price: 4999,
      period: 'quarter',
      features: ['40 listings', 'Popular badge', 'Priority support', 'Save KES 1,000'],
      popular: true,
      color: '#d4af37'
    },
    {
      id: 'developer',
      name: 'Platinum',
      icon: 'fa-gem',
      price: 9999,
      period: 'quarter',
      features: ['Unlimited listings', 'Premium badge', '5 Featured slots', 'Save KES 2,000'],
      popular: false,
      color: '#e5e4e2'
    }
  ]
};

    let currentPeriod = 'monthly';

    function renderPlans(period) {
        const plans = PACKAGES[period] || PACKAGES.monthly;
        let html = `
            <div class="modal-packages">
                <div class="modal-period-toggle">
                    <button class="period-btn ${period === 'monthly' ? 'active' : ''}" data-period="monthly">Monthly</button>
<button class="period-btn ${period === 'quarterly' ? 'active' : ''}" data-period="quarterly">Quarterly</button>
<span class="toggle-savings">Save ~15% with quarterly</span>
                </div>
                <div class="packages-grid">
        `;

        plans.forEach((pkg) => {
            const popularBadge = pkg.popular ? `<div class="popular-badge">🔥 Most Popular</div>` : '';
            html += `
                <div class="package-card ${pkg.popular ? 'popular' : ''}" data-plan="${pkg.id}" data-period="${period}">
                    ${popularBadge}
                    <div class="package-header">
                        <i class="fas ${pkg.icon}" style="color:${pkg.color};"></i>
                        <h4>${pkg.name}</h4>
                    </div>
                    <div class="package-price">
                        <span class="price-amount">KES ${pkg.price.toLocaleString()}</span>
                        <span class="price-period">/${pkg.period}</span>
                    </div>
                    <ul class="package-features">
                        ${pkg.features.map(f => `<li><i class="fas fa-check" style="color:#c5a059;"></i> ${f}</li>`).join('')}
                    </ul>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
        return html;
    }

    planList.innerHTML = `
        ${summaryHTML}
        ${renderPlans(currentPeriod)}
        <div class="modal-phone-section">
            <label for="subscribePhone">📱 Phone Number (STK Push)</label>
            <input type="tel" id="subscribePhone" placeholder="2547XXXXXXXX" value="${userPhone}">
        </div>
        <div class="modal-actions">
            <button class="btn btn-primary" id="subscribeBtn">Subscribe Now</button>
            <button class="btn btn-outline" id="closeModalBtn">Cancel</button>
        </div>
    `;

    // ─── Period toggle ──────────────────────────────────────────
       // ─── Reusable binding logic for modal events ────────────────
    function bindModalEvents() {
        // Period toggles
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const newPeriod = this.dataset.period;
                if (newPeriod === currentPeriod) return;

                // Preserve what the user already typed / selected
                const phoneEl = document.getElementById('subscribePhone');
                const savedPhone = phoneEl ? phoneEl.value : userPhone;
                const savedSummary =
                    planList.querySelector('.modal-property-summary')?.outerHTML || summaryHTML;

                currentPeriod = newPeriod;

                planList.innerHTML = `
                    ${savedSummary}
                    ${renderPlans(currentPeriod)}
                    <div class="modal-phone-section">
                        <label for="subscribePhone">📱 Phone Number (STK Push)</label>
                        <input type="tel" id="subscribePhone" placeholder="2547XXXXXXXX" value="${savedPhone}">
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-primary" id="subscribeBtn">Subscribe Now</button>
                        <button class="btn btn-outline" id="closeModalBtn">Cancel</button>
                    </div>
                `;
                bindModalEvents();
            });
        });

        // Package selection
        document.querySelectorAll('.package-card').forEach(el => {
            el.addEventListener('click', function () {
                document.querySelectorAll('.package-card').forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
            });
        });

        // Subscribe / close
        document.getElementById('subscribeBtn')?.addEventListener('click', handleSubscription);
        document.getElementById('closeModalBtn')?.addEventListener('click', () => {
            document.getElementById('upgradeModal').style.display = 'none';
        });
    }

    // Initial bind after the first render
    bindModalEvents();

}

// ─── Global subscription handler ──────────────────────────────
async function handleSubscription() {
    const selected = document.querySelector('.package-card.selected');
    if (!selected) {
        Utils.showToast('Please select a plan.', 'error');
        return;
    }
    
    const plan = selected.dataset.plan;
    const period = selected.dataset.period || 'monthly'; // ✅ GET PERIOD
    const rawPhone = document.getElementById('subscribePhone').value.trim();

    if (!rawPhone) {
        Utils.showToast('Please enter your phone number.', 'error');
        return;
    }

    const phoneValidation = validateKenyanPhone(rawPhone);
    if (!phoneValidation.valid) {
        Utils.showToast('Please enter a valid Kenyan phone number (e.g., 0712345678 or 254712345678).', 'error');
        return;
    }

    const phone = phoneValidation.formatted;

    // ── Get modal elements ──────────────────────────────────────
    const modal = document.getElementById('upgradeModal');
    const planList = document.getElementById('planList');
    const btn = document.getElementById('subscribeBtn');
    const closeBtn = document.getElementById('closeModalBtn');

    // ── Show loading state inside modal ──────────────────────────
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    // Disable close button during processing
    closeBtn.disabled = true;
    closeBtn.style.opacity = '0.5';
    closeBtn.style.cursor = 'not-allowed';

    try {
        const token = getToken();
        
        // ✅ SEND PERIOD TO BACKEND
        const res = await fetch(`${API_BASE}/api/subscriptions/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ 
                plan, 
                phoneNumber: phone,
                period: period   // ✅ ADDED
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Subscription failed');

        // ─── Replace modal content with loading spinner ──────────
        const planDisplayName = PLAN_DISPLAY_MAP[plan] || plan.charAt(0).toUpperCase() + plan.slice(1);
        const periodLabel = period === 'quarterly' ? 'Quarterly' : 'Monthly';
        
        planList.innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <i class="fas fa-spinner fa-spin" style="font-size:48px; color:#c5a059; margin-bottom:20px; display:block;"></i>
                <h3 style="color:#fff; margin-bottom:8px;">STK Push Sent</h3>
                <p style="color:#aaa; font-size:15px;">Check your phone and enter your M‑Pesa PIN.</p>
                <p style="color:#888; font-size:13px; margin-top:8px;">
                    ${planDisplayName} (${periodLabel}) – Waiting for payment confirmation...
                </p>
                <div style="margin-top:20px; width:100%; max-width:200px; margin-left:auto; margin-right:auto; height:4px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden;">
                    <div style="width:0%; height:100%; background:linear-gradient(90deg, #c5a059, #d4b37a); border-radius:4px; animation: loadingBar 30s ease-in-out forwards;"></div>
                </div>
                <p style="color:#666; font-size:11px; margin-top:12px;" id="pollingStatus">⏳ Waiting for payment...</p>
            </div>
        `;

        // ─── Poll for subscription update ──────────────────────────
        let attempts = 0;
        const maxAttempts = 15; // 15 * 2s = 30 seconds
        let subscriptionConfirmed = false;
        const statusEl = document.getElementById('pollingStatus');

        while (attempts < maxAttempts && !subscriptionConfirmed) {
            attempts++;
            await new Promise(r => setTimeout(r, 2000));

            // Update status message
            if (statusEl) {
                const dots = '.'.repeat(attempts % 4);
                statusEl.textContent = `⏳ Waiting for payment confirmation${dots}`;
            }

            try {
                const token = getToken();
                if (!token) break;

                const userRes = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (userRes.ok) {
                    const userData = await userRes.json();
                    const user = userData.user || userData;
                    localStorage.setItem('rentspace_user', JSON.stringify(user));

                    const currentPlan = user.subscriptionPlan;
                    if (currentPlan && ['basic', 'pro', 'developer'].includes(currentPlan)) {
                        subscriptionConfirmed = true;
                        console.log(`✅ Subscription confirmed! Plan: ${currentPlan}`);

                        // ─── Show success inside modal ──────────────
                        planList.innerHTML = `
                            <div style="text-align:center; padding:40px 20px;">
                                <i class="fas fa-check-circle" style="font-size:48px; color:#4CAF50; margin-bottom:20px; display:block;"></i>
                                <h3 style="color:#fff; margin-bottom:8px;">✅ ${PLAN_DISPLAY_MAP[currentPlan] || currentPlan} Plan Activated!</h3>
                                <p style="color:#aaa; font-size:15px;">Your subscription is now active.</p>
                                <p style="color:#888; font-size:13px; margin-top:4px;">${periodLabel} plan – expires in ${period === 'quarterly' ? '90' : '30'} days.</p>
                            </div>
                        `;

                        // ─── Close modal after 1.5s ────────────────
                        setTimeout(() => {
                            modal.style.display = 'none';
                            // Re-enable button for next time
                            btn.disabled = false;
                            btn.innerHTML = 'Subscribe Now';
                            closeBtn.disabled = false;
                            closeBtn.style.opacity = '1';
                            closeBtn.style.cursor = 'pointer';
                            // Reload dashboard
                            loadSubscriptionData();
                            // Retry pending property
                            setTimeout(async () => {
                                await retryPendingProperty();
                            }, 500);
                        }, 1500);

                        break;
                    }
                }
            } catch (pollError) {
                console.warn('Poll attempt failed:', pollError);
            }
        }

        // ─── If subscription wasn't confirmed ──────────────────────
        if (!subscriptionConfirmed) {
            planList.innerHTML = `
                <div style="text-align:center; padding:40px 20px;">
                    <i class="fas fa-clock" style="font-size:48px; color:#ffc107; margin-bottom:20px; display:block;"></i>
                    <h3 style="color:#fff; margin-bottom:8px;">⏳ Still Processing</h3>
                    <p style="color:#aaa; font-size:15px;">Your payment may still be processing.</p>
                    <p style="color:#888; font-size:13px; margin-top:8px;">Please <strong>refresh the page</strong> in a few moments to see your updated subscription.</p>
                    <button class="btn btn-primary" onclick="refreshUserData(); document.getElementById('upgradeModal').style.display = 'none';" style="margin-top:20px;">
                        <i class="fas fa-sync"></i> Refresh Now
                    </button>
                </div>
            `;
            // Re-enable close button
            closeBtn.disabled = false;
            closeBtn.style.opacity = '1';
            closeBtn.style.cursor = 'pointer';
            // Re-enable subscribe button
            btn.disabled = false;
            btn.innerHTML = 'Subscribe Now';
        }

    } catch (error) {
        // ─── Show error inside modal ──────────────────────────────
        planList.innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <i class="fas fa-exclamation-circle" style="font-size:48px; color:#dc3545; margin-bottom:20px; display:block;"></i>
                <h3 style="color:#fff; margin-bottom:8px;">❌ Something Went Wrong</h3>
                <p style="color:#aaa; font-size:15px;">${error.message || 'Please try again.'}</p>
                <button class="btn btn-primary" onclick="document.getElementById('upgradeModal').style.display = 'none';" style="margin-top:20px;">
                    Close
                </button>
            </div>
        `;
        btn.disabled = false;
        btn.innerHTML = 'Subscribe Now';
        closeBtn.disabled = false;
        closeBtn.style.opacity = '1';
        closeBtn.style.cursor = 'pointer';
        Utils.showToast(error.message, 'error');
    }
}

// =========================
// Admin Link (only for admin users)
// =========================
function addAdminLink() {
  const user = JSON.parse(localStorage.getItem('rentspace_user'));
  if (!user || user.role !== 'admin') return;

  const headerStats = document.querySelector('.header-stats');
  if (!headerStats) return;

  // Check if link already exists to avoid duplicates
  if (document.querySelector('.admin-link')) return;

  const adminLink = document.createElement('a');
  adminLink.href = 'admin.html';
  adminLink.className = 'admin-link';
  adminLink.innerHTML = '<i class="fas fa-shield-alt"></i> Admin';
  adminLink.style.cssText = `
    background: rgba(197, 160, 89, 0.12);
    color: #c5a059;
    padding: 6px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid rgba(197, 160, 89, 0.2);
    transition: all 0.3s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  `;
  adminLink.addEventListener('mouseenter', () => {
    adminLink.style.background = 'rgba(197, 160, 89, 0.2)';
  });
  adminLink.addEventListener('mouseleave', () => {
    adminLink.style.background = 'rgba(197, 160, 89, 0.12)';
  });

  // Insert after the property count span
  const propertySpan = headerStats.querySelector('span');
  if (propertySpan) {
    propertySpan.after(adminLink);
  } else {
    headerStats.prepend(adminLink);
  }
}
// =========================
// Initialization
// =========================
document.addEventListener('DOMContentLoaded', async () => {
    if (!getToken()) {
        redirectToLogin();
        return;
    }

    ImageManager.init();
    FeaturesManager.init();
    ImageModal.init();

    document.querySelectorAll('.transaction-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.transaction-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const transaction = this.dataset.transaction;
            document.getElementById('listingType').value = transaction;

            if (this.id === 'airbnbBtn') {
                document.getElementById('isAirbnb').value = 'true';
                const typeSelect = document.getElementById('propertyType');
                if (typeSelect) {
                    typeSelect.value = 'airbnb';
                }
            } else {
                document.getElementById('isAirbnb').value = 'false';
                const typeSelect = document.getElementById('propertyType');
                if (typeSelect && typeSelect.value === 'airbnb') {
                    typeSelect.value = '';
                }
            }
            updatePriceField();
        });
    });

    document.getElementById('propertyType')?.addEventListener('change', function() {
        const val = this.value;
        if (val === 'airbnb') {
            document.getElementById('isAirbnb').value = 'true';
            document.querySelectorAll('.transaction-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('airbnbBtn')?.classList.add('active');
            document.getElementById('listingType').value = 'rent';
        } else {
            document.getElementById('isAirbnb').value = 'false';
            const airbnbBtn = document.getElementById('airbnbBtn');
            if (airbnbBtn && airbnbBtn.classList.contains('active')) {
                airbnbBtn.classList.remove('active');
                const currentListing = document.getElementById('listingType').value;
                document.querySelectorAll('.transaction-btn').forEach(b => {
                    if (b.dataset.transaction === currentListing) b.classList.add('active');
                });
            }
        }
        updatePriceField();
    });

    propertyForm?.addEventListener('submit', handleFormSubmit);

    resetBtn?.addEventListener('click', () => {
        if (currentEditId && !confirm('Discard changes?')) return;
        FormManager.reset();
    });

    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('rentspace_token');
        window.location.href = 'login.html';
    });

    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            document.getElementById('upgradeModal').style.display = 'none';
        });
    }
      // ── Initialize filters ──
    initFilters();  // ← ADD THIS LINE
    await PropertiesTable.loadAndRender();
    await loadSubscriptionData();
});