/* SignalForge shared product navigation. A single data model, no parallel app router. */
(()=>{"use strict";
const routes=[
  {id:"terminal",label:"Terminal",url:"/terminal-next",matches:["/terminal-next","/app","/index.html"]},
  {id:"agent",label:"Market Agent",url:"/agent",matches:["/agent"]},
  {id:"radar",label:"Token Radar",url:"/radar",matches:["/radar","/tokens/solana/"]},
  {id:"pulse",label:"Market Pulse",url:"/web3",matches:["/web3"]},
  {id:"rooms",label:"Signal Rooms",url:"/app?view=community",matches:[]},
  {id:"developers",label:"Developers",url:"/developers",matches:["/developers"]}
];
function currentId(){const p=location.pathname;return routes.find(r=>r.matches.some(m=>p===m||m.endsWith("/")&&p.startsWith(m)))?.id||null}
function mountNav(host,opts={}){
 if(!host)return false;
 const orientation=opts.orientation||host.dataset.sfOrientation||"horizontal",selected=currentId();
 host.classList.add("sf-product-nav");
 host.classList.toggle("sf-product-nav--vertical",orientation==="vertical");
 host.classList.toggle("sf-product-nav--compact",orientation==="compact");
 host.setAttribute("aria-label","SignalForge product navigation");
 const fragment=document.createDocumentFragment();
 for(const [n,r] of routes.entries()){
  const a=document.createElement("a");a.href=r.url;a.textContent=r.label;
  if(selected===r.id)a.setAttribute("aria-current","page");
  if(orientation==="vertical"){const marker=document.createElement("span");marker.className="sf-nav-marker";marker.textContent=String(n+1).padStart(2,"0");a.prepend(marker)}
  fragment.append(a)
 }
 host.replaceChildren(fragment);
 host.dataset.sfReady="true";
 return true
}
function initialize(){
 document.querySelectorAll("[data-sf-nav]").forEach(el=>mountNav(el));
}
window.SFUI=Object.freeze({routes:routes.map(({id,label,url})=>({id,label,url})),mountNav});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();