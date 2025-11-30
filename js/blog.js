// /js/blog.js
(async function(){
  const container = document.getElementById('posts-list');
  if (!container) return;
  try {
    const res = await fetch('/blog/posts/posts.json', {cache: 'no-cache'});
    if (!res.ok) {
      container.innerHTML = '<p class="text-sm text-gray-500">No posts found.</p>';
      return;
    }
    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500">No posts yet.</p>';
      return;
    }
    // sort by date desc
    posts.sort((a,b)=> new Date(b.date) - new Date(a.date));
    container.innerHTML = posts.map(p => renderPostCard(p)).join('');
  } catch (err) {
    console.error('blog list error', err);
    container.innerHTML = '<p class="text-sm text-red-500">Failed to load posts.</p>';
  }

  function renderPostCard(p){
    const date = new Date(p.date);
    const dateStr = date.toLocaleDateString();
    const tags = (p.tags || []).map(t => `<span class="text-xs px-2 py-0.5 bg-gray-100 rounded">${escapeHtml(t)}</span>`).join(' ');
    return `
      <article class="bg-white p-5 rounded-lg shadow-sm">
        <h2 class="text-xl font-semibold mb-1"><a href="${escapeHtml(p.slug)}" class="text-gray-900">${escapeHtml(p.title)}</a></h2>
        <div class="text-sm text-gray-500 mb-3">${dateStr}</div>
        <p class="text-gray-700 mb-3">${escapeHtml(p.description || '')}</p>
        <div class="flex gap-2">${tags}</div>
      </article>
    `;
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
})();
