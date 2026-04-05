const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Paths that should be served with /rentspace prefix (matching GitHub Pages)
const GITHUB_PAGES_PREFIX = '/rentspace';

const server = http.createServer((req, res) => {
    // Get the requested URL
    let reqUrl = req.url;
    
    // Remove query parameters
    if (reqUrl.includes('?')) {
        reqUrl = reqUrl.split('?')[0];
    }
    
    // Handle /rentspace prefix (GitHub Pages style)
    let cleanPath = reqUrl;
    if (cleanPath.startsWith(GITHUB_PAGES_PREFIX)) {
        cleanPath = cleanPath.substring(GITHUB_PAGES_PREFIX.length);
    }
    
    // Default to index.html for root
    if (cleanPath === '' || cleanPath === '/') {
        cleanPath = '/index.html';
    }
    
    // Build file path
    let filePath = path.join(__dirname, cleanPath);
    
    // Normalize path to avoid extra slashes
    filePath = path.normalize(filePath);
    
    // Security: ensure file is inside project directory
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }
    
    // Check if file exists
    fs.stat(filePath, (err, stats) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Try adding .html extension for clean URLs
                const htmlPath = filePath + '.html';
                fs.stat(htmlPath, (err2, stats2) => {
                    if (!err2 && stats2.isFile()) {
                        serveFile(htmlPath, res);
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1>404 - File Not Found</h1>');
                    }
                });
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server Error');
            }
            return;
        }
        
        if (stats.isDirectory()) {
            // Try to serve index.html from directory
            const indexPath = path.join(filePath, 'index.html');
            fs.stat(indexPath, (err2, stats2) => {
                if (!err2 && stats2.isFile()) {
                    serveFile(indexPath, res);
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 - Directory Not Accessible</h1>');
                }
            });
            return;
        }
        
        serveFile(filePath, res);
    });
});

function serveFile(filePath, res) {
    // Determine content type
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.css': contentType = 'text/css'; break;
        case '.js': contentType = 'text/javascript'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': contentType = 'image/jpeg'; break;
        case '.jpeg': contentType = 'image/jpeg'; break;
        case '.gif': contentType = 'image/gif'; break;
        case '.svg': contentType = 'image/svg+xml'; break;
        case '.webp': contentType = 'image/webp'; break;
        case '.ico': contentType = 'image/x-icon'; break;
    }
    
    // Set cache headers for static assets
    if (['.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(extname)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
    }
    
    // Read and serve file
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Server Error');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

server.listen(PORT, () => {
    console.log(`\n🚀 Server running!`);
    console.log(`📍 Standard mode: http://localhost:${PORT}`);
    console.log(`📍 GitHub Pages mode: http://localhost:${PORT}/rentspace/`);
    console.log(`\n💡 Use the GitHub Pages mode for testing: http://localhost:${PORT}/rentspace/airbnb.html\n`);
});