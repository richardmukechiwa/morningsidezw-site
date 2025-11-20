// scripts/seo-inject.js
import fs from 'fs';
import path from 'path';
const BUILD_DIR = './build';
const SEO_DIR = './seo';
function readJSON(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function escapeHtml(str){ if(!str) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function buildMetaTags(data,pageUrl){
  const tags=[];
  if(data.title) tags.push(`<title>${escapeHtml(data.title)}</title>`);
  if(data.description) tags.push(`<meta name="description" content="${escapeHtml(data.description)}">`);
  tags.push(`<meta property="og:type" content="website">`);
  if(data.og_title||data.title) tags.push(`<meta property="og:title" content="${escapeHtml(data.og_title||data.title)}">`);
  if(data.og_description||data.description) tags.push(`<meta property="og:description" content="${escapeHtml(data.og_description||data.description)}">`);
  if(data.og_image) tags.push(`<meta property="og:image" content="${escapeHtml(data.og_image)}">`);
  if(pageUrl) tags.push(`<meta property="og:url" content="${escapeHtml(pageUrl)}">`);
  tags.push(`<meta name="twitter:card" content="summary_large_image">`);
  if(data.twitter_title||data.title) tags.push(`<meta name="twitter:title" content="${escapeHtml(data.twitter_title||data.title)}">`);
  if(data.twitter_description||data.description) tags.push(`<meta name="twitter:description" content="${escapeHtml(data.twitter_description||data.description)}">`);
  if(data.twitter_image||data.og_image) tags.push(`<meta name="twitter:image" content="${escapeHtml(data.twitter_image||data.og_image)}">`);
  if(data.canonical) tags.push(`<link rel="canonical" href="${escapeHtml(data.canonical)}">`);
  return tags.join("\n  ");
}
function inject(){
  if(!fs.existsSync(BUILD_DIR)){ console.error('Build directory not found:', BUILD_DIR); process.exit(1);}
  const defaultMetaPath=path.join(SEO_DIR,'default.json'); const defaultMeta=fs.existsSync(defaultMetaPath)?readJSON(defaultMetaPath):{};
  const pageFiles=fs.readdirSync(BUILD_DIR).filter(f=>f.endsWith('.html'));
  pageFiles.forEach(file=>{
    const full=path.join(BUILD_DIR,file); let html=fs.readFileSync(full,'utf8');
    const pageKey=file==='index.html'?'home':file.replace('.html','');
    const pageMetaPath=path.join(SEO_DIR,'pages',`${pageKey}.json`);
    const pageMeta=fs.existsSync(pageMetaPath)?readJSON(pageMetaPath):{};
    const meta={...defaultMeta,...pageMeta};
    if(!meta.canonical && defaultMeta.site_url){ const pageUrl=defaultMeta.site_url.replace(/\/$/,'') + '/' + (file==='index.html'?'':file); meta.canonical=pageUrl;}
    const metaTags=buildMetaTags(meta,meta.canonical);
    if(/<head[^>]*>/i.test(html)){ html=html.replace(/<head([^>]*)>/i, `<head$1>\n  <!-- SEO injected -->\n  ${metaTags}`); } else { html=`<!-- SEO injected -->\n${metaTags}\n`+html; }
    fs.writeFileSync(full,html,'utf8'); console.log('Injected SEO into',file);
  });
}
inject();
