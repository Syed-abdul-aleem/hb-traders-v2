/* HB Traders — admin panel (static, localStorage-based).
   CHANGE THE PASSWORD BELOW before real use. This is a front-end demo lock:
   it keeps casual visitors out, it is not server security. */
const ADMIN_PASSWORD = "AleemShah@1122";
(function(){
"use strict";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const CAT_KEY="hb_catalog_v2", SET_KEY="hb_settings_v2";
let catalog = hbCatalog().map(p=>Object.assign({},p));
let settings = hbSettings();
const saveCatalog=()=>localStorage.setItem(CAT_KEY, JSON.stringify(catalog));
const imgPath=p=>p.img || ("assets/images/products/"+p.slug+".webp");
function toast(msg){const t=$("#toast");t.innerHTML=msg;t.classList.add("show");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("show"),2800)}

/* ---------- Auth ---------- */
const authed=()=>sessionStorage.getItem("hb_admin_ok")==="1";
function showView(){
  $("#loginView").style.display=authed()?"none":"block";
  $("#panelView").style.display=authed()?"block":"none";
  if(authed())renderAll();
}
$("#loginForm").addEventListener("submit",e=>{
  e.preventDefault();
  if($("#adminPass").value===ADMIN_PASSWORD){sessionStorage.setItem("hb_admin_ok","1");$("#loginError").style.display="none";showView();toast("<b>Signed in.</b> Welcome to the HB Traders admin.")}
  else{$("#loginError").style.display="block"}
});
$("#logoutBtn").addEventListener("click",()=>{sessionStorage.removeItem("hb_admin_ok");showView()});

/* ---------- Stats + table ---------- */
const stockPill={in:'<span class="pill">In Stock</span>',low:'<span class="pill low">Low Stock</span>',out:'<span class="pill out">Out of Stock</span>'};
function renderAll(){
  $("#statTotal").textContent=catalog.length;
  $("#statCats").textContent=new Set(catalog.map(p=>p.category)).size;
  $("#statRx").textContent=catalog.filter(p=>p.rx).length;
  $("#statOut").textContent=catalog.filter(p=>p.stock==="out").length;
  $("#statLow").textContent=catalog.filter(p=>p.stock==="low").length;
  $("#statOrders").textContent=hbOrders().length;
  renderTable();
  renderAlerts();
  renderOrders();
  fillSettings();
}
let catFilter="All";
const catFilterSel=$("#adminCatFilter");
if(catFilterSel){catFilterSel.innerHTML=["All",...CATEGORIES.slice(1)].map(c=>`<option value="${c}">${c==="All"?"All categories":c}</option>`).join("");catFilterSel.addEventListener("change",()=>{catFilter=catFilterSel.value;renderTable()})}
const selected=new Set();
function updateSelCount(){$("#selCount").textContent=selected.size+" selected"}
function renderTable(){
  const q=($("#adminSearch").value||"").toLowerCase();
  const rows=catalog.filter(p=>(catFilter==="All"||p.category===catFilter)&&(!q||(p.name+" "+p.brand+" "+p.sku+" "+p.category).toLowerCase().includes(q)));
  $("#adminTableBody").innerHTML=rows.length?rows.map(p=>`<tr>
    <td><input type="checkbox" data-check="${p.id}" ${selected.has(p.id)?"checked":""} aria-label="Select ${p.name}"></td>
    <td><img src="${imgPath(p)}" alt="" onerror="this.style.opacity=.25"></td>
    <td><b>${p.name}</b><br><span style="color:var(--muted);font-size:12px">${p.brand} · ${p.sku} · ${p.pack||""}</span></td>
    <td>${p.category}</td>
    <td><button class="pill-btn" data-stock="${p.id}" title="Click to change stock status">${stockPill[p.stock]||stockPill.in}</button></td>
    <td>${p.rx?'<span class="pill rx">Rx</span>':"—"}</td>
    <td>${p.featured?"Yes":"—"}</td>
    <td style="white-space:nowrap"><button class="mini-btn" data-edit="${p.id}">Edit</button> <button class="mini-btn danger" data-del="${p.id}">Delete</button></td>
  </tr>`).join(""):`<tr><td colspan="8" style="color:var(--muted)">No products match your search.</td></tr>`;
  updateSelCount();
}
$("#adminSearch").addEventListener("input",renderTable);
$("#adminTableBody").addEventListener("change",e=>{
  const c=e.target.closest("[data-check]"); if(!c)return;
  if(c.checked)selected.add(+c.dataset.check); else selected.delete(+c.dataset.check);
  updateSelCount();
});
$("#checkAll").addEventListener("change",e=>{
  $$("#adminTableBody [data-check]").forEach(c=>{c.checked=e.target.checked; if(e.target.checked)selected.add(+c.dataset.check); else selected.delete(+c.dataset.check)});
  updateSelCount();
});
function bulkSetStock(st){
  if(!selected.size){toast("Tick at least one product first.");return}
  catalog.forEach(p=>{if(selected.has(p.id))p.stock=st});
  saveCatalog(); renderAll(); toast(`<b>${selected.size} products</b> updated.`);
}
$("#bulkIn").addEventListener("click",()=>bulkSetStock("in"));
$("#bulkLow").addEventListener("click",()=>bulkSetStock("low"));
$("#bulkOut").addEventListener("click",()=>bulkSetStock("out"));
$("#bulkDel").addEventListener("click",()=>{
  if(!selected.size){toast("Tick at least one product first.");return}
  if(confirm(`Delete ${selected.size} selected products? This can be undone only by Reset or Import.`)){
    catalog=catalog.filter(p=>!selected.has(p.id)); selected.clear(); saveCatalog(); renderAll(); toast("<b>Selected products deleted.</b>");
  }
});
$("#adminTableBody").addEventListener("click",e=>{
  const st=e.target.closest("[data-stock]");
  if(st){
    const p=catalog.find(x=>x.id==st.dataset.stock); if(!p)return;
    p.stock=p.stock==="in"?"low":p.stock==="low"?"out":"in";
    saveCatalog(); renderAll(); toast(`<b>${p.name}</b> is now ${{in:"In Stock",low:"Low Stock",out:"Out of Stock"}[p.stock]}.`);
    return;
  }
  const ed=e.target.closest("[data-edit]"), del=e.target.closest("[data-del]");
  if(ed)openEdit(+ed.dataset.edit);
  if(del){
    const p=catalog.find(x=>x.id==del.dataset.del);
    if(p&&confirm(`Delete "${p.name}" from the catalog? This can be undone only by Reset or Import.`)){
      catalog=catalog.filter(x=>x.id!=del.dataset.del); saveCatalog(); renderAll(); toast(`<b>Deleted:</b> ${p.name}`);
    }
  }
});

/* ---------- Stock alerts + orders inbox ---------- */
function renderAlerts(){
  const list=catalog.filter(p=>p.stock!=="in");
  $("#alertsList").innerHTML=list.length?list.map(p=>`<div class="alert-row"><span>${stockPill[p.stock]} <b>${p.name}</b> <span style="color:var(--muted)">${p.sku} · ${p.pack||""}</span></span><span><button class="mini-btn" data-restock="${p.id}">Mark In Stock</button> <button class="mini-btn" data-edit="${p.id}">Edit</button></span></div>`).join(""):`<p style="color:var(--muted);font-size:14px">All products are in stock — nothing to reorder right now.</p>`;
}
$("#alertsList").addEventListener("click",e=>{
  const rs=e.target.closest("[data-restock]"), ed=e.target.closest("[data-edit]");
  if(rs){const p=catalog.find(x=>x.id==rs.dataset.restock); if(p){p.stock="in"; saveCatalog(); renderAll(); toast(`<b>${p.name}</b> marked In Stock.`)}}
  if(ed)openEdit(+ed.dataset.edit);
});
function renderOrders(){
  const orders=hbOrders();
  $("#ordersList").innerHTML=orders.length?orders.map((o,i)=>{
    const d=new Date(o.ts);
    return `<div class="order-row"><div class="or-main"><b>${o.name||"Customer"}</b> <span style="color:var(--muted)">${o.phone||""} · ${d.toLocaleDateString("en-PK",{day:"numeric",month:"short"})} ${d.toLocaleTimeString("en-PK",{hour:"numeric",minute:"2-digit"})}</span><br><span style="font-size:13px">${(o.items||[]).map(it=>`${it.name} × ${it.qty}`).join(", ")}</span></div><select data-order-status="${i}" aria-label="Order status"><option ${o.status==="New"?"selected":""}>New</option><option ${o.status==="Preparing"?"selected":""}>Preparing</option><option ${o.status==="Done"?"selected":""}>Done</option></select> <button class="mini-btn danger" data-order-del="${i}">Delete</button></div>`;
  }).join(""):`<p style="color:var(--muted);font-size:14px">No orders yet from this device. When you test an order on the storefront from this browser, it will appear here.</p>`;
}
$("#ordersList").addEventListener("change",e=>{
  const sel=e.target.closest("[data-order-status]"); if(!sel)return;
  const orders=hbOrders(); if(orders[+sel.dataset.orderStatus]){orders[+sel.dataset.orderStatus].status=sel.value; hbSetOrders(orders); toast("Order status updated.")}
});
$("#ordersList").addEventListener("click",e=>{
  const del=e.target.closest("[data-order-del]"); if(!del)return;
  const orders=hbOrders(); orders.splice(+del.dataset.orderDel,1); hbSetOrders(orders); renderAll(); toast("Order removed from the list.");
});

/* ---------- Product form ---------- */
const catSel=$("#fCategory");
catSel.innerHTML=CATEGORIES.slice(1).map(c=>`<option value="${c}">${c}</option>`).join("");
function slugify(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)}
function openEdit(id){
  const p=id?catalog.find(x=>x.id===id):null;
  $("#editCard").style.display="block";
  $("#editTitle").textContent=p?`Edit product — ${p.name}`:"Add a new product";
  $("#fId").value=p?p.id:"";
  $("#fName").value=p?p.name:""; $("#fBrand").value=p?p.brand:"";
  $("#fCategory").value=p?p.category:"Pain Relief";
  $("#fForm").value=p?p.form:""; $("#fStrength").value=p?p.strength:"";
  $("#fPack").value=p?p.pack:""; $("#fSku").value=p?p.sku:"";
  $("#fStock").value=p?p.stock:"in"; $("#fDesc").value=p?p.desc:"";
  $("#fUses").value=p?(p.uses||[]).join("\n"):"";
  $("#fDirections").value=p?p.directions:""; $("#fStorage").value=p?p.storage:"";
  $("#fCaution").value=p?p.caution:""; $("#fRx").checked=p?!!p.rx:false;
  $("#fFeatured").checked=p?!!p.featured:false; $("#fImg").value=p?(p.img||""):"";
  $("#fImageFile").value="";
  $("#editCard").scrollIntoView({behavior:"smooth"});
}
$("#addProductBtn").addEventListener("click",()=>openEdit(null));
$("#cancelEditBtn").addEventListener("click",()=>{$("#editCard").style.display="none"});
$("#fImageFile").addEventListener("change",e=>{
  const f=e.target.files[0]; if(!f)return;
  if(f.size>900*1024){alert("Please choose an image under 900 KB — larger files will not save in the browser.");e.target.value="";return}
  const r=new FileReader(); r.onload=()=>{$("#fImg").value=r.result;toast("Image attached — it will be saved with the product.")}; r.readAsDataURL(f);
});
$("#productForm").addEventListener("submit",e=>{
  e.preventDefault();
  const id=$("#fId").value?+$("#fId").value:null;
  const name=$("#fName").value.trim(), brand=$("#fBrand").value.trim();
  if(!name||!brand)return;
  const existing=id?catalog.find(x=>x.id===id):null;
  const slug=existing?existing.slug:(slugify(name)||("product-"+Date.now()));
  let sku=$("#fSku").value.trim();
  if(!sku){let n=catalog.length+1; sku="HB-"+String(n).padStart(3,"0"); while(catalog.some(p=>p.sku===sku)){n++; sku="HB-"+String(n).padStart(3,"0")}}
  const data={
    id: id||(catalog.length?Math.max(...catalog.map(p=>p.id))+1:1),
    sku, slug, name, brand,
    category:$("#fCategory").value, form:$("#fForm").value.trim(),
    strength:$("#fStrength").value.trim(), pack:$("#fPack").value.trim(),
    stock:$("#fStock").value, rx:$("#fRx").checked, featured:$("#fFeatured").checked,
    img:$("#fImg").value||undefined,
    desc:$("#fDesc").value.trim(),
    uses:$("#fUses").value.split("\n").map(s=>s.trim()).filter(Boolean),
    directions:$("#fDirections").value.trim(), storage:$("#fStorage").value.trim(), caution:$("#fCaution").value.trim()
  };
  if(existing){catalog=catalog.map(p=>p.id===id?data:p); toast(`<b>Saved:</b> ${name} updated.`)}
  else{catalog.push(data); toast(`<b>Added:</b> ${name} is now in the catalog.`)}
  saveCatalog(); renderAll(); $("#editCard").style.display="none";
});

/* ---------- Settings ---------- */
function fillSettings(){
  $("#sWhatsapp").value=settings.whatsapp||""; $("#sPhone").value=settings.phoneDisplay||"";
  $("#sAddress").value=settings.address||""; $("#sFacebook").value=settings.facebook||"";
  $("#sInstagram").value=settings.instagram||""; $("#sTiktok").value=settings.tiktok||"";
  $("#sSite").value=settings.site||"";
  $("#sOpenTime").value=settings.openTime||"09:00"; $("#sCloseTime").value=settings.closeTime||"21:00";
  $("#sAccent").value=settings.accent||"green";
  $("#sAnnounce").value=settings.announcement||""; $("#sAnnounceOn").checked=!!settings.announcementOn;
}
$("#settingsForm").addEventListener("submit",e=>{
  e.preventDefault();
  settings={
    whatsapp:$("#sWhatsapp").value.replace(/\D/g,""), phoneDisplay:$("#sPhone").value.trim(),
    address:$("#sAddress").value.trim(), facebook:$("#sFacebook").value.trim(),
    instagram:$("#sInstagram").value.trim(), tiktok:$("#sTiktok").value.trim(), site:$("#sSite").value.trim(),
    openTime:$("#sOpenTime").value||"09:00", closeTime:$("#sCloseTime").value||"21:00",
    accent:$("#sAccent").value, announcement:$("#sAnnounce").value.trim(), announcementOn:$("#sAnnounceOn").checked,
    storeName:settings.storeName, tagline:settings.tagline
  };
  localStorage.setItem(SET_KEY, JSON.stringify(settings));
  toast("<b>Settings saved.</b> Order buttons now use the updated details.");
});

/* ---------- Data tools ---------- */
$("#exportBtn").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify({products:catalog,settings},null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="hb-traders-catalog.json"; a.click();
  URL.revokeObjectURL(a.href);
  $("#dataMsg").textContent="Catalog exported — keep this file as your backup.";
});
$("#importFile").addEventListener("change",e=>{
  const f=e.target.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const parsed=JSON.parse(r.result);
      const arr=Array.isArray(parsed)?parsed:parsed.products;
      if(!Array.isArray(arr)||!arr.length||!arr[0].name)throw new Error("format");
      catalog=arr; saveCatalog();
      if(!Array.isArray(parsed)&&parsed.settings){settings=Object.assign({},hbSettings(),parsed.settings); localStorage.setItem(SET_KEY, JSON.stringify(settings))}
      renderAll();
      $("#dataMsg").textContent=`Imported ${arr.length} products successfully.`;
      toast("<b>Import complete:</b> catalog updated.");
    }catch(err){$("#dataMsg").textContent="Import failed — that file is not a valid HB Traders catalog JSON."}
  };
  r.readAsText(f); e.target.value="";
});
$("#resetBtn").addEventListener("click",()=>{
  if(confirm("Reset the catalog to the original 30 demo products? All admin changes in this browser will be removed.")){
    localStorage.removeItem(CAT_KEY);
    catalog=DEFAULT_PRODUCTS.map(p=>Object.assign({},p));
    renderAll(); toast("Catalog reset to the original demo products.");
  }
});

showView();
})();
