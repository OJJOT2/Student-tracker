const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const indexPath = path.join(distDir, 'index.html');

try {
    let html = fs.readFileSync(indexPath, 'utf8');

    // 1. Remove crossorigin from script tags
    html = html.replace(/crossorigin/g, '');

    // 2. Find and Inline CSS
    // Match the css link: <link rel="stylesheet" href="./assets/index-XXXX.css">
    // Note: The previous step removed crossorigin, so we match the clean tag
    const cssMatch = html.match(/<link rel="stylesheet"\s+href="(\.\/assets\/[^"]+)"\s*>/);

    if (cssMatch) {
        const cssRelPath = cssMatch[1];
        const cssFullPath = path.join(distDir, cssRelPath);

        console.log(`Found CSS file: ${cssFullPath}`);

        if (fs.existsSync(cssFullPath)) {
            const cssContent = fs.readFileSync(cssFullPath, 'utf8');

            // Replace the link tag with inline style
            const styleTag = `<style>\n${cssContent}\n</style>`;
            html = html.replace(cssMatch[0], styleTag);

            console.log('Successfully inlined CSS into index.html');
        } else {
            console.error(`CSS file not found at: ${cssFullPath}`);
        }
    } else {
        console.log('No CSS link tag found in index.html to inline.');
    }

    fs.writeFileSync(indexPath, html);
    console.log('Post-build processing complete.');

} catch (err) {
    console.error('Error processing index.html:', err);
    process.exit(1);
}
