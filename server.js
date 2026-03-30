const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  // Security: prevent directory traversal
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  
  // Normalize path to avoid extra slashes or ".."
  filePath = path.normalize(filePath);
  
  // Ensure the requested file is inside the project directory
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if it's a directory (e.g., /images/)
  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 - File Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
      return;
    }
    
    if (stats.isDirectory()) {
      // Optionally serve index.html inside directory, or return 404
      res.writeHead(404);
      res.end('404 - Directory Not Accessible');
      return;
    }

    // Determine content type based on extension
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

    // Optional: set cache headers for static assets (CSS, JS, images)
    if (['.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(extname)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404);
          res.end('404 - File Not Found');
        } else {
          res.writeHead(500);
          res.end('Server Error');
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});