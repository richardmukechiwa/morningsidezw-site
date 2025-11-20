const POSTS_PER_PAGE = 5;
let currentPage = 1;
async function loadPosts(){ const res = await fetch('../posts/index.json'); const posts = await res.json(); const start = (currentPage - 1) * POSTS_PER_PAGE; const end = start + POSTS_PER_PAGE; const current = posts.slice(start, end); const list = document.getElementById('post-list'); if(!list) return; list.innerHTML = ''; current.forEach(p => { const el = document.createElement('a'); el.href = `post.html?post=${p.file}`; el.className = 'block p-4 border rounded hover:bg-gray-50'; el.innerHTML = `<h2 class='text-xl font-bold'>${p.title}</h2><p class='text-gray-600 text-sm'>${p.date}</p><p class="mt-2 text-gray-700">${p.summary||''}</p>`; list.appendChild(el); });}
document.getElementById('prevBtn')?.addEventListener('click', ()=>{ if (currentPage > 1) { currentPage--; loadPosts(); }});
document.getElementById('nextBtn')?.addEventListener('click', ()=>{ currentPage++; loadPosts(); });
loadPosts();