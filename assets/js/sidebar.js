(function(){
  const pages = [
    {href: 'index.html', label: 'Home'},
    {href: 'about.html', label: 'About'},
    {href: 'contact.html', label: 'Contact'},
    {href: 'privacy.html', label: 'Privacy'},
    {href: 'terms.html', label: 'Terms'}
  ];
  const main = document.querySelector('main');
  if(!main) return;
  const aside = document.createElement('aside');
  aside.className = 'sb-sidebar';
  const path = location.pathname.split('/').pop() || 'index.html';
  const links = pages.map(p => {
    const active = (path === p.href) ? ' style="background:rgba(255,255,255,.06)"' : '';
    return `<a href="${p.href}"${active}>${p.label}</a>`;
  }).join('');
  aside.innerHTML = `
    <div class="sb-brand"><span class="sb-dot"></span><span>Navigate</span></div>
    <div class="sb-nav">${links}</div>
    <div class="sb-tools">
      <button class="sb-btn" id="sbTop">↑ Top</button>
      <button class="sb-btn" id="sbBottom">↓ Bottom</button>
    </div>
    <div style="margin-top:12px; color:#9ca3af; font-size:12px">© ${new Date().getFullYear()} StockPricePredictions</div>
  `;
  const wrapper = document.createElement('div');
  wrapper.className = 'sb-page';
  const content = document.createElement('div');
  content.className = 'sb-content';
  while (main.firstChild) content.appendChild(main.firstChild);
  wrapper.appendChild(aside);
  wrapper.appendChild(content);
  main.replaceWith(wrapper);
  const toggle = document.createElement('button');
  toggle.className = 'sb-toggle';
  toggle.textContent = 'Menu';
  document.body.appendChild(toggle);
  toggle.addEventListener('click', ()=> aside.classList.toggle('sb-open'));
  const to = (pos)=>{
    const y = pos==='top' ? 0 : document.documentElement.scrollHeight;
    window.scrollTo({top:y, behavior:'smooth'});
  };
  aside.querySelector('#sbTop').addEventListener('click', ()=>to('top'));
  aside.querySelector('#sbBottom').addEventListener('click', ()=>to('bottom'));
})();
