/* SignalForge v11 / one product navigation, one discoverability layer.
   No duplicate SPA, customer state, analytics, API adapters, wallet or billing.
   Actions are actual existing routes and views; no invented product promises. */
(()=>{"use strict";
const routes=[
 {id:"terminal",label:"Terminal",url:"/",matches:["/","/terminal-next","/app","/index.html"]},
 {id:"agent",label:"Market Agent",url:"/agent",matches:["/agent"]},
 {id:"radar",label:"Token Radar",url:"/radar",matches:["/radar","/tokens/solana/"]},
 {id:"pulse",label:"Market Pulse",url:"/web3",matches:["/web3"]},
 {id:"rooms",label:"Signal Rooms",url:"/app?view=community",matches:[]},
 {id:"developers",label:"Developers",url:"/developers",matches:["/developers"]}
];
const destinations=[
 {title:"Terminal",detail:"Live Kraken chart, market watchlist and source-aware research",url:"/",icon:"◈",group:"MARKETS"},
 {title:"Market Agent",detail:"Ask source-linked questions and revisit investigations",url:"/agent",icon:"✧",group:"AGENT"},
 {title:"Token Radar",detail:"Research Solana token pools, liquidity and watchlists",url:"/radar",icon:"◎",group:"MARKETS"},
 {title:"Prediction Markets",detail:"Polymarket events and public source observations",url:"/web3#prediction",icon:"◇",group:"MARKETS"},
 {title:"Hyperliquid Perps",detail:"Funding, volume and approximate open interest",url:"/web3#perps",icon:"↗",group:"MARKETS"},
 {title:"Web3 Market Pulse",detail:"Browse cross-venue activity and unavailable source states",url:"/web3",icon:"⌁",group:"MARKETS"},
 {title:"Opportunity Scanner",detail:"Filter research setups by market and evidence",url:"/app?view=scanner",icon:"⌕",group:"RESEARCH"},
 {title:"Strategy Library",detail:"Explainable market strategy models",url:"/app?view=strategies",icon:"▥",group:"RESEARCH"},
 {title:"Backtest Lab",detail:"Historical research simulation and assumptions",url:"/app?view=backtest",icon:"▦",group:"RESEARCH"},
 {title:"Track Record",detail:"Historical evaluation and source-mode limitations",url:"/app?view=trackrecord",icon:"◷",group:"RESEARCH"},
 {title:"Signal Rooms",detail:"Real user discussions, sources and replies",url:"/app?view=community",icon:"◉",group:"COMMUNITY"},
 {title:"Forge Studio",detail:"Create and schedule source-linked market monitors after sign-in",url:"/agent#forgeForm",icon:"✳",group:"BUILD"},
 {title:"Private Research Tasks",detail:"Your scoped agent jobs, artifacts and receipts",url:"/agent#customerTasks",icon:"≋",group:"AGENT"},
 {title:"Market Memory",detail:"Conversations, saved theses, watchlists and notes",url:"/agent#v6Workspace",icon:"▤",group:"AGENT"},
 {title:"Genesis & Rewards",detail:"Noncash points and qualified research referrals",url:"/agent#genesisScore",icon:"✦",group:"COMMUNITY"},
 {title:"Model Router",detail:"Model availability and source-only fallback",url:"/app?view=models",icon:"⌘",group:"BUILD"},
 {title:"Developer API",detail:"API keys, usage and documented integration",url:"/app?view=api",icon:"{ }",group:"BUILD"},
 {title:"MCP Developers",detail:"Connect real market research tools from another AI host",url:"/developers",icon:"⟡",group:"BUILD"},
 {title:"Plans & Access",detail:"Free, Pro, Quant and Stripe checkout",url:"/app?view=pricing",icon:"◇",group:"ACCOUNT"},
 {title:"Account",detail:"Sign in, manage account and subscription",url:"/app?view=dashboard",icon:"◍",group:"ACCOUNT"},
 {title:"About SignalForge",detail:"Company vision, markets, methods and product details",url:"/welcome",icon:"S",group:"ABOUT"}
];
function currentId(){
 const p=location.pathname,q=new URLSearchParams(location.search);
 if(p==="/app"&&q.get("view")==="community")return "rooms";
 return routes.find(r=>r.matches.some(m=>p===m||(m.endsWith("/")&&p.startsWith(m))))?.id||null;
}
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
  if(orientation==="vertical"){
   const marker=document.createElement("span");marker.className="sf-nav-marker";
   marker.textContent=String(n+1).padStart(2,"0");a.prepend(marker);
  }
  fragment.append(a);
 }
 host.replaceChildren(fragment);host.dataset.sfReady="true";return true;
}
let dialog=null,searchInput=null,resultList=null,previousFocus=null,launcher=null;
function node(tag,cls,copy){const el=document.createElement(tag);if(cls)el.className=cls;if(copy!=null)el.textContent=copy;return el}
function setOpen(open){
 if(!dialog||!searchInput)return;
 if(open){
  previousFocus=document.activeElement;
  dialog.hidden=false;
  document.documentElement.style.setProperty("--sf-overlay-active","1");
  searchInput.value="";renderResults("");
  searchInput.focus();
 }else{
  dialog.hidden=true;document.documentElement.style.removeProperty("--sf-overlay-active");
  if(previousFocus&&previousFocus.isConnected&&typeof previousFocus.focus==="function")previousFocus.focus();
  previousFocus=null;
 }
}
function renderResults(term){
 resultList.replaceChildren();
 const q=String(term).toLowerCase().trim().replace(/\s+/g," ");
 const words=q.split(" ").filter(Boolean);
 const results=destinations.filter(d=>{
  const hay=(d.title+" "+d.detail+" "+d.group).toLowerCase();
  return words.every(w=>hay.includes(w));
 }).slice(0,14);
 if(!results.length){resultList.append(node("div","sf-command-empty","No matching destination. Try Agent, scanner, perps, rooms, Studio or billing."));return}
 let last=null;
 for(const d of results){
  if(d.group!==last){last=d.group;resultList.append(node("div","sf-command-section",last))}
  const a=node("a","sf-command-result");a.href=d.url;
  const ico=node("span","sf-command-ico",d.icon);
  const copy=node("span");copy.append(node("b","",d.title),node("small","",d.detail));
  const arrow=node("span","sf-command-go","↗");arrow.setAttribute("aria-hidden","true");
  a.append(ico,copy,arrow);resultList.append(a);
 }
}
function createDialog(){
 dialog=node("div","sf-command-backdrop");dialog.hidden=true;
 dialog.setAttribute("role","presentation");
 const modal=node("section","sf-command");modal.setAttribute("role","dialog");
 modal.setAttribute("aria-modal","true");modal.setAttribute("aria-labelledby","sf-command-heading");
 const header=node("div","sf-command-head");
 const mark=node("span","sf-command-mark","⌘");mark.setAttribute("aria-hidden","true");
 searchInput=node("input");searchInput.id="sf-command-search";
 searchInput.type="search";searchInput.autocomplete="off";searchInput.spellcheck=false;
 searchInput.placeholder="Search the product, not a static menu…";
 searchInput.setAttribute("aria-label","Find market tools, product views and settings");
 const close=node("button","sf-command-close","Esc");close.type="button";
 close.setAttribute("aria-label","Close command search");
 close.addEventListener("click",()=>setOpen(false));
 header.append(mark,searchInput,close);
 const heading=node("div","sf-command-label","SIGNALFORGE / NAVIGATE THE MARKET");
 heading.id="sf-command-heading";
 resultList=node("div","sf-command-items");resultList.id="sf-command-results";
 resultList.setAttribute("aria-live","polite");
 const foot=node("div","sf-command-foot");
 foot.append(node("span","","↑ ↓ Navigate    Enter Open"),node("span","","Real product destinations only"));
 modal.append(header,heading,resultList,foot);dialog.append(modal);
 document.body.append(dialog);
 dialog.addEventListener("click",e=>{if(e.target===dialog)setOpen(false)});
 searchInput.addEventListener("input",e=>renderResults(e.target.value));
 searchInput.addEventListener("keydown",e=>{
  const items=[...resultList.querySelectorAll("a.sf-command-result")];
  if(e.key==="ArrowDown"){e.preventDefault();(items[0]||searchInput).focus()}
  if(e.key==="Enter"&&items[0]){e.preventDefault();location.assign(items[0].href)}
 });
 resultList.addEventListener("keydown",e=>{
  if(!["ArrowDown","ArrowUp"].includes(e.key))return;
  const items=[...resultList.querySelectorAll("a.sf-command-result")],idx=items.indexOf(document.activeElement);
  if(idx<0)return;e.preventDefault();
  if(e.key==="ArrowUp"&&idx===0){searchInput.focus();return}
  items[Math.max(0,Math.min(items.length-1,idx+(e.key==="ArrowDown"?1:-1)))].focus();
 });
 dialog.addEventListener("keydown",e=>{
  if(e.key!=="Tab")return;
  const focusable=[...dialog.querySelectorAll('input:not([disabled]),button:not([disabled]),a[href]')].filter(el=>el.offsetParent!==null);
  if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 });
 document.addEventListener("keydown",e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){
   e.preventDefault();setOpen(dialog.hidden);return;
  }
  if(e.key==="Escape"&&!dialog.hidden){e.preventDefault();setOpen(false)}
 });
}
function createLauncher(){
 launcher=node("button","sf-global-launcher");launcher.type="button";
 launcher.setAttribute("aria-label","Explore SignalForge tools and views (Command K)");
 launcher.append(node("span","sf-launcher-mark","⌘"),node("span","","Explore SignalForge"),node("kbd","","⌘ K"));
 launcher.addEventListener("click",()=>setOpen(true));
 document.body.append(launcher);
}
function createMobileDock(){
 const dock=node("nav","sf-mobile-dock");dock.setAttribute("aria-label","Quick product navigation");
 const entries=[
  {label:"Market",glyph:"◈",url:"/",id:"terminal"},
  {label:"Agent",glyph:"✧",url:"/agent",id:"agent"},
  {label:"Explore",glyph:"⌕",url:"/web3",id:"pulse"},
  {label:"Rooms",glyph:"◉",url:"/app?view=community",id:"rooms"}
 ];
 const active=currentId();
 for(const r of entries){
  const a=node("a");a.href=r.url;
  if(active===r.id)a.setAttribute("aria-current","page");
  a.append(node("span","sf-dock-glyph",r.glyph),node("span","",r.label));dock.append(a);
 }
 const more=node("button","sf-dock-search");more.type="button";
 more.setAttribute("aria-label","Open all tools and views");
 more.append(node("span","sf-dock-glyph","⌘"),node("span","","All tools"));
 more.addEventListener("click",()=>setOpen(true));dock.append(more);
 document.body.append(dock);
}
function initialize(){
 document.querySelectorAll("[data-sf-nav]").forEach(el=>mountNav(el));
 const surface=document.body.dataset.sfSurface;
 if(!surface||surface==="internal")return;
 createDialog();createLauncher();createMobileDock();
 window.SFUI.openCommand=()=>setOpen(true);
}
window.SFUI={routes:routes.map(({id,label,url})=>({id,label,url})),mountNav,openCommand:()=>{if(dialog)setOpen(true)}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();