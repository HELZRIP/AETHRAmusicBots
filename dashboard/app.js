let token='',guildId='';
const $=id=>document.getElementById(id);
async function api(path,method='GET',body){const r=await fetch(path,{method,headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:body?JSON.stringify(body):undefined});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`HTTP ${r.status}`);return d}
$('connect').onclick=async()=>{token=$('password').value;try{const guilds=await api('/api/guilds');$('guild').innerHTML=guilds.map(g=>`<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');if(!guilds.length)throw Error('Bot belum ada di server yang diizinkan.');guildId=guilds[0].id;$('login').hidden=true;$('app').hidden=false;await refresh()}catch(e){$('loginError').textContent=e.message}};
$('guild').onchange=async e=>{guildId=e.target.value;await refresh()};
$('refresh').onclick=()=>refresh();
async function refresh(){if(!guildId)return;try{const s=await api(`/api/${guildId}/state`);$('title').textContent=s.current?.title||'Belum ada lagu';$('artist').textContent=s.current?.author||'—';$('count').textContent=s.queueLength;$('queue').innerHTML=s.queue.map(t=>`<li>${escapeHtml(t.title)} <small>— ${escapeHtml(t.author||'')}</small></li>`).join('')||'<li>Antrean kosong</li>';$('autoplay').checked=s.autoplay;$('stay247').checked=s.stay247}catch(e){$('message').textContent=e.message}}
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{try{await api(`/api/${guildId}/${b.dataset.action}`,'POST');await refresh()}catch(e){$('message').textContent=e.message}});
$('play').onclick=async()=>{try{const query=$('query').value.trim();if(!query)return;$('message').textContent='Memuat…';await api(`/api/${guildId}/play`,'POST',{query});$('query').value='';$('message').textContent='Lagu ditambahkan.';await refresh()}catch(e){$('message').textContent=e.message}};
$('autoplay').onchange=async e=>{try{await api(`/api/${guildId}/autoplay`,'POST',{enabled:e.target.checked})}catch(err){$('message').textContent=err.message}};
$('stay247').onchange=async e=>{try{await api(`/api/${guildId}/247`,'POST',{enabled:e.target.checked})}catch(err){$('message').textContent=err.message}};
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
setInterval(()=>{if(! $('app').hidden)refresh()},10000);
