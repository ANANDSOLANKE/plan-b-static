<script>
/* Sidebar injector: wraps ONLY <main>, keeps your .site-header and footer untouched */
(function(){
  // Pages to show in the sidebar nav
  const pages = [
    {href: 'index.html', label: 'Home'},
    {href: 'about.html', label: 'About'},
    {href: 'contact.html', label: 'Contact'},
    {href: 'privacy.html', label: 'Privacy'},
    {href: 'terms.html', label: 'Terms'}
  ];

  const main = document.querySelector('main');
  if(!main) return;

  // Build sidebar
  const aside = document.createElement('aside');
  aside.className = 'sb-sidebar';
  aside.innerHTML = `
    <div class="sb-brand">
      <span class="sb-dot"></span> <span>Navigate</span>
    </div>
    <div class="sb-nav" id="sb-nav"></div>
    <div class="sb-tools">
      <button class="sb-btn" id="sbTop">↑ Top</button>
      <button class="sb-btn" id="sbBottom">↓ Bottom</button>
    </div>
    <div style="margin-top:12px; color:var(--sb-muted); font-size:12px">© ${new Date().getFullYear()} StockPricePredictions</div>
  `;

  const nav = aside.querySelector('#sb-nav');
  const path = location.pathname.split('/').pop() || 'index.html';
  pages.forEach(p=>{
    const a = document.createElement('a');
    a.href = p.href;
    a.textContent = p.label;
    if (path === p.href) a.style.background = 'rgba(255,255,255,.06)';
    nav.appendChild(a);
  });

  // Build content wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'sb-page';

  const content = document.createElement('div');
  content.className = 'sb-content';

  // Move existing main children into sb-content
  while (main.firstChild) content.appendChild(main.firstChild);

  // Put sidebar + content into wrapper, then replace <main>
  wrapper.appendChild(aside);
  wrapper.appendChild(content);
  main.replaceWith(wrapper);

  // Add mobile toggle button
  const toggle = document.createElement('button');
  toggle.className = 'sb-toggle';
  toggle.textContent = 'Menu';
  document.body.appendChild(toggle);

  const open = ()=> aside.classList.add('sb-open');
  const close = ()=> aside.classList.remove('sb-open');

  const isMobile = () => matchMedia('(max-width: 980px)').matches;
  toggle.addEventListener('click', ()=>{
    if (isMobile()){
      aside.classList.toggle('sb-open');
    } else {
      // collapse by sliding out on desktop too
      aside.classList.toggle('sb-open');
    }
  });

  // Scroll helpers
  const to = (pos)=>{
    const y = (pos==='top') ? 0 : document.documentElement.scrollHeight;
    window.scrollTo({top:y, behavior:'smooth'});
  };
  aside.querySelector('#sbTop').addEventListener('click', ()=>to('top'));
  aside.querySelector('#sbBottom').addEventListener('click', ()=>to('bottom'));

  // Contact form "Thanks!" inline message
  document.addEventListener('submit', function(e){
    const form = e.target;
    if (form.classList.contains('contact-form')){
      e.preventDefault();
      // find or add .thanks-msg element
      let thanks = form.querySelector('.thanks-msg');
      if (!thanks){
        thanks = document.createElement('div');
        thanks.className = 'thanks-msg';
        form.appendChild(thanks);
      }
      thanks.textContent = 'Thanks! Your message has been recorded.';
      thanks.style.display = 'block';
      form.reset();
      // auto close sidebar on mobile after send (optional UX)
      close();
    }
  });
})();
</script>
