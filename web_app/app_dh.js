// ====================== BẮT ĐẦU: app_dh.js ======================
// (Nguyên văn từ <script> cuối trang) — BẢN HOÀN THIỆN (KHÔNG ẢNH)

let deferredPrompt=null; const installBtn=document.getElementById('installBtn');
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;installBtn.style.display='inline-flex';});
installBtn?.addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installBtn.style.display='none';});

/* ===== Supabase (DB/Auth) ===== */
const confNV=(window.getConfig?window.getConfig('index'):window.COD_BASE)||{};
if(!confNV?.url||!confNV?.key){alert('Thiếu cấu hình Supabase');throw new Error('Missing config');}
const supa=window.supabase.createClient(confNV.url,confNV.key);

/* ===== Cấu hình động từ cod_config.js ===== */
const CFG=(window.COD_CONFIG?window.COD_CONFIG:(window.getConfig?window.getConfig('cod'):window.COD_BASE));
const KEY_VD     = CFG.keyColVD   || CFG.keyCol   || 'ma_vd';
const KEY_DON_HD = CFG.keyColHD   || 'ma_hd';
const KEY_KH     = CFG.keyColKH   || 'ma_kh';
const DATE_COL   = CFG.dateCol    || 'ngay_chuan_bi_don';
const TABLE_VD_KIOT = CFG.tableVD || (CFG.table && CFG.table.vd) || 'don_hang_kiot_cod';
const TABLE_DON     = CFG.tableHD || (CFG.table && CFG.table.hd) || 'don_hang';
const TABLE_CT      = CFG.tableCT || (CFG.table && CFG.table.ct) || 'don_hang_chitiet';

/* Webhook */
const WEBHOOK_URL  = CFG.webhookUrl || 'https://dhsybbqoe.datadex.vn/webhook/hoadon';

/* ===== Helpers ===== */
const $=s=>document.querySelector(s);
const toast=$('#toast');
function showToast(t,ms=2000){toast.textContent=t;toast.style.display='block';clearTimeout(showToast._t);showToast._t=setTimeout(()=>toast.style.display='none',ms);}
const fmtMoney=n=>(Number(n||0)).toLocaleString('vi-VN');

/* ===== Timezone VN ===== */
const TZ = 'Asia/Ho_Chi_Minh';
function nowVNISO(){
  const dt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).formatToParts(new Date());
  const p = Object.fromEntries(dt.map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+07:00`;
}
function fmtDateVN(input){
  if(!input) return '';
  const d = new Date(input);
  const f = new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:false });
  return f.format(d).replace(',', '');
}

/* ===== Supabase REST helpers ===== */
async function sbSelect(table, filterObj, selectCols='*'){
  const qs=new URLSearchParams({select:selectCols, ...filterObj}).toString();
  const res=await fetch(`${CFG.url}/rest/v1/${table}?${qs}`,{headers:{apikey:CFG.key,Authorization:`Bearer ${CFG.key}`}});
  if(!res.ok)throw new Error(await res.text()); return res.json();
}
async function sbPatch(table, filterObj, bodyObj){
  const qs=new URLSearchParams(filterObj).toString();
  const res=await fetch(`${CFG.url}/rest/v1/${table}?${qs}`,{method:'PATCH',headers:{apikey:CFG.key,Authorization:`Bearer ${CFG.key}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(bodyObj)});
  if(!res.ok)throw new Error(await res.text()); return res.json();
}
async function sbPost(table, body){
  const res=await fetch(`${CFG.url}/rest/v1/${table}`,{method:'POST',headers:{apikey:CFG.key,Authorization:`Bearer ${CFG.key}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(body)});
  if(!res.ok)throw new Error(await res.text()); return res.json();
}

/* ===== Lấy mã khách theo mã hóa đơn ===== */
async function getMaKhByMaHd(ma_hd){
  try {
    const rows = await sbSelect(TABLE_DON, { [KEY_DON_HD]: `eq.${ma_hd}`, limit: 1 }, KEY_KH);
    return rows?.[0]?.[KEY_KH] ?? null;
  } catch(e) {
    console.warn('Không lấy được mã khách:', e);
    return null;
  }
}

/* ===== Link bản đồ ===== */
function buildMapLinks(coords){
  if(!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number'){
    return { map_url: null, map_url_apple: null, geo_url: null };
  }
  const lat = +coords.latitude;
  const lng = +coords.longitude;
  const q   = encodeURIComponent(`${lat},${lng}`);
  return {
    map_url: `https://www.google.com/maps/search/?api=1&query=${q}`,
    map_url_apple: `https://maps.apple.com/?ll=${q}`,
    geo_url: `geo:${lat},${lng}?q=${q}`
  };
}

/* ===== fetchWithTimeout ===== */
async function fetchWithTimeout(input, init={}, ms=30000){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), ms);
  try { return await fetch(input, { ...init, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

/* ===== Gửi webhook (CHỈ VỊ TRÍ) ===== */
async function postDeliverPayload(ma_hd, coords){
  const ma_khach = await getMaKhByMaHd(ma_hd);
  const mapLinks = buildMapLinks(coords);
  const payload={
    action:'giaohangthanhcong',
    ma_hd,
    ma_khach,
    time: nowVNISO(),
    lat:coords?.latitude??null,
    lng:coords?.longitude??null,
    accuracy:coords?.accuracy??null,
    map_url: mapLinks.map_url,
    map_url_apple: mapLinks.map_url_apple
  };
  await fetch(WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
}

/* ===== Session (ĐĂNG NHẬP) ===== */
function saveCase(i){localStorage.setItem('nv',JSON.stringify(i));}
function loadCase(){try{return JSON.parse(localStorage.getItem('nv'))}catch{return null}}
function clearCase(){localStorage.removeItem('nv');}
const loginSec=$('#login'),appSec=$('#app'),loginMsg=$('#loginMsg'),whoEl=$('#who');
async function doLogin(){
  loginMsg.textContent='';
  const ma=$('#ma_nv').value.trim(),mk=$('#mat_khau').value;
  if(!ma||!mk){loginMsg.textContent='Vui lòng nhập đủ thông tin';return;}
  const btn=$('#btnLogin');btn.disabled=true;btn.textContent='Đang kiểm tra...';
  try{
    const {data,error}=await supa.from(confNV.table||'kv_nhan_vien').select('ma_nv,ten_nv').eq('ma_nv',ma).eq('mat_khau',mk).maybeSingle();
    if(error||!data){loginMsg.textContent='Sai mã nhân viên hoặc mật khẩu';return;}
    saveCase(data);loginSec.style.display='none';appSec.style.display='block';whoEl.textContent=data.ten_nv||'Nhân viên';
  }catch(e){loginMsg.textContent='Lỗi: '+e.message;}
  finally{btn.disabled=false;btn.textContent='Đăng nhập';}
}
(function(){const u=loadCase();if(u?.ma_nv){loginSec.style.display='none';appSec.style.display='block';whoEl.textContent=u.ten_nv||'Nhân viên';}})();
$('#btnLogin').onclick=doLogin;$('#mat_khau').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
const userBtn=$('#userBtn'), userMenu=$('#userMenu');
userBtn?.addEventListener('click',()=>userMenu.style.display=userMenu.style.display==='block'?'none':'block');
document.addEventListener('click',e=>{if(!userBtn?.contains(e.target)&&!userMenu?.contains(e.target))userMenu&&(userMenu.style.display='none');});
$('#logout')?.addEventListener('click',()=>{clearCase();location.reload();});

/* ===== Camera (auto-off 60s) ===== */
const video=$('#preview'), startBtn=$('#startBtn'), refreshBtn=$('#refreshBtn'), camCard=$('#camCard'), info=$('#info'), beep=$('#beep');
const hints=new Map();hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS,[ZXing.BarcodeFormat.CODE_128,ZXing.BarcodeFormat.EAN_13,ZXing.BarcodeFormat.EAN_8,ZXing.BarcodeFormat.QR_CODE]);
const reader=new ZXing.BrowserMultiFormatReader(hints);
let currentStream=null,currentDeviceId=null,last='',scanLock=false,noScanTimer=null;
function vibrate(p){try{navigator.vibrate?p=navigator.vibrate(p):camCard.classList.add('flash'),setTimeout(()=>camCard.classList.remove('flash'),400);}catch{camCard.classList.add('flash');setTimeout(()=>camCard.classList.remove('flash'),400);}}
function setInfo(type,t){info.className='info-bar'; if(type==='ok')info.classList.add('info-ok'); else if(type==='err')info.classList.add('info-err'); info.textContent=t||'';}
function startNoScanTimer(){clearTimeout(noScanTimer); noScanTimer=setTimeout(()=>{sleepCamera(); showToast('⏸ Tự tắt camera sau 60s không quét mã');},60000);}
async function ensureCamera(){ if(currentStream) return currentStream; currentStream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:720},height:{ideal:720},facingMode:{ideal:'environment'}},audio:false}); try{localStorage.setItem('cam_ok','1');}catch{} return currentStream; }
async function startReader(stream){
  video.srcObject = stream;
  video.setAttribute('playsinline','');
  video.muted = true;
  try { await video.play(); } catch {}
  const t = stream.getVideoTracks();
  const s = t[0]?.getSettings?.() || {};
  currentDeviceId = s.deviceId || null;
  await reader.decodeFromVideoDevice(currentDeviceId || null, video, onScan);
  setInfo('', 'Đang quét...');
  startNoScanTimer();
}
function sleepCamera(){try{reader.reset();}catch{} try{video.srcObject&&video.srcObject.getTracks().forEach(t=>t.stop());}catch{} currentStream=null; startBtn&&(startBtn.disabled=false); setInfo('', '⏸ Camera đã tắt do không có mã trong 60s.');}
startBtn?.addEventListener('click',async()=>{
  try{await beep.play();beep.pause();beep.currentTime=0;}catch{}
  startBtn.disabled=true;
  try{const s=await ensureCamera(); currentStream=s; await startReader(s);}catch(e){setInfo('err','Không mở được camera: '+(e.message||'Không rõ')); startBtn.disabled=false;}
});
refreshBtn?.addEventListener('click',async()=>{sleepCamera(); startBtn?.click();});

// ✅ CHỈ AUTO-START CAMERA KHI ĐÃ VÀO APP
(function(){
  const isIOS=/iP(hone|ad|od)/i.test(navigator.userAgent);
  const appVisible = document.getElementById('app')?.style.display === 'block';
  if(localStorage.getItem('cam_ok')==='1' && !isIOS && appVisible){ startBtn?.click(); }
})();

/* —— Chặn quét trùng 2 phút —— */
const SCAN_BLOCK_MS=120000, recentScans=new Map();
const isBlocked=c=>{const t=recentScans.get(c);return t&&(Date.now()-t<SCAN_BLOCK_MS);}
const markScanned=c=>recentScans.set(c,Date.now());
setInterval(()=>{const now=Date.now();for(const[k,v]of recentScans.entries())if(now-v>SCAN_BLOCK_MS)recentScans.delete(k);},30000);

/* ===== GEO Bottom Sheet (mobile-ready: fixed overlay, lock scroll) ===== */
let geoWrap    = document.getElementById('geoWrap');
let geoSheet   = document.getElementById('geoSheet');
let geoSendBtn = document.getElementById('geoSend');
let geoCloseBtn2 = document.getElementById('geoClose2');
let geoMsg2    = document.getElementById('geoMsg2');
let pendingDeliver=null, geoState='needEnable', geoCoordsCache=null;
let geoInited = false;

function initGeoSheet(){
  if (geoInited) return;
  if (!geoWrap || !geoSheet) { console.warn('Thiếu markup GEO Bottom Sheet (#geoWrap/#geoSheet).'); return; }

  // Overlay full màn hình (style chính đặt ở CSS; dưới đây là fallback)
  Object.assign(geoWrap.style, {
    position: geoWrap.style.position || 'fixed',
    left: geoWrap.style.left || '0',
    right: geoWrap.style.right || '0',
    top: geoWrap.style.top || '0',
    bottom: geoWrap.style.bottom || '0',
    display: 'none',
    pointerEvents: 'none',
    zIndex: geoWrap.style.zIndex || '9999'
  });

  // Sheet bám đáy, trượt bằng transform (hình dạng chủ yếu do CSS)
  Object.assign(geoSheet.style, {
    position: geoSheet.style.position || 'fixed',
    left: geoSheet.style.left || '0',
    right: geoSheet.style.right || '0',
    bottom: geoSheet.style.bottom || '0',
    willChange: 'transform',
    transition: 'transform .22s ease',
    transform: 'translateY(100%)'
  });

  attachSwipe(geoWrap, geoSheet);
  geoCloseBtn2?.addEventListener('click', hideGeoPrompt);
  geoWrap.addEventListener('click', e => { if (e.target === geoWrap) hideGeoPrompt(); });
  geoSendBtn?.addEventListener('click', onGeoSendClick);
  geoSendBtn?.setAttribute('type','button');

  geoInited = true;
}
function openGeoSheet(){
  // Khóa cuộn nền
  const prevHtmlOverflow = document.documentElement.style.overflow;
  const prevBodyOverflow = document.body.style.overflow;
  geoWrap.dataset.__prevHtmlOverflow = prevHtmlOverflow || '';
  geoWrap.dataset.__prevBodyOverflow = prevBodyOverflow || '';
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  // Mở overlay
  geoWrap.style.display = 'block';
  geoWrap.style.pointerEvents = 'auto';

  // Reset trạng thái sheet & ép reflow
  geoSheet.style.transition = 'none';
  geoSheet.style.transform  = 'translateY(100%)';
  void geoSheet.offsetHeight;

  // Double rAF để đảm bảo Safari/iOS không bỏ frame đầu
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      geoSheet.style.transition = 'transform .22s ease';
      geoSheet.style.transform  = 'translateY(0)';
      geoSheet.scrollTop = 0;
      geoSheet.focus?.();
    });
  });
}
function closeGeoSheet(){
  geoSheet.style.transition = 'transform .22s ease';
  geoSheet.style.transform  = 'translateY(100%)';
  geoWrap.style.pointerEvents = 'none';

  setTimeout(()=>{
    geoWrap.style.display='none';
    // Mở lại cuộn nền
    document.documentElement.style.overflow = geoWrap.dataset.__prevHtmlOverflow || '';
    document.body.style.overflow = geoWrap.dataset.__prevBodyOverflow || '';
    delete geoWrap.dataset.__prevHtmlOverflow;
    delete geoWrap.dataset.__prevBodyOverflow;
  }, 240);
}
function showGeoPrompt(p){
  if (!geoInited) initGeoSheet();
  pendingDeliver=p; geoState='needEnable'; geoCoordsCache=null;

  if (geoSendBtn) { geoSendBtn.disabled=false; geoSendBtn.textContent='📍 Gửi vị trí'; }
  if (geoMsg2) geoMsg2.innerHTML='Đã cập nhật <b>Giao thành công</b>. Bấm <b>Gửi vị trí</b> để gửi toạ độ và link bản đồ.';

  openGeoSheet();
}
function hideGeoPrompt(){
  closeGeoSheet();
  pendingDeliver=null; geoCoordsCache=null; geoState='needEnable';
}
// Khởi tạo sớm để có trạng thái "đóng" đúng
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGeoSheet);
} else {
  initGeoSheet();
}

/* ===== Lấy GPS 1 lần ===== */
async function getGPSOnce(){
  try{
    if(localStorage.getItem('geo_ok')==='1'){
      return new Promise(res=>{
        navigator.geolocation.getCurrentPosition(p=>res(p.coords), _=>res(null), {enableHighAccuracy:true,timeout:12000,maximumAge:0});
      });
    }
    try{ const st=await navigator.permissions?.query?.({name:'geolocation'}); if(st && st.state==='denied') return null; }catch{}
    return new Promise(res=>{
      navigator.geolocation.getCurrentPosition(
        p=>{ try{localStorage.setItem('geo_ok','1')}catch{}; res(p.coords); },
        _=>res(null),
        {enableHighAccuracy:true,timeout:12000,maximumAge:0}
      );
    });
  }catch{return null;}
}

/* ===== Nút Gửi vị trí: GPS → WEBHOOK (KHÔNG ẢNH) ===== */
let geoBusy=false;
async function onGeoSendClick(){
  if(!pendingDeliver || geoBusy) return;
  geoBusy=true;
  const { ma_hd } = pendingDeliver;

  geoSendBtn.disabled = true; 
  geoSendBtn.textContent = 'Đang lấy vị trí...';

  try{
    const coords = await getGPSOnce();
    if(!coords){
      geoMsg2.innerHTML = 'Không lấy được vị trí. Hãy cho phép định vị rồi bấm lại.';
      return;
    }
    geoSendBtn.textContent = 'Đang gửi...';
    await postDeliverPayload(ma_hd, coords);
    showToast('📍 Đã gửi vị trí & link bản đồ');
    hideGeoPrompt();
  }catch(e){
    geoMsg2.textContent = '⚠️ Gửi thất bại: ' + (e?.message || e);
  } finally {
    geoSendBtn.disabled = false;
    geoSendBtn.textContent = '📍 Gửi vị trí';
    geoBusy=false;
  }
}

/* ===== Mode & Status ===== */
let MODE='hang'; const modeVD=$('#modeVD'),modeHang=$('#modeHang'),rowVD=$('#rowVD'),rowDon=$('#rowDon'),lblVD=$('#lblVD'),lblHang=$('#lblHang');
const mavd=$('#mavd'),madon=$('#madon'),statusText=$('#statusText');
function applyMode(){MODE=modeVD?.checked?'vd':'hang';rowVD&&(rowVD.style.display=MODE==='vd'?'block':'none');rowDon&&(rowDon.style.display=MODE==='vd'?'none':'block');lblHang?.classList.toggle('active',MODE==='hang');lblVD?.classList.toggle('active',MODE==='vd');}
modeHang&&(modeHang.checked=true);modeVD&&(modeVD.checked=false);modeVD?.addEventListener('change',applyMode);modeHang?.addEventListener('change',applyMode);applyMode();
function renderStatus(t){statusText.textContent=t||'Trạng thái giao hàng'; if(t){statusText.classList.remove('info-err','info-ok'); if(t==='Giao thành công'||t==='Đã đóng hàng')statusText.classList.add('info-ok');}}

/* ===== Trạng thái tuyến tính ===== */
function nextStatusNew(cur){
  const c=(cur||'').trim();
  if(c==='Đã kiểm đơn') return 'Đang giao hàng';
  if(c==='Đang giao hàng') return 'Giao thành công';
  if(c==='Giao thành công') return null;
  return 'Đang giao hàng';
}

/* ===== LƯU (tự trượt sheet sau “Giao thành công”) ===== */
async function doSaveByMode(codeScanned){
  if(MODE==='hang'){
    const code=codeScanned||(madon?.value||'').trim(); if(!code){setInfo('err','Thiếu mã đơn');return;}
    if(isBlocked(code)){setInfo('', 'Mã này vừa quét rồi — chờ 2 phút.');vibrate([60,40,60]);return;}
    const rows=await sbSelect(TABLE_DON,{[KEY_DON_HD]:`eq.${code}`},'id,trang_thai');
    if(!rows.length){setInfo('err','Không tìm thấy mã hóa đơn');return;}
    const cur=(rows[0].trang_thai||'').trim();
    const nxt=nextStatusNew(cur);
    if(!nxt){ setInfo('err','Đơn đã giao thành công'); renderStatus('Giao thành công'); markScanned(code); return; }

    if(nxt==='Giao thành công'){
      try{
        await sbPatch(TABLE_DON,{[KEY_DON_HD]:`eq.${code}`},{trang_thai:'Giao thành công'});
        renderStatus('Giao thành công'); setInfo('ok','✔ Giao thành công'); showToast('✅ Giao thành công');
      }catch(e){
        console.warn('Update trạng thái lỗi:', e?.message||e);
        renderStatus(cur || 'Đang giao hàng');
        setInfo('err','⚠️ Cập nhật trạng thái lỗi — vẫn cho phép gửi vị trí');
      }finally{
        vibrate([80,60,80]); markScanned(code);
        try{
          // ✅ TỰ ĐỘNG TRƯỢT LÊN SHEET GỬI VỊ TRÍ
          showGeoPrompt({ma_hd:code});
          const st = await navigator.permissions?.query?.({name:'geolocation'});
          if(st && st.state==='granted'){
            const c=await getGPSOnce();
            if(c && geoWrap && geoWrap.style.display==='block'){
              geoCoordsCache=c; geoState='readyToSend';
              geoSendBtn.textContent='📤 Gửi ngay';
              geoMsg2.innerHTML='Đã bật định vị. Bấm <b>Gửi ngay</b> để gửi toạ độ và link bản đồ.';
            }
          }
        }catch{}
      }
      return;
    }else{
      await sbPatch(TABLE_DON,{[KEY_DON_HD]:`eq.${code}`},{trang_thai:nxt});
      renderStatus(nxt); setInfo('ok','✔ '+nxt); vibrate([80,60,80]); markScanned(code);
    }

  }else{
    const code=codeScanned||(mavd?.value||'').trim(); if(!code){setInfo('err','Thiếu mã vận đơn');return;}
    if(isBlocked(code)){setInfo('', 'Mã này vừa quét rồi — chờ 2 phút.');vibrate([60,40,60]);return;}

    let existed=[];
    try{
      existed = await sbSelect(TABLE_VD_KIOT,{ [KEY_VD]: `eq.${code}`, limit: 1 },`${KEY_VD},ngay_dong_hang`);
    }catch(e){
      setInfo('err','Lỗi kiểm tra mã vận đơn: '+(e.message||e)); return;
    }

    if(existed.length && existed[0]?.ngay_dong_hang){
      renderStatus('Đã đóng hàng'); setInfo('err','Mã vận đơn này đã đóng hàng trước đó'); showToast('⚠️ Đã đóng hàng rồi'); vibrate([60,40,60]); markScanned(code); return;
    }

    const body = { [KEY_VD]: code, ngay_dong_hang: nowVNISO() };
    try{
      if(existed.length){ await sbPatch(TABLE_VD_KIOT, { [KEY_VD]: `eq.${code}` }, body); }
      else{ await sbPost(TABLE_VD_KIOT, body); }
      renderStatus('Đã đóng hàng'); setInfo('ok','✔ Đã đóng hàng'); showToast('✅ Lưu “Đã đóng hàng”'); vibrate([80,60,80]); markScanned(code);
    }catch(e){
      setInfo('err','Lỗi lưu mã vận đơn: '+(e.message||e));
    }
  }
}

/* onScan */
async function onScan(res){
  if(!res) return;
  const code=(res.text||'').trim(); if(!code||code===last||scanLock) return;
  if(isBlocked(code)){setInfo('', 'Mã này vừa quét rồi — chờ 2 phút.');vibrate([40,40,40]);return;}
  clearTimeout(noScanTimer); startNoScanTimer();
  last=code; scanLock=true;
  try{beep.currentTime=0;await beep.play();}catch{}
  if(MODE==='vd')mavd.value=code;else madon.value=code;
  setInfo('',`Đã quét: ${code} → đang lưu...`);
  try{await doSaveByMode(code);}catch(e){setInfo('err','Lỗi lưu: '+(e.message||e));}
  finally{setTimeout(()=>{scanLock=false;last='';},800);}
}
$('#saveBtn')?.addEventListener('click',()=>doSaveByMode());

/* ===== Bottom sheets (Đơn hàng, Chi tiết) ===== */
const fabScan=$('#fabScan'), tabBell=$('#tabBell'), bellNum=$('#bellNum'), tabOrders=$('#tabOrders');
const ordersWrap=$('#ordersWrap'),ordersSheet=$('#ordersSheet'),ordersList=$('#ordersList'),ordersEmpty=$('#ordersEmpty'),statusFilter=$('#statusFilter');
const detailWrap=$('#detailWrap'),detailSheet=$('#detailSheet'),detailTitle=$('#detailTitle'),ctBody=$('#ctBody');
const backOrders=$('#backOrders');

fabScan?.addEventListener('click',()=>{ if(document.getElementById('app')?.style.display!=='block') return; $('#startBtn')?.click(); showToast('📷 Mở camera quét'); });
tabBell?.addEventListener('click',()=>showToast('🔔 Chưa có thông báo mới'));

function openSheet(wrap,sheet){wrap.style.display='block';requestAnimationFrame(()=>sheet.classList.add('active'));}
function closeSheet(wrap,sheet){sheet.classList.remove('active');setTimeout(()=>wrap.style.display='none',220);}
function attachSwipe(wrap,sheet){
  let y0=0,y=0,drag=false;
  sheet.addEventListener('touchstart',e=>{drag=true;y0=e.touches[0].clientY;sheet.style.transition='none';});
  sheet.addEventListener('touchmove',e=>{if(!drag)return;y=e.touches[0].clientY;const dy=Math.max(0,y-y0);sheet.style.transform=`translateY(${dy}px)`;});
  sheet.addEventListener('touchend',()=>{sheet.style.transition='transform .2s ease';const dy=Math.max(0,y-y0);if(dy>100)closeSheet(wrap,sheet);else sheet.style.transform='translateY(0)';drag=false;y0=y=0;});
  wrap.addEventListener('click',e=>{if(e.target===wrap)closeSheet(wrap,sheet);});
}
attachSwipe(ordersWrap,ordersSheet); attachSwipe(detailWrap,detailSheet);

tabOrders?.addEventListener('click',async()=>{await loadOrders(); openSheet(ordersWrap,ordersSheet);});
statusFilter?.addEventListener('change',()=>loadOrders());

document.getElementById('ordersHeader')?.addEventListener('click',(e)=>{
  if(e.target.tagName.toLowerCase()==='select'||e.target.closest('select'))return;
  closeSheet(ordersWrap,ordersSheet);
});
document.getElementById('detailHeader')?.addEventListener('click',()=>closeSheet(detailWrap,detailSheet));

/* ===== Đơn hàng (tel link) ===== */
async function loadOrders(){
  const f=statusFilter?.value.trim();
  const params={order:`${DATE_COL}.desc.nullslast`,limit:50}; if(f) params.trang_thai=`eq.${f}`;
  try{
    const rows=await sbSelect(TABLE_DON,params,`${KEY_DON_HD},ten_kh,dien_thoai,dia_chi,trang_thai,tong_tien,${DATE_COL}`);
    renderOrders(rows||[]);
  }catch{ordersList.innerHTML='';ordersEmpty&&(ordersEmpty.style.display='block');}
}
function toTelLink(v){const raw=String(v||'').replace(/\D+/g,''); if(!raw) return ''; const intl=raw.startsWith('0')?'+84'+raw.slice(1):(raw.startsWith('84')?('+'+raw):('+'+raw)); return `<a class="tel" href="tel:${intl}">${v||''}</a>`;}
function renderOrders(rows){
  ordersList.innerHTML=''; if(!rows.length){ordersEmpty&&(ordersEmpty.style.display='block');return;} ordersEmpty&&(ordersEmpty.style.display='none');
  rows.forEach(r=>{
    const ma=r[KEY_DON_HD]||''; const st=(r.trang_thai||'').trim()||'Chưa rõ';
    const div=document.createElement('div'); div.className='order';
    div.innerHTML=`
      <div class="row1">
        <a href="#" class="hd-link" data-ma="${ma}">${ma}</a>
        <span class="badge">${st}</span>
      </div>
      <div class="row2">
        <span>${fmtDateVN(r[DATE_COL]||Date.now())}</span>
        <span class="money">${fmtMoney(r.tong_tien)}</span>
      </div>
      <div class="row3" style="justify-content:space-between">
        <span>KH: ${r.ten_kh||''}</span>
        <span>ĐT: ${toTelLink(r.dien_thoai)}</span>
      </div>
      <div class="row3" style="justify-content:flex-start">
        <span>ĐC: ${r.dia_chi||''}</span>
      </div>`;
    div.querySelector('.hd-link').addEventListener('click',async(e)=>{e.preventDefault(); await openDetail(ma);});
    ordersList.appendChild(div);
  });
}

/* ===== Chi tiết đơn ===== */
async function openDetail(ma){
  detailTitle.textContent='HĐ: '+ma;
  ctBody.innerHTML='<tr><td colspan="4">Đang tải...</td></tr>';
  openSheet(detailWrap,detailSheet);
  try{
    const rows=await sbSelect(TABLE_CT,{[KEY_DON_HD]:`eq.${ma}`,order:'ten_h.asc'},'ten_h,so_luong,don_gia,thanh_tien');
    renderCT(rows||[]);
  }catch(e){ctBody.innerHTML=`<tr><td colspan="4">Lỗi tải chi tiết</td></tr>`;}
}
function renderCT(rows){
  let sum=0; ctBody.innerHTML='';
  rows.forEach(r=>{
    sum+=Number(r.thanh_tien||0);
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${r.ten_h||''}</td><td>${r.so_luong||0}</td><td>${fmtMoney(r.don_gia)}</td><td>${fmtMoney(r.thanh_tien)}</td>`;
    ctBody.appendChild(tr);
  });
  const tr=document.createElement('tr'); tr.className='total-row';
  tr.innerHTML=`<td>Tổng cộng</td><td></td><td></td><td>${fmtMoney(sum)}</td>`;
  ctBody.appendChild(tr);
}
backOrders?.addEventListener('click',()=>{closeSheet(detailWrap,detailSheet);});

/* ===== Realtime chuông ===== */
const ch=supa.channel('rt-don-hang')
  .on('postgres_changes',{event:'INSERT',schema:'public',table:TABLE_DON},p=>{bumpBell();showToast('🆕 Đơn mới: '+(p.new?.[KEY_DON_HD]||'')); if(ordersWrap.style.display==='block')loadOrders();})
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:TABLE_DON},p=>{bumpBell();showToast('🔄 Cập nhật: '+(p.new?.[KEY_DON_HD]||'')+' → '+(p.new?.trang_thai||'')); if(ordersWrap.style.display==='block')loadOrders();})
  .subscribe();
function bumpBell(n=1){const cur=Number(bellNum?.textContent||0)+n; if(bellNum){ bellNum.textContent=cur; bellNum.style.display=cur>0?'flex':'none'; }}

/* Ghi chú: cần HTTPS (hoặc http://localhost) cho camera & định vị. */
// ====================== KẾT THÚC: app_dh.js ======================
