import './assistant.mjs?v=experience-20261021';
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
  let paused = motion.matches, frame = 0, width = 0, height = 0, nodes = [], lastTime = null;
  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    width = box.width; height = box.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * ratio; canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(240, Math.max(65, Math.round(width * height / 5500)));
    nodes = Array.from({length: count}, (_,i) => {
      const angle = i * 2.39996;
      const speed = 9 + (i % 8) * 1.5;
      return {x: ((i * 7919 + 73) % 1000) / 1000 * width, y: ((i * 3571 + 157) % 1000) / 1000 * height, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed};
    });
    draw();
  }
  function draw() {
    context.clearRect(0,0,width,height);
    const reach = Math.min(155,Math.max(105,width*.12));
    nodes.forEach((p,i) => {
      for (let j=i+1;j<nodes.length;j++) { const q=nodes[j]; const d=Math.hypot(p.x-q.x,p.y-q.y); if (d<reach) {context.strokeStyle=`rgba(83,85,65,${(1-d/reach)*.36})`;context.lineWidth=.75;context.beginPath();context.moveTo(p.x,p.y);context.lineTo(q.x,q.y);context.stroke();} }
      context.fillStyle = i%7===0 ? 'rgba(182,76,41,.8)' : 'rgba(58,65,48,.72)';context.beginPath();context.arc(p.x,p.y,i%7===0?1.6:1.1,0,Math.PI*2);context.fill();
    });
  }
  function animate(time) {
    if (paused || document.hidden) {frame=0;lastTime=null;return;}
    // Elapsed seconds keep the same visible speed on every display refresh rate.
    const elapsed = lastTime===null ? 0 : Math.min((time-lastTime)/1000,.05);lastTime=time;
    for(const node of nodes){
      node.x+=node.vx*elapsed;node.y+=node.vy*elapsed;
      if(node.x<0||node.x>width){node.x=Math.max(0,Math.min(width,node.x));node.vx*=-1;}
      if(node.y<0||node.y>height){node.y=Math.max(0,Math.min(height,node.y));node.vy*=-1;}
    }
    draw();frame=requestAnimationFrame(animate);
  }
  function update() {toggle.textContent=paused?'RESUME FIELD':'PAUSE FIELD';toggle.setAttribute('aria-pressed',String(paused));if(frame)cancelAnimationFrame(frame);frame=0;lastTime=null;if(!paused&&!document.hidden)frame=requestAnimationFrame(animate);}
  toggle.addEventListener('click',()=>{paused=!paused;update();});
  motion.addEventListener('change',()=>{paused=motion.matches;update();});
  document.addEventListener('visibilitychange',update);
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize(); update();
}
