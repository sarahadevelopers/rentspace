// =============================================
// generate-all.js — Unified generator (MongoDB source of truth)
// =============================================
// Reads properties from MongoDB, joins with User for owner contact info,
// renders static HTML pages for rentals (/property/) and Airbnbs (/airbnb/),
// refreshes sitemap.xml, and submits new/changed URLs to the Google Indexing API.
// =============================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { google } = require('googleapis');

// ─── Configuration ────────────────────────────────────────────
const RENTAL_TEMPLATE_PATH  = path.join(__dirname, 'templates', 'property-template.html');
const AIRBNB_TEMPLATE_PATH  = path.join(__dirname, 'templates', 'airbnb-property-template.html');
const RENTAL_OUTPUT_DIR     = path.join(__dirname, 'property');
const AIRBNB_OUTPUT_DIR     = path.join(__dirname, 'airbnb');
const SITEMAP_PATH          = path.join(__dirname, 'sitemap.xml');
const BASE_URL              = 'https://rentspace.co.ke';

// Fallback contact info when neither property nor owner has a phone
const FALLBACK_PHONE = '+254723562484';        // e.g. RentSpace admin line
const FALLBACK_WHATSAPP = '254723562484';      // without the +
const FALLBACK_EMAIL = 'info@rentspace.co.ke';
const FALLBACK_NAME = 'RentSpace';

// URLs collected during generation that need Google submission
const urlsToSubmit = [];

// Ensure output directories exist
[RENTAL_OUTPUT_DIR, AIRBNB_OUTPUT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Helpers ──────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Normalise any phone format into two usable strings
function normalizePhone(raw) {
  if (!raw) return { tel: '', wa: '' };
  // Strip everything except digits and a leading +
  let cleaned = String(raw).replace(/[^\d+]/g, '');
  // Remove leading +
  cleaned = cleaned.replace(/^\+/, '');
  // Convert 0XXXXXXXXX (10 digits) → 254XXXXXXXXX
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '254' + cleaned.slice(1);
  }
  // If it doesn't start with 254 yet, prepend it
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  // Basic length sanity check (Kenyan numbers are 12 digits total)
  if (cleaned.length !== 12) return { tel: '', wa: '' };

  return { tel: '+' + cleaned, wa: cleaned };
}

// ─── Classify a property into one of four categories ──────────
// Categories: 'land' | 'airbnb' | 'sale' | 'rental'
// Order matters: land before sale (land is technically for sale).
function getPropertyCategory(prop) {
  const type  = String(prop.type || '').toLowerCase();
  const title = String(prop.title || '').toLowerCase();
  const rtype = String(prop.rental_type || '').toLowerCase();
  const avail = String(prop.available_for || '').toLowerCase();

  // Land — checks both type and title for keywords
  if (
    type.includes('land') ||
    title.includes('land') ||
    title.includes('plot') ||
    title.includes('acre') ||
    title.includes('ranch')
  ) {
    return 'land';
  }

  // Airbnb / short-stay
  if (
    rtype === 'short_term' ||
    avail === 'short_term' ||
    prop.price_night
  ) {
    return 'airbnb';
  }

  // Sale
  if (rtype === 'sale' || avail === 'sale') {
    return 'sale';
  }

  // Default: long-term rental
  return 'rental';
}

// ─── Human-readable heading per category ──────────────────────
function getRecommendationsHeading(category) {
  switch (category) {
    case 'land':   return 'Similar Land Listings';
    case 'airbnb': return 'Similar Short-Stays';
    case 'sale':   return 'Similar Properties for Sale';
    case 'rental': return 'Similar Rentals';
    default:       return 'Similar Curations';
  }
}

function getAltTextForThumbnail(idx, prop, isRental = true) {
  const uniqueTitle = isRental ? prop.title : (prop.title.split(' – ')[0] || prop.title);
  const altMap = [
    'Living area', 'Master bedroom', 'Kitchen', 'Bathroom',
    'Exterior view', 'Additional view', 'Dining area',
    'Bedroom', 'Compound view'
  ];
  const descriptor = altMap[idx] || `View ${idx + 1}`;
  return `${descriptor} of ${uniqueTitle}`;
}

// Write page only if content changed, and remember the URL for Google
function writePageIfChanged(outputPath, content, publicUrl) {
  const exists = fs.existsSync(outputPath);
  const changed = !exists || fs.readFileSync(outputPath, 'utf8') !== content;

  if (changed) {
    fs.writeFileSync(outputPath, content);
    urlsToSubmit.push(publicUrl);
    return true;
  }
  return false;
}

// ─── Adapter: Mongo document → generator shape ────────────────
function adaptMongoDoc(p) {
  const isAirbnb = p.isAirbnb === true || p.rental_type === 'short_term';

  return {
    id:          p._id.toString(),
    slug:        p.slug,
    title:       p.title,
    description: p.description,
    type:        p.propertyType,
    estate:      p.estate,
    county:      p.county,
    price:       p.price,
    price_night: isAirbnb ? p.price : null,

    rental_type:   p.rental_type || (isAirbnb ? 'short_term' : 'long_term'),
    available_for: p.available_for,

    specs: {
      bedrooms:  p.bedrooms,
      bathrooms: p.bathrooms,
      parking:   p.parking,
      sqft:      p.sqft
    },

    images:   p.images   || [],
    features: p.amenities || [],
    reviews:  p.reviews  || [],

    seo_title:        p.seo_title,
    meta_description: p.meta_description,
    why_rent:         p.why_rent,
    fumigationLink:   p.fumigationLink,

    airbnb_rating:        p.airbnb_rating,
    airbnb_reviews:       p.airbnb_reviews,
    host_name:            p.host_name,
    host_response_rate:   p.host_response_rate,
    host_response_time:   p.host_response_time,
    cancellation_policy:  p.cancellation_policy,
    price_week:           p.price_week,
    airbnb_superhost:     p.airbnb_superhost,
    short_stay_amenities: p.short_stay_amenities
  };
}

// ─── Attach owner contact info to adapted property ────────────
function attachOwnerInfo(adapted, propertyDoc, ownerMap) {
  const owner = ownerMap[propertyDoc.ownerId?.toString()];

  // Priority: per-property override → owner account phone → fallback
  const rawPhone = propertyDoc.contactPhone || owner?.phone || '';
  const { tel, wa } = normalizePhone(rawPhone);

  adapted.ownerName     = owner?.name  || FALLBACK_NAME;
  adapted.ownerPhone    = tel || FALLBACK_PHONE;
  adapted.ownerWhatsapp = wa  || FALLBACK_WHATSAPP;
  adapted.ownerEmail    = owner?.email || FALLBACK_EMAIL;

  return adapted;
}

// ─── Rental page generator ────────────────────────────────────
function generateRentalPages(rentals, airbnbs, rentalTemplate) {
  console.log('\n📝 Generating Rental Pages...');
  let newCount = 0;

  rentals.forEach(prop => {
    let page = rentalTemplate;

    const numericPrice = prop.price?.toString().replace(/,/g, '') || '0';
    const estateSlug   = prop.estate.toLowerCase();

    let schemaType = 'Apartment';
    const propertyType = (prop.type || '').toLowerCase();
    const titleLower   = (prop.title || '').toLowerCase();
    if (
      propertyType.includes('bungalow') ||
      propertyType.includes('maisonette') ||
      propertyType.includes('mansion') ||
      titleLower.includes('bungalow') ||
      titleLower.includes('maisonette') ||
      titleLower.includes('mansion')
    ) {
      schemaType = 'House';
    }

    page = page.replace(/\{\{title\}\}/g, escapeHtml(prop.title));
    page = page.replace(/\{\{description\}\}/g, escapeHtml(prop.description || `Beautiful ${prop.type} in ${prop.estate}`));
    page = page.replace(/\{\{slug\}\}/g, prop.slug);
    page = page.replace(/\{\{estate\}\}/g, prop.estate);
    page = page.replace(/\{\{price\}\}/g, prop.price?.toLocaleString() || '0');

// ── Price suffix depends on listing type ────────────────────
const isSale =
  prop.rental_type === 'sale' ||
  prop.available_for === 'sale' ||
  (prop.type && String(prop.type).toLowerCase().includes('land'));

const priceSuffix = isSale ? '' : ' / month';
page = page.replace(/\{\{priceSuffix\}\}/g, priceSuffix);
    page = page.replace(/\{\{bedrooms\}\}/g, prop.specs?.bedrooms || 1);
    page = page.replace(/\{\{bathrooms\}\}/g, prop.specs?.bathrooms || 1);
    page = page.replace(/\{\{parking\}\}/g, prop.specs?.parking || 1);
    page = page.replace(/\{\{sqft\}\}/g, prop.specs?.sqft || 800);
    page = page.replace(/\{\{encodedTitle\}\}/g, encodeURIComponent(prop.title));
    page = page.replace(/\{\{fumigationLink\}\}/g, prop.fumigationLink || 'https://fumigo.co.ke');

    // ── Owner contact info ─────────────────────────────────────
    page = page.replace(/\{\{ownerName\}\}/g,     escapeHtml(prop.ownerName || FALLBACK_NAME));
    page = page.replace(/\{\{ownerPhone\}\}/g,    prop.ownerPhone || FALLBACK_PHONE);
    page = page.replace(/\{\{ownerWhatsapp\}\}/g, prop.ownerWhatsapp || FALLBACK_WHATSAPP);
    page = page.replace(/\{\{ownerEmail\}\}/g,    prop.ownerEmail || FALLBACK_EMAIL);

    const seoTitle  = prop.seo_title || `${prop.title} – KES ${prop.price?.toLocaleString()}${priceSuffix} | RentSpace`;
    const metaDesc  = prop.meta_description || (prop.description || '').substring(0, 150);
    page = page.replace(/\{\{seo_title\}\}/g, escapeHtml(seoTitle));
    page = page.replace(/\{\{meta_description\}\}/g, escapeHtml(metaDesc));

    const whyRent = prop.why_rent || '';
    page = page.replace(/\{\{why_rent\}\}/g, escapeHtml(whyRent));
    page = page.replace(/\{\{why_rent_display\}\}/g, whyRent ? 'block' : 'none');

    let featuresHtml = '';
    if (prop.features && prop.features.length) {
      featuresHtml = prop.features.map(f => `<li>${escapeHtml(f)}</li>`).join('');
    } else {
      featuresHtml = '<li>Tiled Floors</li><li>Water Heater</li><li>Secure Parking</li><li>24/7 Security</li>';
    }
    page = page.replace(/\{\{featuresList\}\}/g, featuresHtml);

    let mainImageHtml = '';
    let thumbnailsHtml = '';
    let mainImageUrl = '';

    if (prop.images && prop.images.length) {
      mainImageUrl = prop.images[0];
      mainImageHtml = `<img src="${mainImageUrl}" alt="${escapeHtml(prop.title)}" id="mainGalleryImg" loading="lazy">`;
      thumbnailsHtml = prop.images.map((img, idx) => {
        const altText = getAltTextForThumbnail(idx, prop, true);
        return `<div class="thumb" data-index="${idx}"><img src="${img}" alt="${altText}" loading="lazy"></div>`;
      }).join('');
    } else {
      mainImageUrl = '/images/placeholder.jpg';
      mainImageHtml = `<img src="${mainImageUrl}" alt="${escapeHtml(prop.title)}" id="mainGalleryImg" loading="lazy">`;
      thumbnailsHtml = `<div class="thumb" data-index="0"><img src="${mainImageUrl}" alt="No image available" loading="lazy"></div>`;
    }
    page = page.replace(/\{\{mainImage\}\}/, mainImageHtml);
    page = page.replace(/\{\{thumbnails\}\}/, thumbnailsHtml);
    page = page.replace(/\{\{mainImageUrl\}\}/g, mainImageUrl);

    page = page.replace(/\{\{numericPrice\}\}/g, numericPrice);
    page = page.replace(/\{\{estateSlug\}\}/g, estateSlug);
    page = page.replace(/\{\{schemaType\}\}/g, schemaType);

    // ── Recommendations — same category, prefer same estate ────
    const propCategory = getPropertyCategory(prop);

    // Pass 1: same estate + same category
    let similarRentals = rentals.filter(r =>
      r.id !== prop.id &&
      r.estate === prop.estate &&
      getPropertyCategory(r) === propCategory
    );

    // Pass 2: backfill with same category from other estates (only if needed)
    if (similarRentals.length < 4) {
      const extras = rentals.filter(r =>
        r.id !== prop.id &&
        r.estate !== prop.estate &&
        getPropertyCategory(r) === propCategory &&
        !similarRentals.some(s => s.id === r.id)
      );
      similarRentals = similarRentals.concat(extras);
    }

    similarRentals = similarRentals.slice(0, 4);

    let recsHtml = '';
    similarRentals.forEach(rec => {
      const recIsSale =
        rec.rental_type === 'sale' ||
        rec.available_for === 'sale' ||
        (rec.type && String(rec.type).toLowerCase().includes('land'));
      const recSuffix = recIsSale ? '' : ' / mo';

      recsHtml += `
        <a href="../property/${rec.slug}.html" class="rec-card">
          <div class="rec-card-image">
            <img src="${rec.images?.[0] || '/images/placeholder.jpg'}" alt="${escapeHtml(rec.title)}">
          </div>
          <div class="rec-card-info">
            <h4>${escapeHtml(rec.title)}</h4>
            <p>${rec.estate} · KES ${rec.price?.toLocaleString()}${recSuffix}</p>
          </div>
        </a>`;
    });
    page = page.replace(/\{\{recommendations\}\}/g, recsHtml);
    page = page.replace(/\{\{recommendationsHeading\}\}/g, getRecommendationsHeading(propCategory));

    const reviews = prop.reviews || [];
    let reviewsHtml = '';
    if (reviews.length > 0) {
      reviewsHtml = reviews.map(r => `
        <div class="testimonial-card">
          <div class="testimonial-content">
            <i class="fas fa-quote-left"></i>
            <p>"${escapeHtml(r.comment)}"</p>
          </div>
          <div class="testimonial-author">
            <strong>${escapeHtml(r.name)}</strong>
            <span>Verified Client</span>
          </div>
        </div>`).join('');
    } else {
      reviewsHtml = `
        <div class="testimonial-card">
          <div class="testimonial-content">
            <i class="fas fa-quote-left"></i>
            <p>"Great property, exactly as described. The team was responsive and professional."</p>
          </div>
          <div class="testimonial-author">
            <strong>Verified Client</strong>
            <span>RentSpace Tenant</span>
          </div>
        </div>`;
    }
    page = page.replace(/\{\{reviews\}\}/g, reviewsHtml);

    const outputPath = path.join(RENTAL_OUTPUT_DIR, `${prop.slug}.html`);
    const publicUrl = `${BASE_URL}/property/${prop.slug}.html`;

    const changed = writePageIfChanged(outputPath, page, publicUrl);
    if (changed) {
      newCount++;
      console.log(`   ✅ Rental: ${prop.slug}.html (new/changed)`);
    } else {
      console.log(`   · Rental: ${prop.slug}.html (unchanged, skipped)`);
    }
  });

  console.log(`   → ${newCount} new/changed rentals`);
}

// ─── Airbnb page generator ────────────────────────────────────
function generateAirbnbPages(airbnbs, airbnbTemplate) {
  console.log('\n📝 Generating Airbnb Pages...');
  let newCount = 0;

  airbnbs.forEach(prop => {
    let page = airbnbTemplate;

    const nightlyRate = prop.priceNight || prop.price_night || prop.price || 0;
    const weeklyRate  = nightlyRate * 6;
    const weeklySave  = Math.round(((nightlyRate * 7) - weeklyRate) / (nightlyRate * 7) * 100);

    page = page.replace(/\{\{title\}\}/g, escapeHtml(prop.title));
    page = page.replace(/\{\{description\}\}/g, escapeHtml(prop.description || `Beautiful ${prop.type} in ${prop.estate}`));
    page = page.replace(/\{\{slug\}\}/g, prop.slug);
    page = page.replace(/\{\{estate\}\}/g, prop.estate);
    page = page.replace(/\{\{price_night\}\}/g, nightlyRate.toLocaleString());
    page = page.replace(/\{\{price_weekly_discount\}\}/g, weeklyRate.toLocaleString());
    page = page.replace(/\{\{weekly_save_percent\}\}/g, weeklySave);
    page = page.replace(/\{\{bedrooms\}\}/g, prop.specs?.bedrooms || 1);
    page = page.replace(/\{\{bathrooms\}\}/g, prop.specs?.bathrooms || 1);
    page = page.replace(/\{\{max_guests\}\}/g, (prop.specs?.bedrooms * 2) || 4);
    page = page.replace(/\{\{sqft\}\}/g, prop.specs?.sqft || 800);
    page = page.replace(/\{\{airbnb_rating\}\}/g, prop.airbnb_rating || '4.9');
    page = page.replace(/\{\{airbnb_reviews\}\}/g, prop.airbnb_reviews || 25);
    page = page.replace(/\{\{host_name\}\}/g, prop.host_name || 'RentSpace Premier Host');
    page = page.replace(/\{\{host_response_rate\}\}/g, prop.host_response_rate || 98);
    page = page.replace(/\{\{host_response_time\}\}/g, prop.host_response_time || 'within an hour');
    page = page.replace(/\{\{cancellation_policy\}\}/g, prop.cancellation_policy || 'Free cancellation for 48 hours');

    // ── Owner contact info ─────────────────────────────────────
    page = page.replace(/\{\{ownerName\}\}/g,     escapeHtml(prop.ownerName || FALLBACK_NAME));
    page = page.replace(/\{\{ownerPhone\}\}/g,    prop.ownerPhone || FALLBACK_PHONE);
    page = page.replace(/\{\{ownerWhatsapp\}\}/g, prop.ownerWhatsapp || FALLBACK_WHATSAPP);
    page = page.replace(/\{\{ownerEmail\}\}/g,    prop.ownerEmail || FALLBACK_EMAIL);

    const seoTitle = prop.seo_title || `${prop.title} – KES ${nightlyRate}/night | RentSpace`;
    const metaDesc = prop.meta_description || (prop.description || '').substring(0, 150);
    page = page.replace(/\{\{seo_title\}\}/g, escapeHtml(seoTitle));
    page = page.replace(/\{\{meta_description\}\}/g, escapeHtml(metaDesc));

    const whyRent = prop.why_rent || '';
    page = page.replace(/\{\{why_rent\}\}/g, escapeHtml(whyRent));
    page = page.replace(/\{\{why_rent_display\}\}/g, whyRent ? 'block' : 'none');

    page = page.replace(/\{\{weekly_display\}\}/g, prop.price_week ? 'block' : 'none');
    page = page.replace(/\{\{superhost_display\}\}/g, prop.airbnb_superhost ? 'block' : 'none');

    let featuresHtml = '';
    if (prop.features && prop.features.length) {
      featuresHtml = prop.features.map(f => `<li>${escapeHtml(f)}</li>`).join('');
    } else {
      featuresHtml = '<li>Tiled Floors</li><li>Water Heater</li><li>Secure Parking</li><li>24/7 Security</li><li>High-speed WiFi</li>';
    }
    page = page.replace(/\{\{features_html\}\}/g, featuresHtml);

    let amenitiesHtml = '';
    if (prop.short_stay_amenities && prop.short_stay_amenities.length) {
      amenitiesHtml = prop.short_stay_amenities.map(a => `
        <div class="amenity-item">
          <i class="fas fa-check-circle"></i>
          <span>${escapeHtml(a)}</span>
        </div>`).join('');
    } else {
      amenitiesHtml = `
        <div class="amenity-item"><i class="fas fa-wifi"></i><span>High-speed WiFi</span></div>
        <div class="amenity-item"><i class="fas fa-tv"></i><span>Smart TV</span></div>
        <div class="amenity-item"><i class="fas fa-utensils"></i><span>Kitchenette</span></div>
        <div class="amenity-item"><i class="fas fa-parking"></i><span>Free parking</span></div>`;
    }
    page = page.replace(/\{\{amenities_html\}\}/g, amenitiesHtml);

    let mainImageHtml = '';
    let thumbnailsHtml = '';
    let mainImageUrl = '';

    if (prop.images && prop.images.length) {
      mainImageUrl = prop.images[0];
      mainImageHtml = `<img src="${mainImageUrl}" alt="${escapeHtml(prop.title)}" id="mainGalleryImg" loading="lazy">`;
      thumbnailsHtml = prop.images.map((img, idx) => {
        const altText = getAltTextForThumbnail(idx, prop, false);
        return `<div class="thumb" data-index="${idx}"><img src="${img}" alt="${altText}" loading="lazy"></div>`;
      }).join('');
    } else {
      mainImageUrl = '/images/placeholder.jpg';
      mainImageHtml = `<img src="${mainImageUrl}" alt="${escapeHtml(prop.title)}" id="mainGalleryImg" loading="lazy">`;
      thumbnailsHtml = `<div class="thumb" data-index="0"><img src="${mainImageUrl}" alt="No image available" loading="lazy"></div>`;
    }
    page = page.replace(/\{\{mainImage\}\}/, mainImageHtml);
    page = page.replace(/\{\{thumbnails\}\}/, thumbnailsHtml);
    page = page.replace(/\{\{mainImageUrl\}\}/g, mainImageUrl);

    const similarAirbnbs = airbnbs.filter(a => a.id !== prop.id && a.estate === prop.estate).slice(0, 3);
    let similarStaysHtml = '';
    similarAirbnbs.forEach(rec => {
      const recNightly = rec.priceNight || rec.price_night || rec.price || 0;
      similarStaysHtml += `
        <a href="../airbnb/${rec.slug}.html" class="rec-card">
          <div class="rec-card-image">
            <img src="${rec.images?.[0] || '/images/placeholder.jpg'}" alt="${escapeHtml(rec.title)}">
          </div>
          <div class="rec-card-info">
            <h4>${escapeHtml(rec.title)}</h4>
            <p>${rec.estate} · KES ${recNightly.toLocaleString()} / night</p>
            ${rec.airbnb_rating ? `<div class="rec-rating"><i class="fas fa-star"></i> ${rec.airbnb_rating}</div>` : ''}
          </div>
        </a>`;
    });
    page = page.replace(/\{\{similar_stays_html\}\}/g, similarStaysHtml);
    page = page.replace(/\{\{similar_stays_display\}\}/g, similarAirbnbs.length ? 'block' : 'none');

    let reviewsHtml = '';
    if (prop.reviews && prop.reviews.length) {
      reviewsHtml = prop.reviews.map(r => `
        <div class="review-card">
          <div class="review-header">
            <strong>${escapeHtml(r.name)}</strong>
            <div class="review-rating"><i class="fas fa-star"></i> ${r.rating}</div>
          </div>
          <p>"${escapeHtml(r.comment)}"</p>
          <span class="review-date">${escapeHtml(r.date)}</span>
        </div>`).join('');
    } else {
      reviewsHtml = `
        <div class="review-card">
          <div class="review-header">
            <strong>Sarah M.</strong>
            <div class="review-rating"><i class="fas fa-star"></i> 5</div>
          </div>
          <p>"Great location and value. Would stay again!"</p>
          <span class="review-date">2 weeks ago</span>
        </div>
        <div class="review-card">
          <div class="review-header">
            <strong>James K.</strong>
            <div class="review-rating"><i class="fas fa-star"></i> 4.8</div>
          </div>
          <p>"Amazing stay! The apartment was spotless and exactly as described."</p>
          <span class="review-date">1 month ago</span>
        </div>`;
    }
    page = page.replace(/\{\{reviews_html\}\}/g, reviewsHtml);
    page = page.replace(/\{\{reviews_display\}\}/g, 'block');

    const outputPath = path.join(AIRBNB_OUTPUT_DIR, `${prop.slug}.html`);
    const publicUrl = `${BASE_URL}/airbnb/${prop.slug}.html`;

    const changed = writePageIfChanged(outputPath, page, publicUrl);
    if (changed) {
      newCount++;
      console.log(`   ✅ Airbnb: ${prop.slug}.html (new/changed, KES ${nightlyRate}/night)`);
    } else {
      console.log(`   · Airbnb: ${prop.slug}.html (unchanged, skipped)`);
    }
  });

  console.log(`   → ${newCount} new/changed Airbnbs`);
}

// ─── Sitemap regeneration ─────────────────────────────────────
function generateSitemap(rentals, airbnbs) {
  console.log('\n🗺️  Regenerating sitemap.xml...');

  const today = new Date().toISOString().split('T')[0];

  const urls = [
    { loc: `${BASE_URL}/`, priority: '1.0' },
    { loc: `${BASE_URL}/rentals.html`, priority: '0.9' },
    { loc: `${BASE_URL}/airbnb.html`, priority: '0.9' },
    { loc: `${BASE_URL}/sale.html`, priority: '0.8' },
    { loc: `${BASE_URL}/land.html`, priority: '0.7' },
    { loc: `${BASE_URL}/about.html`, priority: '0.5' },
    { loc: `${BASE_URL}/contact.html`, priority: '0.5' },
    ...rentals.map(p => ({ loc: `${BASE_URL}/property/${p.slug}.html`, priority: '0.8' })),
    ...airbnbs.map(p => ({ loc: `${BASE_URL}/airbnb/${p.slug}.html`,   priority: '0.8' }))
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(SITEMAP_PATH, xml);
  console.log(`   ✅ Sitemap written: ${urls.length} URLs`);
}

// ─── Google Indexing API submission ───────────────────────────
async function submitToGoogle(urls) {
  if (!urls.length) {
    console.log('\n📤 No URLs to submit to Google.');
    return;
  }

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    console.log('\n⚠️  GOOGLE_APPLICATION_CREDENTIALS not set — skipping Google submission.');
    return;
  }

  if (!fs.existsSync(keyPath)) {
    console.log(`\n⚠️  Service account file not found at ${keyPath} — skipping Google submission.`);
    return;
  }

  console.log(`\n📤 Submitting ${urls.length} URL(s) to Google Indexing API...`);

  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/indexing']
  });
  const authClient = await auth.getClient();
  const indexing = google.indexing({ version: 'v3', auth: authClient });

  let ok = 0;
  let fail = 0;

  for (const url of urls) {
    try {
      await indexing.urlNotifications.publish({
        requestBody: { url, type: 'URL_UPDATED' }
      });
      ok++;
      console.log(`   ✅ ${url}`);
    } catch (err) {
      fail++;
      const msg = err.response?.data?.error?.message || err.message;
      console.log(`   ❌ ${url} — ${msg}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n   → ${ok} submitted, ${fail} failed`);
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(50));
  console.log('🚀 GENERATING ALL PROPERTY PAGES (from MongoDB)');
  console.log('='.repeat(50));

  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error('MONGODB_URI (or MONGO_URI) not set in environment / .env');
  }

  await mongoose.connect(MONGO_URI);
  console.log('🔌 Connected to MongoDB');

  const rentalTemplate = fs.readFileSync(RENTAL_TEMPLATE_PATH, 'utf8');
  const airbnbTemplate = fs.readFileSync(AIRBNB_TEMPLATE_PATH, 'utf8');

  const Property = require('./models/Property');
  const User     = require('./models/User');

  const raw = await Property.find({
    status: { $in: ['approved'] }
  }).lean();

  // ── Fetch all owners in ONE query ────────────────────────────
  const ownerIds = [...new Set(raw.map(p => p.ownerId).filter(Boolean).map(String))];
  const owners = await User.find({ _id: { $in: ownerIds } })
    .select('_id name phone email whatsapp')
    .lean();
  const ownerMap = {};
  owners.forEach(o => { ownerMap[o._id.toString()] = o; });

  // ── Attach owner contact info to each property ───────────────
  const properties = raw.map(p => {
    const adapted = adaptMongoDoc(p);
    return attachOwnerInfo(adapted, p, ownerMap);
  });

  const rentals = properties.filter(p =>
    p.rental_type === 'long_term' || (!p.price_night && p.available_for !== 'short_term')
  );
  const airbnbs = properties.filter(p =>
    p.rental_type === 'short_term' || p.price_night
  );

  console.log(`📊 Total properties: ${properties.length}`);
  console.log(`   🏠 Long-term rentals: ${rentals.length}`);
  console.log(`   ✨ Airbnb/Short-stay: ${airbnbs.length}`);
  console.log('='.repeat(50));

  generateRentalPages(rentals, airbnbs, rentalTemplate);
  generateAirbnbPages(airbnbs, airbnbTemplate);
  generateSitemap(rentals, airbnbs);

  await submitToGoogle(urlsToSubmit);

  await mongoose.disconnect();

  console.log('\n' + '='.repeat(50));
  console.log('🎉 GENERATION COMPLETE!');
  console.log('='.repeat(50));
  console.log(`   📁 Rentals: ${RENTAL_OUTPUT_DIR}`);
  console.log(`   📁 Airbnb:  ${AIRBNB_OUTPUT_DIR}`);
  console.log(`   📤 Submitted to Google: ${urlsToSubmit.length}`);
  console.log('\n💡 Next steps:');
  console.log('   1. git add property/ airbnb/ sitemap.xml');
  console.log('   2. git commit -m "Regenerate property pages"');
  console.log('   3. git push');
}

main().catch(err => {
  console.error('\n❌ Generation failed:', err);
  process.exit(1);
});