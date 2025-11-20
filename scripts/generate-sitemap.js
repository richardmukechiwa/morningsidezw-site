// scripts/generate-sitemap.js
import fs from 'fs';
import path from 'path';
const BUILD_DIR = './build';
const SEO_DIR = './seo';
function readJSON(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
const defaultMeta = fs.existsSync(path.join(SEO_DIR,'default.json'))?readJSON(path.join(SEO_DIR,'default.json')):{};
const siteUrl=(defaultMeta.site_url||'').replace(/\/$/,'');
const pages=fs.readdirSync(BUILD_DIR).filter(f=>f.endsWith('.html'));
const urls=pages.map(p=> p==='index.html'?`${siteUrl}/`:`${siteUrl}/${p}`);
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>`;
fs.writeFileSync(path.join(BUILD_DIR,'sitemap.xml'),sitemap,'utf8'); console.log('sitemap.xml generated in', BUILD_DIR);
