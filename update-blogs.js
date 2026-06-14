const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BLOG_DIR = path.join(__dirname, 'blog');
const BASE_PATH = '/rentspace'; // Change if your GitHub Pages repo name differs

// Process each .html file in the blog folder
fs.readdirSync(BLOG_DIR).forEach(file => {
    if (!file.endsWith('.html')) return;
    
    const filePath = path.join(BLOG_DIR, file);
    console.log(`Processing: ${file}`);
    
    let html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);
    
    // 1. Update basePath in the inline script
    // Look for the getBasePath function and change the return value
    const scriptContent = $('script').html();
    if (scriptContent && scriptContent.includes('getBasePath')) {
        const updatedScript = scriptContent.replace(
            /return '\/rentspace';/,
            `return '${BASE_PATH}';`
        );
        $('script').html(updatedScript);
    }
    
    // 2. Update Explore Rentals dropdown – keep only Kitengela & Syokimau
    const rentalDropdown = $('.dropdown:first-child .dropdown-menu');
    if (rentalDropdown.length) {
        const newRentalLinks = `
            <li><a href="../rentals.html">All Rentals</a></li>
            <li><a href="../rentals.html?location=Syokimau">Syokimau</a></li>
            <li><a href="../rentals.html?location=Kitengela">Kitengela</a></li>
        `;
        rentalDropdown.html(newRentalLinks);
    }
    
    // 3. Update Airbnb dropdown – keep only Kitengela & Syokimau
    const airbnbDropdown = $('.dropdown:nth-child(2) .dropdown-menu');
    if (airbnbDropdown.length) {
        const newAirbnbLinks = `
            <li><a href="../airbnb.html">All Bnbs</a></li>
            <li><a href="../airbnb.html?location=Syokimau">Syokimau</a></li>
            <li><a href="../airbnb.html?location=Kitengela">Kitengela</a></li>
        `;
        airbnbDropdown.html(newAirbnbLinks);
    }
    
    // 4. Update footer "Areas" section – only Kitengela & Syokimau
    $('.footer-col').each((i, col) => {
        const heading = $(col).find('h4');
        if (heading.text().includes('Areas')) {
            const areaLinks = `
                <a href="../location/kitengela.html">Kitengela</a>
                <a href="../location/syokimau.html">Syokimau</a>
            `;
            $(col).find('a').remove();
            $(col).append(areaLinks);
        }
    });
    
    // 5. Preserve everything inside <article> – no changes needed, cheerio keeps it intact
    
    // Write back the updated HTML
    fs.writeFileSync(filePath, $.html());
    console.log(`   ✅ Updated: ${file}`);
});

console.log('\n🎉 All blog files updated successfully!');