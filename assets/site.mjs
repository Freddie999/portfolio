import './assistant.mjs';
const menu = document.querySelector('.menu-toggle');
menu?.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') === 'true';
  menu.setAttribute('aria-expanded', String(!expanded));
  document.querySelector('#site-nav').classList.toggle('open', !expanded);
  menu.textContent = expanded ? 'MENU +' : 'CLOSE −';
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') menu.click();
});
const cards = [...document.querySelectorAll('.work-grid .project-card')];
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  const selected = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  let shown = 0;
  cards.forEach(card => { card.hidden = selected !== 'All' && card.dataset.domain !== selected; if (!card.hidden) shown++; });
  document.querySelector('#project-count').textContent = `${shown} PROJECT${shown === 1 ? '' : 'S'}`;
}));
document.querySelector('#reviewer-view')?.addEventListener('change', e => {
  document.querySelectorAll('.reviewer-details').forEach(el => el.hidden = !e.target.checked);
});
const canvas = document.querySelector('#spatial-field');
if (canvas) {
  const context = canvas.getContext('2d');
  const toggle = document.querySelector('#field-toggle');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches, frame = 0, width = 0, height = 0, nodes = [], tick = 0;
  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    width = box.width; height = box.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * ratio; canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(150, Math.max(45, Math.round(width / 12)));
    nodes = Array.from({length: count}, (_,i) => ({x: ((i * 7919 + 73) % 1000) / 1000 * width, y: ((i * 3571 + 157) % 1000) / 1000 * height, phase: i * 1.7}));
    draw();
  }
  function draw() {
    context.clearRect(0,0,width,height);
    const points = nodes.map(n => ({x:n.x + Math.sin(tick * .002 + n.phase) * 12,y:n.y + Math.cos(tick * .0025 + n.phase) * 9}));
    const reach = Math.min(150,width*.14);
    points.forEach((p,i) => {
      for (let j=i+1;j<points.length;j++) { const q=points[j]; const d=Math.hypot(p.x-q.x,p.y-q.y); if (d<reach) {context.strokeStyle=`rgba(83,85,65,${(1-d/reach)*.16})`;context.lineWidth=.6;context.beginPath();context.moveTo(p.x,p.y);context.lineTo(q.x,q.y);context.stroke();} }
      context.fillStyle = i%7===0 ? 'rgba(182,76,41,.47)' : 'rgba(58,65,48,.4)';context.beginPath();context.arc(p.x,p.y,i%7===0?1.2:.8,0,Math.PI*2);context.fill();
    });
  }
  let lastTime=0;
  function animate(time) {if (paused || document.hidden) {frame=0;return;}if(time-lastTime>40){tick++;draw();lastTime=time;}frame=requestAnimationFrame(animate);}
  function update() {toggle.textContent=paused?'PLAY FIELD':'PAUSE FIELD';toggle.setAttribute('aria-pressed',String(paused));if(frame)cancelAnimationFrame(frame);frame=0;if(!paused&&!document.hidden)frame=requestAnimationFrame(animate);}
  toggle.addEventListener('click',()=>{paused=!paused;update();});
  motion.addEventListener('change',()=>{paused=motion.matches;update();});
  document.addEventListener('visibilitychange',update);
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize(); update();
}
