// add-listing-type.js (updated with available_for)
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'data', 'properties.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let updatedCount = 0;

data.forEach((prop) => {
  // ---- STEP 1: Determine listingType ----
  let listingType = prop.listingType || ''; // keep existing if present

  if (!listingType) {
    if (prop.is_airbnb_ready === true || prop.rental_type === 'short_term') {
      listingType = 'short_term';
    } else if (prop.rental_type === 'long_term') {
      listingType = 'rent';
    } else if (prop.propertyType && prop.propertyType.toLowerCase().includes('land')) {
      listingType = 'sale';
    } else if (prop.type && prop.type.toLowerCase().includes('airbnb')) {
      listingType = 'short_term';
    } else if (prop.price_night && prop.price_night > 0) {
      listingType = 'short_term';
    } else {
      listingType = 'rent'; // fallback
    }
    prop.listingType = listingType;
    updatedCount++;
  } else {
    // If listingType already exists, we still want to update available_for
    // so we continue
  }

  // ---- STEP 2: Set available_for based on listingType ----
  let availableFor = '';

  if (listingType === 'rent') {
    availableFor = 'long_term';
  } else if (listingType === 'sale') {
    availableFor = 'sale';
  } else if (listingType === 'short_term') {
    // Check if it's available for both short and long term
    if (prop.is_airbnb_ready && prop.rental_type === 'both') {
      availableFor = 'both';
    } else {
      availableFor = 'short_term';
    }
  }

  // If no listingType yet (shouldn't happen), use fallback
  if (!availableFor) {
    if (prop.rental_type === 'long_term') availableFor = 'long_term';
    else if (prop.rental_type === 'short_term') availableFor = 'short_term';
    else if (prop.is_airbnb_ready) availableFor = 'short_term';
    else if (prop.price_night) availableFor = 'short_term';
    else availableFor = 'long_term';
  }

  prop.available_for = availableFor;

  // Also set rental_type if not present, but keep existing if any
  if (!prop.rental_type) {
    if (listingType === 'rent') prop.rental_type = 'long_term';
    else if (listingType === 'short_term') prop.rental_type = 'short_term';
    else if (listingType === 'sale') prop.rental_type = 'sale';
  }
});

// Write back
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

console.log(`✅ Updated ${updatedCount} properties with listingType and available_for!`);
console.log('📊 Summary:');
const types = {};
const avail = {};
data.forEach(p => {
  types[p.listingType] = (types[p.listingType] || 0) + 1;
  avail[p.available_for] = (avail[p.available_for] || 0) + 1;
});
console.log('listingType:', types);
console.log('available_for:', avail);