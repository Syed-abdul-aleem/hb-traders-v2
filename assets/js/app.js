/* HB Traders v2 — storefront engine. No prices anywhere:
   the WhatsApp message lists products + quantities; the store confirms
   prices, availability and delivery charges in the chat. */
(function(){
"use strict";
const SETTINGS = hbSettings();
const PRODUCTS = hbCatalog();
const WA = SETTINGS.whatsapp;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const imgPath=p=>p.img || ((document.body.dataset.root||"")+"assets/images/products/"+p.slug+".webp");
const waLink=text=>`https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
const stockLabel={in:"In Stock",low:"Low Stock",out:"Out of Stock"};

/* store settings -> page */
$$("[data-wa]").forEach(a=>{a.href=waLink(a.dataset.wa||"Hello HB Traders!")});
$$("[data-wa-plain]").forEach(a=>{a.href=`https://wa.me/${WA}`});
$$("[data-phone-display]").forEach(el=>el.textContent=SETTINGS.phoneDisplay);
$$("[data-address]").forEach(el=>el.textContent=SETTINGS.address);

/* accent colour (admin setting) */
const ACCENTS={green:null,navy:{g:"#0b3d6b",gd:"#072a4a",gs:"#e9f0f7"},teal:{g:"#0e7c86",gd:"#0a5a61",gs:"#e6f4f5"},maroon:{g:"#8e2f32",gd:"#6d2123",gs:"#f9ecec"}};
const acc=ACCENTS[SETTINGS.accent];
if(acc){document.documentElement.style.setProperty("--green",acc.g);document.documentElement.style.setProperty("--green-dark",acc.gd);document.documentElement.style.setProperty("--green-soft",acc.gs)}
/* announcement bar (admin setting) */
if(SETTINGS.announcementOn&&SETTINGS.announcement){
  const bar=document.createElement("div"); bar.className="announce"; bar.textContent=SETTINGS.announcement;
  document.body.insertBefore(bar,document.body.firstChild);
}
/* live open / closed badge in the top strip */
(function(){
  const strip=document.querySelector(".topstrip .container"); if(!strip)return;
  const fmt=t=>{const[h,m]=t.split(":").map(Number);const ap=h>=12?"PM":"AM";return ((h+11)%12+1)+(m?":"+String(m).padStart(2,"0"):"")+" "+ap};
  const now=new Date(), cur=now.getHours()*60+now.getMinutes();
  const[h1,m1]=(SETTINGS.openTime||"09:00").split(":").map(Number), [h2,m2]=(SETTINGS.closeTime||"21:00").split(":").map(Number);
  const open=h1*60+m1, close=h2*60+m2, isOpen=cur>=open&&cur<close;
  const b=document.createElement("span"); b.className="ts open-badge "+(isOpen?"is-open":"is-closed");
  b.innerHTML=`<i></i>${isOpen?`Open now · closes ${fmt(SETTINGS.closeTime||"21:00")}`:`Closed · opens ${fmt(SETTINGS.openTime||"09:00")}`}`;
  strip.appendChild(b);
})();

/* ---------- Loader ---------- */
function hideLoader(){const l=$("#loader");if(l)l.classList.add("done")}
window.addEventListener("load",()=>setTimeout(hideLoader,600));
setTimeout(hideLoader,3000);

/* ---------- Cart ---------- */
let cart={};
try{cart=JSON.parse(localStorage.getItem("hb_cart_v2")||"{}")}catch(e){cart={}}
/* drop cart entries for products that no longer exist */
Object.keys(cart).forEach(id=>{if(!PRODUCTS.find(p=>p.id==id))delete cart[id]});
const saveCart=()=>localStorage.setItem("hb_cart_v2",JSON.stringify(cart));
const cartCount=()=>Object.values(cart).reduce((a,b)=>a+b,0);
function toast(msg){const t=$("#toast");if(!t)return;t.innerHTML=msg;t.classList.add("show");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("show"),2600)}
function updateCartUI(){
  const c=cartCount();
  $$(".cart-count").forEach(el=>{el.textContent=c;el.style.display=c?"grid":"none"});
  const body=$("#cartItems"), foot=$("#cartFoot"); if(!body)return;
  const entries=Object.entries(cart);
  if(!entries.length){
    body.innerHTML=`<div class="cart-empty">${icon("cart")}<h4>Your cart is empty</h4><p>Add medicines and health products, then send the order to our WhatsApp.</p></div>`;
    if(foot)foot.style.display="none"; return;
  }
  if(foot)foot.style.display="block";
  body.innerHTML=entries.map(([id,q])=>{
    const p=PRODUCTS.find(x=>x.id==id); if(!p)return"";
    return `<div class="cart-item">
      <img src="${imgPath(p)}" alt="${p.name}">
      <div><h4>${p.name}</h4><div class="ci-meta">${p.pack}<br>Code: ${p.sku}</div>
      <div class="ci-qty" style="margin-top:7px"><button data-dec="${p.id}" aria-label="Decrease quantity">−</button><span>${q}</span><button data-inc="${p.id}" aria-label="Increase quantity">+</button></div></div>
      <div class="ci-right"><button class="remove-btn" data-remove="${p.id}">Remove</button></div>
    </div>`}).join("");
  const n=$("#cartItemCount"); if(n)n.textContent=`${c} item${c>1?"s":""} in your cart`;
}
function addToCart(id,qty=1,openDrawer=false){
  const p=PRODUCTS.find(x=>x.id===id); if(!p)return;
  if(p.stock==="out"){toast(`<b>${p.name}</b> is out of stock right now — ask us on WhatsApp for the closest option.`);return}
  cart[id]=Math.min(99,(cart[id]||0)+qty); if(cart[id]<=0)delete cart[id];
  saveCart(); updateCartUI();
  $$(".cart-count").forEach(el=>{el.classList.remove("bump");void el.offsetWidth;el.classList.add("bump")});
  toast(`<b>Added to cart:</b> ${p.name} × ${qty}`);
  if(openDrawer)openCart();
}
document.addEventListener("click",e=>{
  const add=e.target.closest("[data-add]"); if(add){addToCart(+add.dataset.add,1);const old=add.innerHTML;add.classList.add("added");add.innerHTML="Added — in cart";setTimeout(()=>{add.classList.remove("added");add.innerHTML=old},1300);return}
  const inc=e.target.closest("[data-inc]"); if(inc){addToCart(+inc.dataset.inc,1);return}
  const dec=e.target.closest("[data-dec]"); if(dec){const id=dec.dataset.dec;cart[id]--;if(cart[id]<=0)delete cart[id];saveCart();updateCartUI();return}
  const rem=e.target.closest("[data-remove]"); if(rem){delete cart[rem.dataset.remove];saveCart();updateCartUI();return}
  const buy=e.target.closest("[data-buy]"); if(buy){const p=PRODUCTS.find(x=>x.id==buy.dataset.buy);if(p)directWhatsApp(p,1);return}
  const view=e.target.closest("[data-view]"); if(view){openProduct(+view.dataset.view);return}
});
function openCart(){$("#cartWrap").classList.add("open");document.body.style.overflow="hidden"}
function closeCart(){$("#cartWrap").classList.remove("open");document.body.style.overflow=""}
$$(".open-cart").forEach(b=>b.addEventListener("click",openCart));
const cw=$("#cartWrap"); if(cw)cw.addEventListener("click",e=>{if(e.target===cw||e.target.closest(".close-cart"))closeCart()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeCart();closeProduct()}});
const clearBtn=$("#clearCart"); if(clearBtn)clearBtn.addEventListener("click",()=>{cart={};saveCart();updateCartUI();toast("Cart cleared")});

/* ---------- Cart drawer: two steps — 1) review items, 2) details form ----------
   The form used to sit under the items permanently and push them out of view.
   Now the form only appears after the customer confirms the cart. */
const cartFoot=$("#cartFoot");
if(cartFoot){
  const note=cartFoot.querySelector(".confirm-note"), cForm=cartFoot.querySelector(".checkout-form"),
        fErr=$("#formError"), oBtn=$("#placeOrder"), cBtn=$("#clearCart");
  const step1=document.createElement("div"); step1.id="cartStep1";
  const step2=document.createElement("div"); step2.id="cartStep2"; step2.style.display="none";
  const proceed=document.createElement("button");
  proceed.className="order-btn"; proceed.id="toCheckout"; proceed.type="button";
  proceed.innerHTML=icon("check")+" Confirm Cart &amp; Continue";
  const back=document.createElement("button");
  back.className="clear-btn"; back.id="backToCart"; back.type="button";
  back.textContent="← Back to cart items"; back.style.cssText="margin:0 0 10px;text-align:left;width:auto";
  if(note)step1.appendChild(note);
  step1.appendChild(proceed);
  if(cBtn)step1.appendChild(cBtn);
  step2.appendChild(back);
  if(cForm)step2.appendChild(cForm);
  if(fErr)step2.appendChild(fErr);
  if(oBtn)step2.appendChild(oBtn);
  cartFoot.append(step1,step2);
  const drawerBody=$("#cartItems");
  const showStep1=()=>{step2.style.display="none";step1.style.display="block";if(drawerBody)drawerBody.scrollTop=0};
  const showStep2=()=>{step1.style.display="none";step2.style.display="block";const n=$("#custName");if(n)n.focus()};
  proceed.addEventListener("click",()=>{if(!cartCount()){toast("Your cart is empty — add a product first.");return}showStep2()});
  back.addEventListener("click",showStep1);
  $$(".open-cart").forEach(b=>b.addEventListener("click",showStep1));
  if(oBtn)oBtn.addEventListener("click",()=>setTimeout(showStep1,600));
  window.__hbShowStep1=showStep1;
  const _hbOpenCart=openCart;
  openCart=function(){_hbOpenCart();showStep1()};
}

/* ---------- WhatsApp ordering (no prices) ---------- */
function orderLines(){
  return Object.entries(cart).map(([id,q],i)=>{
    const p=PRODUCTS.find(x=>x.id==id);
    return `${i+1}. ${p.name} — ${p.pack} (${p.sku})\n    Quantity: ${q}`;
  }).join("\n");
}
function directWhatsApp(p,qty){
  const msg=`Hello HB Traders! I want to order:\n\n1. ${p.name} — ${p.pack} (${p.sku})\n    Quantity: ${qty}\n\nPlease confirm the price, availability and delivery charges. Thank you!`;
  window.open(waLink(msg),"_blank");
}
const orderBtn=$("#placeOrder");
if(orderBtn)orderBtn.addEventListener("click",()=>{
  if(!cartCount()){toast("Your cart is empty — add a product first.");return}
  const name=$("#custName").value.trim(), phone=$("#custPhone").value.trim(), addr=$("#custAddress").value.trim(), note=$("#custNote").value.trim();
  const err=$("#formError");
  if(name.length<3||phone.length<10||addr.length<8){
    err.textContent="Please add your name, a valid phone number and your full delivery address so we can deliver your order.";
    err.style.display="block"; return;
  }
  err.style.display="none";
  const hasRx=Object.keys(cart).some(id=>{const p=PRODUCTS.find(x=>x.id==id);return p&&p.rx});
  let msg=`Hello HB Traders! I want to place an order:\n--------------------------------\n${orderLines()}\n--------------------------------\nTotal items: ${cartCount()}\n\nName: ${name}\nPhone: ${phone}\nAddress: ${addr}`;
  if(note)msg+=`\nNote: ${note}`;
  if(hasRx)msg+=`\n\nNote: My order includes a prescription item — I will share my prescription photo here.`;
  msg+=`\n\nPlease confirm the prices, availability and delivery charges. Thank you!`;
  hbSaveOrder({ts:Date.now(),name,phone,address:addr,status:"New",items:Object.keys(cart).map(id=>{const p=PRODUCTS.find(x=>x.id==id);return p?{slug:p.slug,name:p.name,pack:p.pack,sku:p.sku,qty:cart[id]}:null}).filter(Boolean)});
  window.open(waLink(msg),"_blank");
  toast("Opening WhatsApp with your order…");
});

/* ---------- Product modal with full details ---------- */
let modalQty=1, modalId=null;
function openProduct(id){
  const p=PRODUCTS.find(x=>x.id===id); if(!p)return;
  modalId=id; modalQty=1;
  try{const r=JSON.parse(localStorage.getItem("hb_recent_v1")||"[]").filter(x=>x!==p.slug);r.unshift(p.slug);localStorage.setItem("hb_recent_v1",JSON.stringify(r.slice(0,8)))}catch(e){}
  const m=$("#productModal"); if(!m)return;
  $("#pmContent").innerHTML=`
    <div class="modal-grid">
      <div class="modal-img"><img src="${imgPath(p)}" alt="${p.name} — ${p.brand}"></div>
      <div class="modal-body">
        <span class="brand">${p.brand} · ${p.category}</span>
        <h2>${p.name}</h2>
        <div class="subline">${p.form} · ${p.strength}</div>
        <p class="desc">${p.desc}</p>
        <table class="spec-table">
          <tr><th>Product code</th><td>${p.sku}</td></tr>
          <tr><th>Brand</th><td>${p.brand}</td></tr>
          <tr><th>Form</th><td>${p.form}</td></tr>
          <tr><th>Strength</th><td>${p.strength}</td></tr>
          <tr><th>Pack size</th><td>${p.pack}</td></tr>
          <tr><th>Prescription</th><td>${p.rx?"Required — send its photo on WhatsApp":"Not required"}</td></tr>
          <tr><th>Availability</th><td>${stockLabel[p.stock]||"In Stock"}</td></tr>
          <tr><th>Storage</th><td>${p.storage||"Store in a cool, dry place."}</td></tr>
        </table>
        <h4>Commonly used for</h4><ul>${(p.uses||[]).map(u=>`<li>${u}</li>`).join("")}</ul>
        <div class="note-box dir"><b>How to use:</b> ${p.directions||""}</div>
        ${p.caution?`<div class="note-box warn"><b>Note:</b> ${p.caution}</div>`:""}
        ${p.rx?`<div class="note-box rx"><b>Prescription required:</b> please share a photo of your valid prescription on WhatsApp when you order this item.</div>`:""}
        <div class="qty-row">
          <div class="qty-ctrl"><button id="pmMinus" aria-label="Decrease quantity">−</button><input id="pmQty" value="1" inputmode="numeric" aria-label="Quantity"><button id="pmPlus" aria-label="Increase quantity">+</button></div>
          <button class="add-btn" id="pmAdd" style="padding:13px 18px" ${p.stock==="out"?"disabled":""}>${p.stock==="out"?"Out of Stock":"Add to Cart"}</button>
        </div>
        <button class="btn btn-wa" id="pmBuy" style="width:100%;justify-content:center">${icon("wa")} Order this item on WhatsApp</button>
        <button class="btn btn-outline" id="pmShare" style="width:100%;justify-content:center;margin-top:9px">${icon("share")} Share this product</button>
        <div id="pmRelated"></div>
        <p style="font-size:12.5px;color:var(--muted);margin-top:11px">Prices are confirmed on WhatsApp before you pay anything — no online payment needed.</p>
      </div>
    </div>`;
  m.classList.add("open"); document.body.style.overflow="hidden";
  $("#pmPlus").onclick=()=>{modalQty=Math.min(99,modalQty+1);$("#pmQty").value=modalQty};
  $("#pmMinus").onclick=()=>{modalQty=Math.max(1,modalQty-1);$("#pmQty").value=modalQty};
  $("#pmQty").onchange=e=>{modalQty=Math.max(1,Math.min(99,parseInt(e.target.value)||1));e.target.value=modalQty};
  $("#pmAdd").onclick=()=>{addToCart(modalId,modalQty);closeProduct();openCart()};
  $("#pmBuy").onclick=()=>directWhatsApp(p,modalQty);
  const sh=$("#pmShare");
  if(sh)sh.onclick=()=>{
    const text=`${p.name} (${p.pack}) — available at HB Traders Pharmacy, DI Khan. Order on WhatsApp: https://wa.me/${WA}`;
    if(navigator.share){navigator.share({title:p.name,text}).catch(()=>{})}
    else window.open("https://wa.me/?text="+encodeURIComponent(text),"_blank");
  };
  const rel=PRODUCTS.filter(x=>x.category===p.category&&x.id!==p.id).slice(0,3);
  const relBox=$("#pmRelated");
  if(relBox&&rel.length)relBox.innerHTML=`<h4 style="margin-top:18px">Customers also ask for</h4>`+rel.map(r=>`<div class="rel-row"><img src="${imgPath(r)}" alt=""><span><b>${r.name}</b><small>${r.form} · ${r.pack}</small></span><button class="mini-btn" data-view="${r.id}">View</button></div>`).join("");
}
function closeProduct(){const m=$("#productModal");if(m){m.classList.remove("open");document.body.style.overflow=""}}
const pm=$("#productModal"); if(pm)pm.addEventListener("click",e=>{if(e.target===pm||e.target.closest(".modal-close"))closeProduct()});

/* ---------- Catalog rendering ---------- */
const CAT_ICONS={"Pain Relief":"pill","Cold & Flu":"thermo","Vitamins":"leaf","Digestive":"drop","First Aid":"cross","Baby Care":"heart","Personal Care":"pump","Devices":"pulse"};
function tagHTML(p){
  if(p.rx)return `<span class="tag rx">Prescription</span>`;
  if(p.featured)return `<span class="tag feat">Featured</span>`;
  return "";
}
function cardHTML(p){
  return `<article class="card">
    <div class="thumb" data-view="${p.id}"><img src="${imgPath(p)}" alt="${p.name}" loading="lazy">${tagHTML(p)}</div>
    <div class="card-body">
      <span class="brand">${p.brand}</span>
      <h3 data-view="${p.id}">${p.name}</h3>
      <div class="meta">${p.form} · ${p.pack}</div>
      <div class="sku-row"><span>Code: ${p.sku}</span><span class="stock ${p.stock}"><i></i>${stockLabel[p.stock]||"In Stock"}</span></div>
      <div class="card-actions"><button class="add-btn" data-add="${p.id}" ${p.stock==="out"?"disabled":""}>${icon("cart")} ${p.stock==="out"?"Out of Stock":"Add to Cart"}</button><button class="wa-btn" data-buy="${p.id}" title="Order this item on WhatsApp" aria-label="Order ${p.name} on WhatsApp">${icon("wa")}</button></div>
      <a class="detail-link" href="#" data-view="${p.id}">View full details</a>
    </div></article>`;
}
function essRowHTML(p){
  return `<div class="ess-row">
    <img src="${imgPath(p)}" alt="${p.name}" data-view="${p.id}" loading="lazy">
    <div><span class="brand" style="font-size:11px;color:var(--navy);font-weight:700;letter-spacing:1px;text-transform:uppercase">${p.brand} · ${p.category}</span>
    <h3 data-view="${p.id}">${p.name}</h3><div class="meta">${p.form} · ${p.pack} · Code ${p.sku}</div></div>
    <button class="add-btn" data-add="${p.id}" ${p.stock==="out"?"disabled":""}>${icon("cart")} Add to Cart</button>
  </div>`;
}
/* Home sections */
const featGrid=$("#featuredGrid");
if(featGrid){const f=PRODUCTS.filter(p=>p.featured);featGrid.innerHTML=(f.length?f:PRODUCTS.slice(0,8)).slice(0,8).map(cardHTML).join("")}
const essList=$("#essentialsList");
if(essList){essList.innerHTML=PRODUCTS.filter(p=>!p.featured).slice(0,5).map(essRowHTML).join("")}
const catIndex=$("#catIndex");
if(catIndex){
  const order=CATEGORIES.slice(1);
  catIndex.innerHTML=order.map(c=>{
    const items=PRODUCTS.filter(p=>p.category===c);
    const forms=[...new Set(items.map(p=>p.form))].slice(0,3).join(", ");
    return `<a href="shop.html?cat=${encodeURIComponent(c)}"><span class="cic">${icon(CAT_ICONS[c]||"box")}</span><span><b>${c}</b><small>${forms}</small></span><span class="count">${items.length} products</span><span class="arr">${icon("arrow")}</span></a>`;
  }).join("");
}
/* Category bar active state + sidebar (shop) */
let activeCat="All", searchTerm="", sortBy="featured", brandFilter="All", inStockOnly=false, noRxOnly=false;
const grid=$("#productGrid");
function renderCatalog(){
  if(!grid)return;
  let list=PRODUCTS.filter(p=>
    (activeCat==="All"||p.category===activeCat)&&
    (brandFilter==="All"||p.brand===brandFilter)&&
    (!inStockOnly||p.stock!=="out")&&
    (!noRxOnly||!p.rx)&&
    (!searchTerm||(p.name+" "+p.brand+" "+p.category+" "+p.strength+" "+p.sku+" "+p.form).toLowerCase().includes(searchTerm)));
  if(sortBy==="name")list.sort((a,b)=>a.name.localeCompare(b.name));
  if(sortBy==="brand")list.sort((a,b)=>a.brand.localeCompare(b.brand));
  if(sortBy==="featured")list.sort((a,b)=>(b.featured?1:0)-(a.featured?1:0));
  grid.innerHTML=list.length?list.map(cardHTML).join(""):`<div class="empty-state" style="grid-column:1/-1"><h3>No products found</h3><p>Try a different search or category — or send us the product name on WhatsApp and we will check the shelf for you.</p><a class="btn btn-wa" href="${waLink("Hello HB Traders! I am looking for a product.")}" target="_blank" rel="noopener">${icon("wa")} Ask on WhatsApp</a></div>`;
  const rc=$("#resultCount"); if(rc)rc.textContent=`Showing ${list.length} of ${PRODUCTS.length} products`;
  $$(".side-cats a").forEach(a=>a.classList.toggle("active",a.dataset.cat===activeCat));
}
const sideCats=$("#sideCats");
if(sideCats){
  sideCats.innerHTML=CATEGORIES.map(c=>{
    const n=c==="All"?PRODUCTS.length:PRODUCTS.filter(p=>p.category===c).length;
    return `<a href="#" data-cat="${c}">${c}<span class="n">${n}</span></a>`;
  }).join("");
  sideCats.addEventListener("click",e=>{const a=e.target.closest("[data-cat]");if(!a)return;e.preventDefault();activeCat=a.dataset.cat;renderCatalog()});
}
const brandSel=$("#brandSelect");
if(brandSel){
  const brands=["All",...[...new Set(PRODUCTS.map(p=>p.brand))].sort()];
  brandSel.innerHTML=brands.map(b=>`<option ${b==="All"?"":""} value="${b}">${b==="All"?"All brands":b}</option>`).join("");
  brandSel.addEventListener("change",()=>{brandFilter=brandSel.value;renderCatalog()});
}
const stockChk=$("#inStockOnly"); if(stockChk)stockChk.addEventListener("change",()=>{inStockOnly=stockChk.checked;renderCatalog()});
const rxChk=$("#noRxOnly"); if(rxChk)rxChk.addEventListener("change",()=>{noRxOnly=rxChk.checked;renderCatalog()});
$$("[data-search]").forEach(inp=>inp.addEventListener("input",()=>{searchTerm=inp.value.trim().toLowerCase();renderCatalog()}));
const sortSel=$("#sortSelect"); if(sortSel)sortSel.addEventListener("change",()=>{sortBy=sortSel.value;renderCatalog()});
const urlCat=new URLSearchParams(location.search).get("cat");
if(urlCat&&CATEGORIES.includes(urlCat))activeCat=urlCat;
const urlQ=new URLSearchParams(location.search).get("q");
if(urlQ){searchTerm=urlQ.toLowerCase();$$("[data-search]").forEach(x=>x.value=urlQ)}
renderCatalog();
$$("form[data-search-form]").forEach(f=>f.addEventListener("submit",e=>{
  e.preventDefault(); const q=f.querySelector("input").value.trim();
  if(grid){searchTerm=q.toLowerCase();renderCatalog();grid.scrollIntoView({behavior:"smooth",block:"start"})}
  else location.href=(document.body.dataset.root||"")+"shop.html?q="+encodeURIComponent(q);
}));

/* ---------- Mobile nav / reveal ---------- */
const burger=$("#burger"), mnav=$("#mobileNav");
if(burger)burger.addEventListener("click",()=>mnav.classList.toggle("open"));
if(mnav)mnav.addEventListener("click",e=>{if(e.target.tagName==="A")mnav.classList.remove("open")});
const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add("in");io.unobserve(en.target)}}),{threshold:.08});
$$(".reveal").forEach(el=>io.observe(el));

/* ---------- Homepage extras: prescription order, health tools, reorder, recent ---------- */
const rxForm=$("#rxForm");
if(rxForm){
  const fileInp=$("#rxFile"), prev=$("#rxPreview");
  fileInp.addEventListener("change",()=>{
    const f=fileInp.files[0]; if(!f){prev.style.display="none";return}
    const r=new FileReader(); r.onload=()=>{prev.src=r.result;prev.style.display="block"}; r.readAsDataURL(f);
  });
  rxForm.addEventListener("submit",e=>{
    e.preventDefault();
    const name=$("#rxName").value.trim(), phone=$("#rxPhone").value.trim(), err=$("#rxError");
    if(name.length<3||phone.length<10){err.textContent="Please add your name and a valid WhatsApp number so we can prepare your prescription order.";err.style.display="block";return}
    err.style.display="none";
    const msg=`Hello HB Traders! I want to order medicines against my prescription.\n\nName: ${name}\nPhone: ${phone}\n\nI am attaching my prescription photo in this chat. Please prepare the medicines and confirm the total price and delivery charges. Thank you!`;
    window.open(waLink(msg),"_blank");
  });
}
const bmiBtn=$("#bmiBtn");
if(bmiBtn)bmiBtn.addEventListener("click",()=>{
  const h=parseFloat($("#bmiH").value), w=parseFloat($("#bmiW").value), box=$("#bmiResult");
  if(!h||!w||h<80||h>250||w<15||w>400){box.style.display="block";box.innerHTML="Please enter a realistic height (cm) and weight (kg).";return}
  const bmi=w/Math.pow(h/100,2), r=bmi.toFixed(1);
  const cat=bmi<18.5?"Underweight":bmi<25?"Healthy range":bmi<30?"Overweight":"Obese range";
  const tip=bmi<18.5?"Consider a nutrition check — ask us about supplements at the counter.":bmi<25?"Keep it up — a balanced diet and daily walk maintain this well.":"Small daily changes help most: a 30-minute walk and fewer sugary drinks.";
  box.style.display="block"; box.innerHTML=`<b>Your BMI is ${r}</b> — ${cat}.<br>${tip}`;
});
const waterBtn=$("#waterBtn");
if(waterBtn)waterBtn.addEventListener("click",()=>{
  const w=parseFloat($("#waterW").value), box=$("#waterResult");
  if(!w||w<15||w>300){box.style.display="block";box.innerHTML="Please enter your weight in kg.";return}
  const ml=Math.round(w*35), glasses=(ml/250).toFixed(1);
  box.style.display="block"; box.innerHTML=`<b>About ${(ml/1000).toFixed(1)} litres a day</b> — roughly ${glasses} glasses (250ml). Spread it through the day instead of drinking a lot at once.`;
});
const lastSec=$("#lastOrderSection"), lastBox=$("#lastOrderBox");
if(lastSec&&lastBox){
  const orders=hbOrders();
  if(orders.length&&orders[0].items&&orders[0].items.length){
    const o=orders[0], d=new Date(o.ts);
    lastBox.innerHTML=`<div class="lo-head"><b>${o.items.reduce((a,i)=>a+i.qty,0)} items</b><span>Ordered ${d.toLocaleDateString("en-PK",{day:"numeric",month:"short"})} · ${o.name}</span></div>`+
      o.items.map(i=>`<div class="lo-row"><span>${i.name} <small>(${i.pack})</small></span><b>× ${i.qty}</b></div>`).join("")+
      `<button class="btn btn-green" id="reorderBtn" type="button">${icon("cart")} Reorder these items</button>`;
    lastSec.style.display="block";
    $("#reorderBtn").addEventListener("click",()=>{
      let added=0;
      o.items.forEach(i=>{const p=PRODUCTS.find(x=>x.slug===i.slug); if(p&&p.stock!=="out"){cart[p.id]=(cart[p.id]||0)+i.qty; added++}});
      if(added){saveCart();updateCartUI();openCart();toast("<b>Last order added to your cart.</b> Review it and send on WhatsApp.")}
      else toast("Those items are out of stock right now — please ask us on WhatsApp.");
    });
  }
}
const recSec=$("#recentSection"), recRail=$("#recentRail");
if(recSec&&recRail){
  let slugs=[]; try{slugs=JSON.parse(localStorage.getItem("hb_recent_v1")||"[]")}catch(e){}
  const items=slugs.map(sl=>PRODUCTS.find(p=>p.slug===sl)).filter(Boolean);
  if(items.length){recRail.innerHTML=items.map(cardHTML).join("");recSec.style.display="block"}
}

updateCartUI();
})();
