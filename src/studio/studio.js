/* HouseForge Studio client engine: photos -> house model -> 3D scene, floor plan and exports. */
import * as THREE from 'three';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import * as AI from '../lib/ai-config';

let booted = false;
export function boot(){
  if (booted) return; booted = true;

/* ============================================================
   HouseForge Studio
   Photos → structured house model (via Claude) → procedural 3D
   scene + technical floor plan → STL / OBJ / DXF / PDF / SVG.
   ============================================================ */

const $ = (id) => document.getElementById(id);

/* ---------- Sample model (marked as example data) ---------- */
const SAMPLE = {
  name: "Sample house (example)", mode: "interior", units: "m", wallHeight: 2.7, wallThickness: 0,
  rooms: [
    { id:"living", name:"Living room", x:0, y:0, w:5.4, h:4.2, floor:"wood", wallColor:"#ece7dc",
      openings:[ {wall:"S", offset:1.0, width:1.8, type:"window", sill:0.9, height:1.3}, {wall:"E", offset:1.4, width:1.2, type:"passage"}, {wall:"W", offset:0.4, width:0.9, type:"door"} ] },
    { id:"kitchen", name:"Kitchen", x:5.4, y:0, w:3.6, h:4.2, floor:"tile", wallColor:"#f1efe8",
      openings:[ {wall:"N", offset:0.8, width:1.2, type:"window", sill:1.1, height:1.0}, {wall:"S", offset:2.4, width:0.9, type:"door"} ] },
    { id:"hall", name:"Hallway", x:0, y:4.2, w:9.0, h:1.5, floor:"wood", wallColor:"#ece7dc",
      openings:[ {wall:"N", offset:2.0, width:0.9, type:"door"} ] },
    { id:"bed1", name:"Bedroom 1", x:0, y:5.7, w:4.2, h:3.8, floor:"carpet", wallColor:"#e9ecf0",
      openings:[ {wall:"N", offset:1.6, width:0.9, type:"door"}, {wall:"S", offset:1.2, width:1.6, type:"window", sill:0.9, height:1.3} ] },
    { id:"bath", name:"Bathroom", x:4.2, y:5.7, w:2.2, h:2.4, floor:"tile", wallColor:"#eef2f2",
      openings:[ {wall:"N", offset:0.6, width:0.8, type:"door"}, {wall:"E", offset:0.8, width:0.6, type:"window", sill:1.5, height:0.6} ] },
    { id:"bed2", name:"Bedroom 2", x:6.4, y:5.7, w:2.6, h:3.8, floor:"carpet", wallColor:"#f0ebe2",
      openings:[ {wall:"N", offset:0.8, width:0.9, type:"door"}, {wall:"E", offset:1.2, width:1.2, type:"window", sill:0.9, height:1.3} ] }
  ],
  furniture: [
    { id:"f1", roomId:"living", type:"sofa", label:"3-seat sofa", x:0.3, y:2.9, w:2.2, d:0.9, h:0.8, rot:0, color:"#5d6b7a", confidence:0.9 },
    { id:"f2", roomId:"living", type:"coffee_table", label:"Coffee table", x:1.1, y:1.8, w:1.0, d:0.6, h:0.42, rot:0, color:"#8b6b4a", confidence:0.8 },
    { id:"f3", roomId:"living", type:"tv_stand", label:"TV unit", x:1.2, y:0.1, w:1.6, d:0.4, h:0.5, rot:0, color:"#3b3b3b", confidence:0.85 },
    { id:"f4", roomId:"living", type:"tv", label:"TV 55\"", x:1.5, y:0.12, w:1.2, d:0.06, h:0.7, rot:0, color:"#111111", confidence:0.85 },
    { id:"f5", roomId:"living", type:"rug", label:"Rug", x:0.6, y:1.2, w:2.6, d:2.0, h:0.01, rot:0, color:"#b8a98c", confidence:0.6 },
    { id:"f6", roomId:"living", type:"bookshelf", label:"Bookshelf", x:4.9, y:0.2, w:0.35, d:0.9, h:1.9, rot:0, color:"#a98864", confidence:0.55 },
    { id:"f7", roomId:"living", type:"plant", label:"Plant", x:4.8, y:3.6, w:0.4, d:0.4, h:1.2, rot:0, color:"#4a7a3a", confidence:0.6 },
    { id:"f8", roomId:"kitchen", type:"kitchen_counter", label:"Counter run", x:0, y:0.0, w:3.6, d:0.6, h:0.9, rot:0, color:"#d8d3c8", confidence:0.9 },
    { id:"f9", roomId:"kitchen", type:"fridge", label:"Fridge", x:2.9, y:3.5, w:0.7, d:0.7, h:1.8, rot:0, color:"#c9ccd1", confidence:0.9 },
    { id:"f10", roomId:"kitchen", type:"stove", label:"Cooker", x:1.5, y:0.0, w:0.6, d:0.6, h:0.9, rot:0, color:"#2b2b2b", confidence:0.8 },
    { id:"f11", roomId:"kitchen", type:"sink", label:"Sink", x:0.3, y:0.05, w:0.8, d:0.5, h:0.9, rot:0, color:"#b9bcc0", confidence:0.8 },
    { id:"f12", roomId:"kitchen", type:"dining_table", label:"Dining table", x:0.8, y:2.0, w:1.4, d:0.9, h:0.75, rot:0, color:"#9c7a52", confidence:0.75 },
    { id:"f13", roomId:"kitchen", type:"chair", label:"Chair", x:1.0, y:1.4, w:0.45, d:0.45, h:0.9, rot:0, color:"#5a4632", confidence:0.7 },
    { id:"f14", roomId:"kitchen", type:"chair", label:"Chair", x:1.6, y:1.4, w:0.45, d:0.45, h:0.9, rot:0, color:"#5a4632", confidence:0.7 },
    { id:"f15", roomId:"kitchen", type:"chair", label:"Chair", x:1.0, y:3.0, w:0.45, d:0.45, h:0.9, rot:180, color:"#5a4632", confidence:0.7 },
    { id:"f16", roomId:"kitchen", type:"chair", label:"Chair", x:1.6, y:3.0, w:0.45, d:0.45, h:0.9, rot:180, color:"#5a4632", confidence:0.7 },
    { id:"f17", roomId:"bed1", type:"bed", label:"Double bed", x:1.1, y:1.6, w:1.6, d:2.0, h:0.55, rot:0, color:"#c8c2b6", confidence:0.9 },
    { id:"f18", roomId:"bed1", type:"nightstand", label:"Nightstand", x:0.5, y:1.6, w:0.45, d:0.4, h:0.55, rot:0, color:"#8b6b4a", confidence:0.7 },
    { id:"f19", roomId:"bed1", type:"nightstand", label:"Nightstand", x:2.8, y:1.6, w:0.45, d:0.4, h:0.55, rot:0, color:"#8b6b4a", confidence:0.7 },
    { id:"f20", roomId:"bed1", type:"wardrobe", label:"Wardrobe", x:0.1, y:0.1, w:1.8, d:0.6, h:2.2, rot:0, color:"#e8e3da", confidence:0.8 },
    { id:"f21", roomId:"bath", type:"toilet", label:"WC", x:0.2, y:1.7, w:0.4, d:0.65, h:0.8, rot:0, color:"#f4f4f2", confidence:0.9 },
    { id:"f22", roomId:"bath", type:"vanity", label:"Basin unit", x:1.3, y:1.8, w:0.7, d:0.5, h:0.85, rot:0, color:"#f4f4f2", confidence:0.85 },
    { id:"f23", roomId:"bath", type:"bathtub", label:"Bath", x:0.1, y:0.1, w:2.0, d:0.75, h:0.55, rot:0, color:"#f4f4f2", confidence:0.9 },
    { id:"f24", roomId:"bed2", type:"bed", label:"Single bed", x:0.2, y:0.2, w:1.0, d:2.0, h:0.5, rot:0, color:"#d6cfc2", confidence:0.85 },
    { id:"f25", roomId:"bed2", type:"desk", label:"Desk", x:1.4, y:2.6, w:1.1, d:0.6, h:0.75, rot:0, color:"#b5956b", confidence:0.7 },
    { id:"f26", roomId:"bed2", type:"chair", label:"Desk chair", x:1.7, y:2.0, w:0.5, d:0.5, h:0.9, rot:180, color:"#2d2d2d", confidence:0.6 }
  ],
  exterior: { stories:1, storyHeight:2.8, roof:"gable", pitch:30, ridgeAxis:"x", overhang:0.4, wallColor:"#d9cfbd", roofColor:"#5a5047", trimColor:"#f2f0ea",
    windows:[ {side:"S", offset:1.0, width:1.8, height:1.3, sill:0.9, story:1}, {side:"S", offset:6.0, width:1.6, height:1.3, sill:0.9, story:1}, {side:"N", offset:6.2, width:1.2, height:1.0, sill:1.1, story:1}, {side:"E", offset:7.0, width:1.2, height:1.3, sill:0.9, story:1}, {side:"E", offset:1.2, width:0.6, height:0.6, sill:1.5, story:1} ],
    door:{side:"W", offset:0.4, width:0.9, height:2.1}, chimney:true },
  photoRequests: [
    { subject:"Living room bookshelf", roomId:"living", reason:"Depth and shelf count unclear from the overview photo", priority:"medium" },
    { subject:"Bedroom 2 desk chair", roomId:"bed2", reason:"Only partially visible", priority:"low" }
  ],
  notes: "Example data. Dimensions are typical; replace by analysing your own photos."
};

/* ---------- State ---------- */
const state = {
  model: null, originalFurniture: null, redesigned: false,
  photos: [], // {id, file, blob, url, tag, room, used}
  mode: 'interior', tab: '3d', selectedRoom: null,
  opts: { empty:false, thick:false, labels:true, grid:true, whole:true, swing:true, units:'m' },
  ai: null, aiLimits: null, downloads: null, busy:false, abort:null,
  log: []
};

/* ---------- Units ---------- */
function fmtLen(m){ // metres → display string
  if (state.opts.units === 'ft'){ const inch = m/0.0254; const ft = Math.floor(inch/12); const i = Math.round(inch-ft*12); return `${ft}'-${i}"`; }
  return (Math.round(m*100)/100).toFixed(2)+' m';
}
function fmtArea(m2){ if (state.opts.units==='ft') return (m2*10.7639).toFixed(1)+' sq ft'; return m2.toFixed(1)+' m²'; }

/* ---------- Model helpers ---------- */
function normalizeModel(m){
  const out = JSON.parse(JSON.stringify(m||{}));
  out.name = out.name || 'House';
  out.mode = out.mode==='exterior' ? 'exterior' : 'interior';
  out.wallHeight = +out.wallHeight || 2.7;
  out.wallThickness = +out.wallThickness || 0;
  out.rooms = (out.rooms||[]).map((r,i)=>({ id:String(r.id||('room'+i)), name:r.name||('Room '+(i+1)), x:+r.x||0, y:+r.y||0, w:Math.max(0.5,+r.w||3), h:Math.max(0.5,+r.h||3),
    floor:r.floor||'wood', wallColor:r.wallColor||'#ece7dc', height:+r.height||0,
    openings:(r.openings||[]).map(o=>({ wall:(o.wall||'N').toUpperCase()[0], offset:+o.offset||0, width:Math.max(0.3,+o.width||0.9), type:['door','window','passage'].includes(o.type)?o.type:'door', sill:o.sill!=null?+o.sill:(o.type==='window'?0.9:0), height:o.height!=null?+o.height:(o.type==='window'?1.2:2.1) })) }));
  out.furniture = (out.furniture||[]).map((f,i)=>({ id:String(f.id||('f'+i)), roomId:String(f.roomId||(out.rooms[0]&&out.rooms[0].id)||''), type:f.type||'box', label:f.label||f.type||'Item', x:+f.x||0, y:+f.y||0, w:Math.max(0.05,+f.w||0.5), d:Math.max(0.05,+f.d||0.5), h:Math.max(0.01,+f.h||0.5), rot:+f.rot||0, color:f.color||'#8a8a8a', confidence:f.confidence!=null?+f.confidence:0.7, needsPhoto:!!f.needsPhoto }));
  out.exterior = out.exterior || null;
  if (out.exterior){ const e = out.exterior; e.stories=Math.max(1,Math.round(+e.stories||1)); e.storyHeight=+e.storyHeight||2.8; e.roof=['gable','hip','flat','shed'].includes(e.roof)?e.roof:'gable'; e.pitch=+e.pitch||30; e.overhang=e.overhang!=null?+e.overhang:0.4; e.windows=e.windows||[]; e.wallColor=e.wallColor||'#d9cfbd'; e.roofColor=e.roofColor||'#5a5047'; e.trimColor=e.trimColor||'#f2f0ea'; e.ridgeAxis=e.ridgeAxis||'x'; }
  out.photoRequests = out.photoRequests||[];
  out.notes = out.notes||'';
  return out;
}
function bounds(m){
  if (!m.rooms.length){ const e=m.exterior||{}; return {x:0,y:0,w:+e.width||10,h:+e.depth||8}; }
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for (const r of m.rooms){ x0=Math.min(x0,r.x); y0=Math.min(y0,r.y); x1=Math.max(x1,r.x+r.w); y1=Math.max(y1,r.y+r.h); }
  return {x:x0,y:y0,w:x1-x0,h:y1-y0};
}
function roomById(id){ return state.model.rooms.find(r=>r.id===id); }

/* Wall segments: union of room edges, with openings merged, so shared walls are built once. */
function wallSegments(m){
  const lines = new Map(); // key "H:y" or "V:x" → [{a,b,openings:[{a,b,type,sill,height}]}]
  const key = (o,c)=>o+':'+Math.round(c*1000);
  const add = (o,c,a,b,ops)=>{ const k=key(o,c); if(!lines.has(k)) lines.set(k,{o,c,ivs:[],ops:[]}); const L=lines.get(k); L.ivs.push([a,b]); L.ops.push(...ops); };
  for (const r of m.rooms){
    const opsOn = (wall)=> r.openings.filter(o=>o.wall===wall).map(o=>{
      let a; if (wall==='N'||wall==='S') a = r.x + o.offset; else a = r.y + o.offset; return {a, b:a+o.width, type:o.type, sill:o.sill, height:o.height}; });
    add('H', r.y, r.x, r.x+r.w, opsOn('N'));
    add('H', r.y+r.h, r.x, r.x+r.w, opsOn('S'));
    add('V', r.x, r.y, r.y+r.h, opsOn('W'));
    add('V', r.x+r.w, r.y, r.y+r.h, opsOn('E'));
  }
  const segs = [];
  for (const L of lines.values()){
    // union intervals
    const ivs = L.ivs.map(([a,b])=>[Math.min(a,b),Math.max(a,b)]).sort((p,q)=>p[0]-q[0]);
    const merged=[]; for (const iv of ivs){ const last=merged[merged.length-1]; if (last && iv[0]<=last[1]+1e-6) last[1]=Math.max(last[1],iv[1]); else merged.push([iv[0],iv[1]]); }
    // dedupe openings (overlapping same-type → keep larger)
    const ops = L.ops.sort((p,q)=>p.a-q.a); const mops=[];
    for (const o of ops){ const last=mops[mops.length-1]; if (last && o.a<last.b-1e-6){ last.b=Math.max(last.b,o.b); if (o.type==='window'&&last.type!=='window'){} else if (last.type==='window'&&o.type!=='window'){ last.type=o.type; last.sill=o.sill; last.height=o.height; } } else mops.push({...o}); }
    // shared wall? count how many rooms touch this line at each merged interval
    for (const [a,b] of merged){
      const shared = L.ivs.filter(([p,q])=>Math.min(p,q)<b-1e-6 && Math.max(p,q)>a+1e-6).length>1;
      segs.push({o:L.o, c:L.c, a, b, ops:mops.filter(o=>o.a<b && o.b>a), shared});
    }
  }
  return segs;
}
/* Pieces of solid wall for a segment given openings: returns [{a,b,y0,y1}] */
function wallPieces(seg, H){
  const pieces=[]; let cur=seg.a;
  const ops = seg.ops.slice().sort((p,q)=>p.a-q.a);
  for (const o of ops){
    const oa=Math.max(seg.a,o.a), ob=Math.min(seg.b,o.b); if (ob<=oa) continue;
    if (oa>cur) pieces.push({a:cur,b:oa,y0:0,y1:H});
    const top = Math.min(H, (o.type==='window'?o.sill+o.height : (o.type==='passage'? (o.height||H) : o.height)));
    if (o.type==='window' && o.sill>0) pieces.push({a:oa,b:ob,y0:0,y1:o.sill});
    if (top<H-0.01) pieces.push({a:oa,b:ob,y0:top,y1:H});
    cur=ob;
  }
  if (cur<seg.b) pieces.push({a:cur,b:seg.b,y0:0,y1:H});
  return pieces;
}

/* ============================================================
   3D viewer (three.js) with custom orbit controls
   ============================================================ */
let renderer, scene, camera, houseGroup, gridHelper, labelSprites=[];
const cam = { target:new THREE.Vector3(0,0,0), theta:Math.PI/4, phi:Math.PI/3.2, dist:14 };
function initGL(){
  const canvas=$('gl');
  renderer = new THREE.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true, alpha:false});
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio||1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, 1, 0.05, 500);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8c8470, 2.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e0, 3.6); sun.position.set(8,14,6); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-25; sun.shadow.camera.right=25; sun.shadow.camera.top=25; sun.shadow.camera.bottom=-25; sun.shadow.camera.near=1; sun.shadow.camera.far=60; sun.shadow.bias=-0.0005;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 1.0); fill.position.set(-10,6,-8); scene.add(fill);
  houseGroup = new THREE.Group(); scene.add(houseGroup);
  gridHelper = new THREE.GridHelper(60, 60, 0x9aa7bb, 0xc9d2df); gridHelper.position.y=-0.002; gridHelper.material.opacity=0.35; gridHelper.material.transparent=true; scene.add(gridHelper);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.ShadowMaterial({opacity:0.18})); ground.rotation.x=-Math.PI/2; ground.position.y=-0.003; ground.receiveShadow=true; scene.add(ground);
  applyTheme();
  setupControls(canvas);
  const ro = new ResizeObserver(resize); ro.observe($('viewwrap')); resize();
  animate();
}
function applyTheme(){
  const dark = document.documentElement.dataset.theme==='dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  scene.background = new THREE.Color(dark?0x1d2129:0xfbfaf6);
  scene.fog = new THREE.Fog(dark?0x1d2129:0xfbfaf6, 40, 120);
  if (gridHelper){ gridHelper.material.color.set(dark?0x3a4252:0xc9d2df); }
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=>{ applyTheme(); renderPlan(); });
new MutationObserver(()=>{ applyTheme(); renderPlan(); }).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
function resize(){ const w=$('viewwrap').clientWidth, h=$('viewwrap').clientHeight; if(!w||!h) return; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); }
function updateCamera(){
  const p = Math.max(0.05, Math.min(Math.PI/2-0.02, cam.phi));
  camera.position.set(cam.target.x + cam.dist*Math.sin(p)*Math.sin(cam.theta), cam.target.y + cam.dist*Math.cos(p), cam.target.z + cam.dist*Math.sin(p)*Math.cos(cam.theta));
  camera.lookAt(cam.target);
}
function animate(){ requestAnimationFrame(animate); if (state.tab!=='3d') return; updateCamera(); renderer.render(scene,camera); }
function setupControls(el){
  let mode=null, last=null, pinch=null;
  const ptrs = new Map();
  el.addEventListener('contextmenu', e=>e.preventDefault());
  el.addEventListener('pointerdown', e=>{ el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY}); if (ptrs.size===1){ mode=(e.button===2||e.shiftKey)?'pan':'rot'; last={x:e.clientX,y:e.clientY}; } else if (ptrs.size===2){ const [a,b]=[...ptrs.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y), cx:(a.x+b.x)/2, cy:(a.y+b.y)/2}; mode='pinch'; } });
  el.addEventListener('pointermove', e=>{ if(!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if (mode==='pinch' && ptrs.size===2){ const [a,b]=[...ptrs.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y), cx=(a.x+b.x)/2, cy=(a.y+b.y)/2; cam.dist=Math.max(1,Math.min(120,cam.dist*pinch.d/d)); pan(cx-pinch.cx, cy-pinch.cy); pinch={d,cx,cy}; return; }
    if (!last) return; const dx=e.clientX-last.x, dy=e.clientY-last.y; last={x:e.clientX,y:e.clientY};
    if (mode==='rot'){ cam.theta-=dx*0.006; cam.phi-=dy*0.006; cam.phi=Math.max(0.05,Math.min(Math.PI/2-0.02,cam.phi)); } else if (mode==='pan'){ pan(dx,dy); } });
  const end = e=>{ ptrs.delete(e.pointerId); if(ptrs.size===0){mode=null;last=null;pinch=null;} else if (ptrs.size===1){ const p=[...ptrs.values()][0]; last={x:p.x,y:p.y}; mode='rot'; } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', e=>{ e.preventDefault(); cam.dist=Math.max(1,Math.min(120,cam.dist*Math.exp(e.deltaY*0.0012))); }, {passive:false});
  function pan(dx,dy){ const s=cam.dist*0.0016; const right=new THREE.Vector3(); const up=new THREE.Vector3(0,1,0); right.setFromMatrixColumn(camera.matrix,0); const fwd=new THREE.Vector3().crossVectors(up,right).normalize(); cam.target.addScaledVector(right,-dx*s); cam.target.addScaledVector(fwd,-dy*s); }
  el.addEventListener('dblclick', ()=>setView('fit'));
}
function setView(v){
  const b=bounds(state.model); const cx=b.x+b.w/2, cz=b.y+b.h/2; const span=Math.max(b.w,b.h, 4);
  cam.target.set(cx, state.mode==='exterior'?2:0.8, cz);
  if (v==='top'){ cam.theta=0; cam.phi=0.05; cam.dist=span*1.35; }
  else if (v==='front'){ cam.theta=0; cam.phi=Math.PI/2-0.08; cam.dist=span*1.8; }
  else { cam.theta=Math.PI/4; cam.phi=Math.PI/3.2; cam.dist=span*1.55; }
}

/* ---------- Materials & textures ---------- */
const texCache = {};
function floorTexture(kind){
  if (texCache[kind]) return texCache[kind];
  const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d');
  if (kind==='wood'){ g.fillStyle='#b4875a'; g.fillRect(0,0,256,256); for(let i=0;i<8;i++){ g.fillStyle=`hsl(${28+Math.random()*6},${40+Math.random()*15}%,${48+Math.random()*12}%)`; g.fillRect(0,i*32,256,31); g.fillStyle='rgba(60,30,10,.35)'; g.fillRect(0,i*32+31,256,1); const off=(i*97)%256; g.fillRect(off,i*32,1,31);} }
  else if (kind==='tile'){ g.fillStyle='#d9d6cf'; g.fillRect(0,0,256,256); g.strokeStyle='#a9a69f'; g.lineWidth=2; for(let i=0;i<=4;i++){ g.beginPath(); g.moveTo(i*64,0); g.lineTo(i*64,256); g.stroke(); g.beginPath(); g.moveTo(0,i*64); g.lineTo(256,i*64); g.stroke(); } for(let i=0;i<16;i++){ g.fillStyle=`rgba(0,0,0,${Math.random()*0.05})`; g.fillRect((i%4)*64+2,Math.floor(i/4)*64+2,60,60);} }
  else if (kind==='carpet'){ g.fillStyle='#b7ad9c'; g.fillRect(0,0,256,256); for(let i=0;i<4000;i++){ g.fillStyle=`rgba(${Math.random()<.5?255:0},${Math.random()<.5?255:0},${Math.random()<.5?255:0},.05)`; g.fillRect(Math.random()*256,Math.random()*256,2,2);} }
  else { g.fillStyle='#bfc0bb'; g.fillRect(0,0,256,256); for(let i=0;i<1500;i++){ g.fillStyle=`rgba(0,0,0,${Math.random()*0.08})`; g.fillRect(Math.random()*256,Math.random()*256,3,3);} }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; texCache[kind]=t; return t;
}
function mat(color, opts={}){ return new THREE.MeshStandardMaterial(Object.assign({color:new THREE.Color(color), roughness:0.85, metalness:0.0}, opts)); }
function box(w,h,d,material,x,y,z){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; return m; }
function cyl(r,h,material,x,y,z,rt){ const m=new THREE.Mesh(new THREE.CylinderGeometry(rt!=null?rt:r,r,h,24),material); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; return m; }

/* ---------- Furniture generators (clean, assumed proportions) ---------- */
/* Each returns a Group centred at the footprint centre, bottom at y=0, footprint w (x) × d (z), height h. */
const FURN = {
  bed(w,d,h,c){ const g=new THREE.Group(); const frame=mat(0x8b6b4a); const mattress=mat(0xf1ede4,{roughness:0.95}); const sheet=mat(c);
    g.add(box(w,0.25,d,frame,0,0.125,0)); g.add(box(w-0.1,0.22,d-0.1,mattress,0,0.36,0)); g.add(box(w-0.12,0.06,d*0.62,sheet,0,0.5,d*0.19));
    g.add(box(w,Math.max(h,0.9),0.06,frame,0,Math.max(h,0.9)/2,-d/2+0.03)); // headboard
    const pw=(w-0.2)/2-0.03; g.add(box(pw,0.12,0.45,mat(0xffffff),-pw/2-0.03,0.53,-d/2+0.33)); g.add(box(pw,0.12,0.45,mat(0xffffff),pw/2+0.03,0.53,-d/2+0.33)); return g; },
  sofa(w,d,h,c){ const g=new THREE.Group(); const m=mat(c,{roughness:0.95}); const leg=mat(0x3a2e24);
    g.add(box(w,0.18,d,m,0,0.27,0)); g.add(box(w-0.3,0.18,d-0.2,mat(c),0,0.44,0.08)); g.add(box(w,h-0.18,0.22,m,0,(h-0.18)/2+0.18,-d/2+0.11));
    g.add(box(0.15,0.42,d,m,-w/2+0.075,0.39,0)); g.add(box(0.15,0.42,d,m,w/2-0.075,0.39,0));
    for (const sx of [-1,1]) for (const sz of [-1,1]) g.add(box(0.06,0.18,0.06,leg,sx*(w/2-0.1),0.09,sz*(d/2-0.1)));
    // cushions split
    const n=Math.max(1,Math.round(w/0.8)); for(let i=0;i<n;i++){ const cw=(w-0.3)/n-0.03; g.add(box(cw,0.14,d-0.32,mat(c),-(w-0.3)/2+cw/2+i*((w-0.3)/n)+0.015,0.55,0.1)); } return g; },
  armchair(w,d,h,c){ return FURN.sofa(w,d,h,c); },
  chair(w,d,h,c){ const g=new THREE.Group(); const m=mat(c); const seatH=0.45; g.add(box(w,0.05,d,m,0,seatH,0)); g.add(box(w,h-seatH,0.05,m,0,seatH+(h-seatH)/2,-d/2+0.025));
    for (const sx of [-1,1]) for (const sz of [-1,1]) g.add(box(0.035,seatH,0.035,m,sx*(w/2-0.03),seatH/2,sz*(d/2-0.03))); return g; },
  dining_table(w,d,h,c){ const g=new THREE.Group(); const m=mat(c); g.add(box(w,0.04,d,m,0,h-0.02,0)); for (const sx of [-1,1]) for (const sz of [-1,1]) g.add(box(0.06,h-0.04,0.06,m,sx*(w/2-0.08),(h-0.04)/2,sz*(d/2-0.08))); return g; },
  table(w,d,h,c){ return FURN.dining_table(w,d,h,c); },
  coffee_table(w,d,h,c){ const g=new THREE.Group(); const m=mat(c); g.add(box(w,0.03,d,m,0,h-0.015,0)); g.add(box(w*0.9,0.02,d*0.9,m,0,0.12,0)); for (const sx of [-1,1]) for (const sz of [-1,1]) g.add(box(0.04,h-0.03,0.04,m,sx*(w/2-0.05),(h-0.03)/2,sz*(d/2-0.05))); return g; },
  desk(w,d,h,c){ const g=new THREE.Group(); const m=mat(c); g.add(box(w,0.03,d,m,0,h-0.015,0)); g.add(box(0.03,h-0.03,d-0.05,m,-w/2+0.03,(h-0.03)/2,0)); g.add(box(0.03,h-0.03,d-0.05,m,w/2-0.03,(h-0.03)/2,0)); g.add(box(w-0.06,0.3,0.02,m,0,h-0.2,-d/2+0.03)); g.add(box(0.35,0.02,0.22,mat(0x2a2a2a),0,h+0.01,0)); g.add(box(0.4,0.26,0.02,mat(0x111111),0,h+0.25,-0.1)); return g; },
  nightstand(w,d,h,c){ const g=new THREE.Group(); const m=mat(c); g.add(box(w,h,d,m,0,h/2,0)); g.add(box(w-0.06,0.02,0.01,mat(0x333333),0,h*0.7,d/2+0.005)); g.add(cyl(0.12,0.02,mat(0xc8b48a),0,h+0.01,0)); g.add(cyl(0.015,0.28,mat(0x444444),0,h+0.15,0)); g.add(cyl(0.11,0.14,mat(0xf5e9d0,{emissive:0x2a2000}),0,h+0.36,0,0.08)); return g; },
  dresser(w,d,h,c){ const g=new THREE.Group(); const m=mat(c); g.add(box(w,h,d,m,0,h/2,0)); const n=Math.max(2,Math.round(h/0.3)); for(let i=0;i<n;i++){ g.add(box(w-0.08,0.02,0.01,mat(0x333333),0,(i+0.5)*(h/n),d/2+0.006)); g.add(box(0.12,0.015,0.015,mat(0x999999),0,(i+0.5)*(h/n)+0.05,d/2+0.01)); } return g; },
  wardrobe(w,d,h,c){ const g=new THREE.Group(); const m=mat(c); g.add(box(w,h,d,m,0,h/2,0)); const doors=Math.max(1,Math.round(w/0.5)); for(let i=1;i<doors;i++) g.add(box(0.01,h-0.1,0.01,mat(0x555555),-w/2+i*(w/doors),h/2,d/2+0.005)); for(let i=0;i<doors;i++) g.add(box(0.02,0.14,0.02,mat(0x999999),-w/2+(i+0.5)*(w/doors)+(i%2?-0.06:0.06),h*0.5,d/2+0.015)); return g; },
  cabinet(w,d,h,c){ return FURN.wardrobe(w,d,h,c); },
  bookshelf(w,d,h,c){ const g=new THREE.Group(); const m=mat(c); const t=0.025; g.add(box(w,h,t,m,0,h/2,-d/2+t/2)); g.add(box(t,h,d,m,-w/2+t/2,h/2,0)); g.add(box(t,h,d,m,w/2-t/2,h/2,0)); const n=Math.max(2,Math.round(h/0.35)); for(let i=0;i<=n;i++){ g.add(box(w,t,d,m,0,Math.min(h-t/2,i*(h/n)+t/2),0)); if(i<n){ let x=-w/2+t+0.02; while(x<w/2-t-0.05){ const bw=0.03+Math.random()*0.03; const bh=(h/n)*(0.55+Math.random()*0.35); g.add(box(bw,bh,d*0.7,mat(`hsl(${Math.random()*360},45%,${35+Math.random()*30}%)`),x+bw/2,i*(h/n)+t+bh/2,0)); x+=bw+0.005; } } } return g; },
  shelf(w,d,h,c){ return FURN.bookshelf(w,d,h,c); },
  tv_stand(w,d,h,c){ const g=new THREE.Group(); const m=mat(c); g.add(box(w,h,d,m,0,h/2,0)); g.add(box(w-0.04,0.02,0.01,mat(0x222222),0,h*0.5,d/2+0.006)); return g; },
  tv(w,d,h,c){ const g=new THREE.Group(); g.add(box(w,h*0.92,0.03,mat(0x0b0b0b,{roughness:0.3,metalness:0.4}),0,h*0.54,0)); g.add(box(w*0.96,h*0.84,0.005,mat(0x15202b,{roughness:0.2,metalness:0.5,emissive:0x0a1420}),0,h*0.54,0.018)); g.add(box(w*0.4,0.08,0.18,mat(0x222222),0,0.04,0)); return g; },
  kitchen_counter(w,d,h,c){ const g=new THREE.Group(); const m=mat(c); const top=mat(0x5b5b5b,{roughness:0.4}); g.add(box(w,h-0.04,d,m,0,(h-0.04)/2,0)); g.add(box(w+0.02,0.04,d+0.02,top,0,h-0.02,0)); const n=Math.max(1,Math.round(w/0.6)); for(let i=1;i<n;i++) g.add(box(0.008,h-0.12,0.01,mat(0x555555),-w/2+i*(w/n),(h-0.04)/2,d/2+0.005)); for(let i=0;i<n;i++) g.add(box(0.12,0.015,0.02,mat(0x999999),-w/2+(i+0.5)*(w/n),h-0.12,d/2+0.015)); g.add(box(w,0.7,0.35,m,0,h+0.5+0.35,-d/2+0.175)); return g; },
  kitchen_island(w,d,h,c){ const g=new THREE.Group(); g.add(box(w,h-0.04,d,mat(c),0,(h-0.04)/2,0)); g.add(box(w+0.1,0.04,d+0.1,mat(0x5b5b5b,{roughness:0.4}),0,h-0.02,0)); return g; },
  fridge(w,d,h,c){ const g=new THREE.Group(); const m=mat(c,{roughness:0.35,metalness:0.6}); g.add(box(w,h,d,m,0,h/2,0)); g.add(box(w-0.02,0.01,0.01,mat(0x333333),0,h*0.65,d/2+0.006)); g.add(box(0.025,0.5,0.03,mat(0x777777),w/2-0.08,h*0.4,d/2+0.02)); g.add(box(0.025,0.25,0.03,mat(0x777777),w/2-0.08,h*0.82,d/2+0.02)); return g; },
  stove(w,d,h,c){ const g=new THREE.Group(); g.add(box(w,h,d,mat(c,{roughness:0.4,metalness:0.5}),0,h/2,0)); g.add(box(w,0.01,d,mat(0x111111,{roughness:0.2}),0,h+0.005,0)); for (const sx of [-1,1]) for (const sz of [-1,1]) g.add(cyl(0.08,0.012,mat(0x333333),sx*w*0.25,h+0.016,sz*d*0.25)); g.add(box(w-0.1,0.3,0.01,mat(0x222222),0,h*0.45,d/2+0.006)); return g; },
  oven(w,d,h,c){ return FURN.stove(w,d,h,c); },
  sink(w,d,h,c){ const g=new THREE.Group(); g.add(box(w,h-0.04,d,mat(0xd8d3c8),0,(h-0.04)/2,0)); g.add(box(w,0.04,d,mat(0x5b5b5b,{roughness:0.4}),0,h-0.02,0)); g.add(box(w*0.7,0.03,d*0.6,mat(c,{roughness:0.3,metalness:0.7}),0,h+0.005,0)); g.add(cyl(0.015,0.3,mat(0xaaaaaa,{metalness:0.8,roughness:0.3}),0,h+0.15,-d*0.35)); return g; },
  toilet(w,d,h,c){ const g=new THREE.Group(); const m=mat(c,{roughness:0.3}); g.add(box(w*0.9,0.2,d*0.3,m,0,h*0.5,-d/2+d*0.15)); g.add(box(w*0.9,h*0.4,d*0.3,m,0,h*0.2,-d/2+d*0.15)); g.add(cyl(w*0.45,0.38,m,0,0.19,d*0.1)); g.add(cyl(w*0.48,0.04,m,0,0.4,d*0.1)); return g; },
  bathtub(w,d,h,c){ const g=new THREE.Group(); const m=mat(c,{roughness:0.3}); g.add(box(w,h,d,m,0,h/2,0)); g.add(box(w-0.16,0.02,d-0.16,mat(0xd6e4ea,{roughness:0.1,metalness:0.1}),0,h-0.03,0)); g.add(cyl(0.02,0.25,mat(0xaaaaaa,{metalness:0.8}),-w/2+0.2,h+0.12,0)); return g; },
  shower(w,d,h,c){ const g=new THREE.Group(); g.add(box(w,0.05,d,mat(c),0,0.025,0)); const glass=mat(0xbfe0ea,{transparent:true,opacity:0.3,roughness:0.05}); g.add(box(w,h,0.01,glass,0,h/2,d/2)); g.add(box(0.01,h,d,glass,w/2,h/2,0)); g.add(cyl(0.015,h-0.1,mat(0xaaaaaa,{metalness:0.8}),-w/2+0.08,h/2,-d/2+0.08)); g.add(cyl(0.1,0.02,mat(0xaaaaaa,{metalness:0.8}),-w/2+0.2,h-0.05,-d/2+0.2)); return g; },
  vanity(w,d,h,c){ const g=new THREE.Group(); g.add(box(w,h-0.05,d,mat(0xe3ddd2),0,(h-0.05)/2,0)); g.add(box(w,0.05,d,mat(c,{roughness:0.3}),0,h-0.025,0)); g.add(cyl(Math.min(w,d)*0.3,0.12,mat(0xffffff,{roughness:0.2}),0,h+0.06,0)); g.add(box(w*0.8,0.6,0.02,mat(0xd0e0e8,{metalness:0.9,roughness:0.05}),0,h+0.65,-d/2+0.01)); return g; },
  washer(w,d,h,c){ const g=new THREE.Group(); g.add(box(w,h,d,mat(c,{roughness:0.4,metalness:0.3}),0,h/2,0)); g.add(cyl(w*0.3,0.03,mat(0x222222,{roughness:0.2}),0,h*0.45,d/2,w*0.3)); g.children[1].rotation.x=Math.PI/2; return g; },
  lamp(w,d,h,c){ const g=new THREE.Group(); g.add(cyl(w/2,0.02,mat(0x333333),0,0.01,0)); g.add(cyl(0.012,h-0.3,mat(0x444444),0,(h-0.3)/2,0)); g.add(cyl(w/2,0.3,mat(c,{emissive:0x332a10}),0,h-0.15,0,w/2*0.8)); return g; },
  rug(w,d,h,c){ const g=new THREE.Group(); g.add(box(w,0.012,d,mat(c,{roughness:1}),0,0.006,0)); g.add(box(w-0.2,0.013,d-0.2,mat(c,{roughness:1}),0,0.0065,0)); return g; },
  plant(w,d,h,c){ const g=new THREE.Group(); g.add(cyl(w/2,h*0.3,mat(0x8a6d4a),0,h*0.15,0,w/2*0.8)); for(let i=0;i<7;i++){ const a=i/7*Math.PI*2; const l=new THREE.Mesh(new THREE.SphereGeometry(w*0.35,10,8),mat(c)); l.position.set(Math.cos(a)*w*0.3,h*0.3+h*0.45+Math.sin(i)*h*0.12,Math.sin(a)*w*0.3); l.scale.set(1,1.3,1); l.castShadow=true; g.add(l);} return g; },
  piano(w,d,h,c){ const g=new THREE.Group(); g.add(box(w,h,d,mat(c,{roughness:0.2}),0,h/2,0)); g.add(box(w*0.9,0.02,0.1,mat(0xffffff),0,h*0.75,d/2+0.05)); return g; },
  box(w,d,h,c){ const g=new THREE.Group(); g.add(box(w,h,d,mat(c),0,h/2,0)); return g; }
};
function buildFurniture(f){
  const gen = FURN[f.type] || FURN.box;
  let g; try { g = gen(f.w,f.d,f.h,f.color); } catch(e){ g = FURN.box(f.w,f.d,f.h,f.color); }
  return g;
}

/* ---------- Scene build ---------- */
function rebuild3D(){
  while (houseGroup.children.length) houseGroup.remove(houseGroup.children[0]);
  labelSprites=[];
  const m=state.model; if(!m) return;
  gridHelper.visible = state.opts.grid;
  if (state.mode==='exterior') buildExterior(m); else buildInterior(m);
  $('renderChip').textContent = state.mode==='exterior' ? (m.exterior? `${m.exterior.roof} roof · ${m.exterior.stories} storey` : 'exterior (from footprint)') : (state.opts.empty?'open ceiling · empty rooms':'open ceiling');
  updateStatus();
}
function buildInterior(m){
  const H = m.wallHeight; const t = state.opts.thick ? 0.15 : 0.06;
  const rooms = state.opts.whole ? m.rooms : m.rooms.filter(r=>!state.selectedRoom || r.id===state.selectedRoom);
  const sub = {rooms};
  // floors
  for (const r of rooms){
    const tex = floorTexture(r.floor); const mt = new THREE.MeshStandardMaterial({map:tex, roughness:0.9}); mt.map = tex.clone(); mt.map.needsUpdate=true; mt.map.repeat.set(r.w/1.2, r.h/1.2);
    const fl = new THREE.Mesh(new THREE.BoxGeometry(r.w,0.05,r.h), mt); fl.position.set(r.x+r.w/2,-0.025,r.y+r.h/2); fl.receiveShadow=true; houseGroup.add(fl);
    // skirting
    const sk = mat(0xf5f3ee); const sh=0.08;
    houseGroup.add(box(r.w,sh,0.012,sk,r.x+r.w/2,sh/2,r.y+0.006)); houseGroup.add(box(r.w,sh,0.012,sk,r.x+r.w/2,sh/2,r.y+r.h-0.006));
    houseGroup.add(box(0.012,sh,r.h,sk,r.x+0.006,sh/2,r.y+r.h/2)); houseGroup.add(box(0.012,sh,r.h,sk,r.x+r.w-0.006,sh/2,r.y+r.h/2));
    if (state.opts.labels) addLabel(r.name, r.x+r.w/2, 0.02, r.y+r.h/2, r.w);
  }
  // walls
  const segs = wallSegments(sub);
  for (const s of segs){
    const room = rooms.find(r=> (s.o==='H' ? (Math.abs(r.y-s.c)<1e-3||Math.abs(r.y+r.h-s.c)<1e-3) : (Math.abs(r.x-s.c)<1e-3||Math.abs(r.x+r.w-s.c)<1e-3)) && (s.o==='H'? (r.x<s.b&&r.x+r.w>s.a):(r.y<s.b&&r.y+r.h>s.a)) );
    const wm = mat(room?room.wallColor:'#ece7dc',{roughness:0.92});
    const top = mat(0xffffff,{roughness:0.6});
    for (const p of wallPieces(s,H)){
      const len=p.b-p.a, hh=p.y1-p.y0; if (len<=0.001||hh<=0.001) continue;
      let mesh; if (s.o==='H') mesh=box(len,hh,t,wm,(p.a+p.b)/2,p.y0+hh/2,s.c); else mesh=box(t,hh,len,wm,s.c,p.y0+hh/2,(p.a+p.b)/2);
      houseGroup.add(mesh);
      if (Math.abs(p.y1-H)<1e-6){ // wall top cap (lighter) for the open-ceiling read
        const cap = s.o==='H'? box(len,0.01,t+0.004,top,(p.a+p.b)/2,H+0.005,s.c) : box(t+0.004,0.01,len,top,s.c,H+0.005,(p.a+p.b)/2); houseGroup.add(cap);
      }
    }
    // window glazing & frames, door frames
    for (const o of s.ops){
      const oa=Math.max(s.a,o.a), ob=Math.min(s.b,o.b); const len=ob-oa; if(len<=0) continue;
      const cx = s.o==='H'? (oa+ob)/2 : s.c, cz = s.o==='H'? s.c : (oa+ob)/2;
      if (o.type==='window'){
        const glass = mat(0xbfdcec,{transparent:true,opacity:0.35,roughness:0.05,metalness:0.1}); const fr = mat(0xf7f7f5,{roughness:0.5});
        const gh=o.height, gy=o.sill+gh/2;
        const sz = s.o==='H' ? [len,gh,0.02] : [0.02,gh,len];
        houseGroup.add(box(sz[0],sz[1],sz[2],glass,cx,gy,cz));
        const fw=0.05; // frame
        if (s.o==='H'){ houseGroup.add(box(len,fw,t+0.02,fr,cx,o.sill+fw/2,cz)); houseGroup.add(box(len,fw,t+0.02,fr,cx,o.sill+gh-fw/2,cz)); houseGroup.add(box(fw,gh,t+0.02,fr,oa+fw/2,gy,cz)); houseGroup.add(box(fw,gh,t+0.02,fr,ob-fw/2,gy,cz)); houseGroup.add(box(fw,gh,t+0.02,fr,cx,gy,cz)); }
        else { houseGroup.add(box(t+0.02,fw,len,fr,cx,o.sill+fw/2,cz)); houseGroup.add(box(t+0.02,fw,len,fr,cx,o.sill+gh-fw/2,cz)); houseGroup.add(box(t+0.02,gh,fw,fr,cx,gy,oa+fw/2)); houseGroup.add(box(t+0.02,gh,fw,fr,cx,gy,ob-fw/2)); houseGroup.add(box(t+0.02,gh,fw,fr,cx,gy,cz)); }
      } else if (o.type==='door'){
        const fr = mat(0xf7f7f5,{roughness:0.5}); const fw=0.04; const dh=Math.min(H,o.height||2.1);
        if (s.o==='H'){ houseGroup.add(box(fw,dh,t+0.02,fr,oa+fw/2,dh/2,cz)); houseGroup.add(box(fw,dh,t+0.02,fr,ob-fw/2,dh/2,cz)); houseGroup.add(box(len,fw,t+0.02,fr,cx,dh-fw/2,cz)); }
        else { houseGroup.add(box(t+0.02,dh,fw,fr,cx,dh/2,oa+fw/2)); houseGroup.add(box(t+0.02,dh,fw,fr,cx,dh/2,ob-fw/2)); houseGroup.add(box(t+0.02,fw,len,fr,cx,dh-fw/2,cz)); }
        // threshold strip (doors are rendered open; no leaf)
        houseGroup.add(box(s.o==='H'?len:t+0.02,0.006,s.o==='H'?t+0.02:len,mat(0xd0c7b8),cx,0.003,cz));
      }
    }
  }
  // furniture
  if (!state.opts.empty){
    for (const f of m.furniture){
      const r = rooms.find(r=>r.id===f.roomId); if(!r) continue;
      const g = buildFurniture(f);
      g.position.set(r.x+f.x+f.w/2, 0, r.y+f.y+f.d/2); g.rotation.y = -f.rot*Math.PI/180;
      if (f.rot%180!==0){ /* rotate about centre: swap handled by generator footprint; keep centre */ }
      houseGroup.add(g);
    }
  }
}
function buildExterior(m){
  const b = bounds(m); const e = m.exterior || {stories:1, storyHeight:2.8, roof:'gable', pitch:30, overhang:0.4, wallColor:'#d9cfbd', roofColor:'#5a5047', trimColor:'#f2f0ea', windows:[], ridgeAxis:'x'};
  const W=b.w, D=b.h, stories=e.stories, SH=e.storyHeight, Hw=stories*SH;
  const cx=b.x+W/2, cz=b.y+D/2;
  const wall = mat(e.wallColor,{roughness:0.9}); const trim = mat(e.trimColor); const roofM = mat(e.roofColor,{roughness:0.85});
  // walls
  houseGroup.add(box(W,Hw,D,wall,cx,Hw/2,cz));
  // plinth and storey band
  houseGroup.add(box(W+0.06,0.25,D+0.06,mat(0x7d7468),cx,0.125,cz));
  for (let s=1;s<stories;s++) houseGroup.add(box(W+0.04,0.08,D+0.04,trim,cx,s*SH,cz));
  // corner boards
  for (const sx of [-1,1]) for (const sz of [-1,1]) houseGroup.add(box(0.12,Hw,0.12,trim,cx+sx*(W/2),Hw/2,cz+sz*(D/2)));
  // windows
  const placeOnSide = (side, offset, width, height, sill, story, kind)=>{
    const y0=(story-1)*SH + sill; const glass=mat(0x2f4a5a,{roughness:0.15,metalness:0.4}); const fr=trim; const fw=0.07; const depth=0.1;
    let x,z,rot=0; if (side==='S'){ x=b.x+offset+width/2; z=b.y+D; } else if (side==='N'){ x=b.x+W-offset-width/2; z=b.y; } else if (side==='E'){ x=b.x+W; z=b.y+offset+width/2; rot=1; } else { x=b.x; z=b.y+D-offset-width/2; rot=1; }
    const g=new THREE.Group();
    if (kind==='door'){ g.add(box(width,height,depth,mat(0x5a3b28,{roughness:0.6}),0,height/2,0)); g.add(box(width+fw*2,fw,depth+0.02,fr,0,height+fw/2,0)); g.add(box(fw,height,depth+0.02,fr,-width/2-fw/2,height/2,0)); g.add(box(fw,height,depth+0.02,fr,width/2+fw/2,height/2,0)); g.add(box(width+0.6,0.1,1.0,mat(0x9c958a),0,0.05,0.5)); g.add(cyl(0.02,0.1,mat(0xcfb53b,{metalness:0.8}),width/2-0.1,height*0.48,0.07)); }
    else { g.add(box(width,height,depth*0.6,glass,0,height/2,0)); g.add(box(width+fw*2,fw,depth,fr,0,height+fw/2,0)); g.add(box(width+fw*2,fw,depth+0.06,fr,0,-fw/2,0.03)); g.add(box(fw,height,depth,fr,-width/2-fw/2,height/2,0)); g.add(box(fw,height,depth,fr,width/2+fw/2,height/2,0)); g.add(box(0.03,height,depth*0.7,fr,0,height/2,0)); g.add(box(width,0.03,depth*0.7,fr,0,height/2,0)); }
    g.position.set(x,y0,z); if (rot) g.rotation.y=Math.PI/2; houseGroup.add(g);
  };
  const wins = (e.windows&&e.windows.length) ? e.windows : m.rooms.flatMap(r=>r.openings.filter(o=>o.type==='window').map(o=>{ // derive from room windows on outer walls
      const side=o.wall; const outer = side==='N'?Math.abs(r.y-b.y)<1e-3 : side==='S'?Math.abs(r.y+r.h-(b.y+D))<1e-3 : side==='W'?Math.abs(r.x-b.x)<1e-3 : Math.abs(r.x+r.w-(b.x+W))<1e-3; if(!outer) return null;
      let offset; if (side==='S') offset=r.x+o.offset-b.x; else if (side==='N') offset=(b.x+W)-(r.x+o.offset+o.width); else if (side==='E') offset=r.y+o.offset-b.y; else offset=(b.y+D)-(r.y+o.offset+o.width);
      return {side, offset, width:o.width, height:o.height, sill:o.sill, story:1}; }).filter(Boolean));
  for (const w of wins) placeOnSide(w.side, +w.offset||0, +w.width||1.2, +w.height||1.2, +w.sill||0.9, +w.story||1, 'window');
  const door = e.door || (()=>{ for (const r of m.rooms) for (const o of r.openings) if (o.type==='door'){ const side=o.wall; const outer = side==='N'?Math.abs(r.y-b.y)<1e-3 : side==='S'?Math.abs(r.y+r.h-(b.y+D))<1e-3 : side==='W'?Math.abs(r.x-b.x)<1e-3 : Math.abs(r.x+r.w-(b.x+W))<1e-3; if(outer){ let offset; if (side==='S') offset=r.x+o.offset-b.x; else if (side==='N') offset=(b.x+W)-(r.x+o.offset+o.width); else if (side==='E') offset=r.y+o.offset-b.y; else offset=(b.y+D)-(r.y+o.offset+o.width); return {side, offset, width:o.width, height:2.1}; } } return null; })();
  if (door) placeOnSide(door.side, +door.offset||0, +door.width||0.9, +door.height||2.1, 0, 1, 'door');
  // roof
  const ov = e.overhang, pitch = e.pitch*Math.PI/180;
  const alongX = e.ridgeAxis!=='z';
  const rw = (alongX?D:W)+ov*2, rl = (alongX?W:D)+ov*2; const rise = Math.tan(pitch)*(rw/2);
  const eave = Hw; // eave height
  if (e.roof==='flat'){ houseGroup.add(box(W+ov,0.25,D+ov,roofM,cx,Hw+0.125,cz)); houseGroup.add(box(W+0.1,0.3,D+0.1,trim,cx,Hw+0.15,cz)); }
  else if (e.roof==='shed'){ const g=new THREE.Group(); const geo=new THREE.BufferGeometry(); const h2=Math.tan(pitch)*rw; const v=[ -rw/2,0,-rl/2,  rw/2,h2,-rl/2,  rw/2,h2,rl/2,  -rw/2,0,rl/2 ]; geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3)); geo.setIndex([0,1,2,0,2,3,2,1,0,3,2,0]); geo.computeVertexNormals(); const mesh=new THREE.Mesh(geo,roofM); mesh.castShadow=true; g.add(mesh); g.position.set(cx,eave,cz); if(alongX) g.rotation.y=Math.PI/2; houseGroup.add(g); houseGroup.add(box(W,h2*0.999*((W-ov*2)/rw),D,wall,cx,Hw+ (h2*((W)/rw))/2,cz)); }
  else {
    // gable or hip via custom geometry; ridge along local Z (length rl), span along local X (rw)
    const g=new THREE.Group(); const hipIn = e.roof==='hip' ? Math.min(rl/2-0.1, rw/2) : 0;
    const pts=[ [-rw/2,0,-rl/2],[rw/2,0,-rl/2],[rw/2,0,rl/2],[-rw/2,0,rl/2], [0,rise,-rl/2+hipIn],[0,rise,rl/2-hipIn] ];
    const idx=[ 0,4,1,  1,4,5, 1,5,2,  2,5,3,  3,5,4,  3,4,0,  /* bottom */ 0,1,2, 0,2,3 ];
    const pos=[]; for (const i of idx) pos.push(...pts[i]);
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:new THREE.Color(e.roofColor),roughness:0.85,side:THREE.DoubleSide})); mesh.castShadow=true; mesh.receiveShadow=true; g.add(mesh);
    if (e.roof==='gable'){ // gable end walls
      const gw = rw-ov*2; const griseW = Math.tan(pitch)*(gw/2);
      for (const sz of [-1,1]){ const geo2=new THREE.BufferGeometry(); const z=sz*(rl/2-ov); const v=[ -gw/2,0,z, gw/2,0,z, 0,griseW,z ]; geo2.setAttribute('position',new THREE.Float32BufferAttribute(v,3)); geo2.computeVertexNormals(); const gm=new THREE.Mesh(geo2,new THREE.MeshStandardMaterial({color:new THREE.Color(e.wallColor),roughness:0.9,side:THREE.DoubleSide})); gm.castShadow=true; g.add(gm); }
      // fascia
      for (const sz of [-1,1]){ const z=sz*(rl/2); const L=Math.hypot(rw/2,rise); for (const sx of [-1,1]){ const fb=box(L,0.18,0.05,trim,sx*rw/4,rise/2,z); fb.rotation.z=sx*-Math.atan2(rise,rw/2); g.add(fb);} }
    }
    // eave fascia along the long sides
    for (const sx of [-1,1]) g.add(box(0.05,0.18,rl,trim,sx*rw/2,-0.09,0));
    if (e.chimney) g.add(box(0.6,rise+0.8,0.6,mat(0x8a6a5a),rw*0.2,rise*0.3+0.4,-rl*0.2));
    g.position.set(cx,eave,cz); if (alongX) g.rotation.y=Math.PI/2; houseGroup.add(g);
  }
  // garden ground & path
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(W+16,D+16), mat(0x7f9a64,{roughness:1})); lawn.rotation.x=-Math.PI/2; lawn.position.set(cx,-0.004,cz); lawn.receiveShadow=true; houseGroup.add(lawn);
  if (state.opts.labels) addLabel(m.name, cx, Hw+ (e.roof==='flat'?0.6:rise+0.6), cz, W);
}
function addLabel(text, x, y, z, w){
  const c=document.createElement('canvas'); c.width=512; c.height=128; const g=c.getContext('2d');
  g.font='500 44px IBM Plex Sans, sans-serif'; g.textAlign='center'; g.textBaseline='middle';
  const dark = scene.background.r<0.5;
  g.fillStyle = dark?'rgba(30,34,44,.85)':'rgba(255,255,255,.85)'; const tw=g.measureText(text).width+40; g.fillRect(256-tw/2,24,tw,80);
  g.fillStyle = dark?'#dce6f7':'#1a2a44'; g.fillText(text,256,64);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false})); const sc=Math.min(2.2, Math.max(1.2, w*0.4)); s.scale.set(sc, sc/4, 1); s.position.set(x,y+0.4,z); s.renderOrder=10; s.userData.label=true; houseGroup.add(s); labelSprites.push(s);
}

/* ============================================================
   2D technical floor plan (SVG)
   ============================================================ */
const plan = { zoom:1, px:0, py:0 };
function planSVG(m, opts){
  opts = Object.assign({forExport:false, theme:'light'}, opts||{});
  const S=100; // 1 m = 100 px
  const b=bounds(m); const t = state.opts.thick?0.15:0; const T=t*S;
  const margin=1.6*S;
  const vb={x:b.x*S-margin, y:b.y*S-margin, w:b.w*S+margin*2, h:b.h*S+margin*2+0.9*S};
  const dark = opts.theme==='dark' && !opts.forExport;
  const ink = dark?'#c9d6ec':'#1a2a44', paper=dark?'#1d2129':'#fbfaf6', grid=dark?'#2a3140':'#e3e8f0', fill=dark?'#262c36':'#ffffff', furnInk=dark?'#8ea4c9':'#4a5e82';
  const L=[];
  L.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" font-family="IBM Plex Mono, Menlo, monospace">`);
  L.push(`<rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="${paper}"/>`);
  // grid 1 m
  L.push(`<g stroke="${grid}" stroke-width="1">`);
  for (let gx=Math.floor((vb.x)/S)*S; gx<=vb.x+vb.w; gx+=S) L.push(`<line x1="${gx}" y1="${vb.y}" x2="${gx}" y2="${vb.y+vb.h}"/>`);
  for (let gy=Math.floor((vb.y)/S)*S; gy<=vb.y+vb.h; gy+=S) L.push(`<line x1="${vb.x}" y1="${gy}" x2="${vb.x+vb.w}" y2="${gy}"/>`);
  L.push(`</g>`);
  // rooms: fill + hatch per floor type
  for (const r of m.rooms){ L.push(`<rect x="${r.x*S}" y="${r.y*S}" width="${r.w*S}" height="${r.h*S}" fill="${fill}" stroke="none"/>`); }
  // walls
  const segs = wallSegments(m);
  L.push(`<g stroke="${ink}" stroke-linecap="square">`);
  for (const s of segs){
    for (const p of wallPieces(s, m.wallHeight)){
      if (p.y0>0.001) continue; // only full-height / sill parts draw as wall line in plan; windows get own symbol
      const a=p.a*S, bq=p.b*S, c=s.c*S;
      if (T>0){ // double line with thickness
        if (s.o==='H') L.push(`<rect x="${a}" y="${c-T/2}" width="${bq-a}" height="${T}" fill="${ink}" fill-opacity="0.15" stroke-width="2"/>`); else L.push(`<rect x="${c-T/2}" y="${a}" width="${T}" height="${bq-a}" fill="${ink}" fill-opacity="0.15" stroke-width="2"/>`);
      } else {
        if (s.o==='H') L.push(`<line x1="${a}" y1="${c}" x2="${bq}" y2="${c}" stroke-width="7"/>`); else L.push(`<line x1="${c}" y1="${a}" x2="${c}" y2="${bq}" stroke-width="7"/>`);
      }
    }
    for (const o of s.ops){
      const oa=Math.max(s.a,o.a)*S, ob=Math.min(s.b,o.b)*S, c=s.c*S; const len=ob-oa; if(len<=0) continue;
      const ww = Math.max(T,7);
      if (o.type==='window'){ // triple line window symbol
        const lines = [-ww/2,0,ww/2];
        for (const d of lines){ if (s.o==='H') L.push(`<line x1="${oa}" y1="${c+d}" x2="${ob}" y2="${c+d}" stroke-width="1.5"/>`); else L.push(`<line x1="${c+d}" y1="${oa}" x2="${c+d}" y2="${ob}" stroke-width="1.5"/>`); }
        if (s.o==='H'){ L.push(`<line x1="${oa}" y1="${c-ww/2}" x2="${oa}" y2="${c+ww/2}" stroke-width="1.5"/><line x1="${ob}" y1="${c-ww/2}" x2="${ob}" y2="${c+ww/2}" stroke-width="1.5"/>`); } else { L.push(`<line x1="${c-ww/2}" y1="${oa}" x2="${c+ww/2}" y2="${oa}" stroke-width="1.5"/><line x1="${c-ww/2}" y1="${ob}" x2="${c+ww/2}" y2="${ob}" stroke-width="1.5"/>`); }
      } else if (o.type==='door'){
        // jamb ticks + swing arc (door leaf drawn open 90°)
        if (s.o==='H'){ L.push(`<line x1="${oa}" y1="${c-ww/2}" x2="${oa}" y2="${c+ww/2}" stroke-width="1.5"/><line x1="${ob}" y1="${c-ww/2}" x2="${ob}" y2="${c+ww/2}" stroke-width="1.5"/>`);
          if (state.opts.swing){ L.push(`<line x1="${oa}" y1="${c}" x2="${oa}" y2="${c+len}" stroke-width="1.2"/><path d="M ${oa} ${c+len} A ${len} ${len} 0 0 0 ${ob} ${c}" fill="none" stroke-width="1" stroke-dasharray="4 3"/>`); } }
        else { L.push(`<line x1="${c-ww/2}" y1="${oa}" x2="${c+ww/2}" y2="${oa}" stroke-width="1.5"/><line x1="${c-ww/2}" y1="${ob}" x2="${c+ww/2}" y2="${ob}" stroke-width="1.5"/>`);
          if (state.opts.swing){ L.push(`<line x1="${c}" y1="${oa}" x2="${c+len}" y2="${oa}" stroke-width="1.2"/><path d="M ${c+len} ${oa} A ${len} ${len} 0 0 1 ${c} ${ob}" fill="none" stroke-width="1" stroke-dasharray="4 3"/>`); } }
      } else { // passage: thin dashed line across the gap
        if (s.o==='H') L.push(`<line x1="${oa}" y1="${c}" x2="${ob}" y2="${c}" stroke-width="1" stroke-dasharray="6 4"/>`); else L.push(`<line x1="${c}" y1="${oa}" x2="${c}" y2="${ob}" stroke-width="1" stroke-dasharray="6 4"/>`);
      }
    }
  }
  L.push(`</g>`);
  // furniture outlines
  if (!state.opts.empty){
    L.push(`<g stroke="${furnInk}" fill="${furnInk}" fill-opacity="0.08" stroke-width="1.2">`);
    for (const f of m.furniture){ const r=roomById(f.roomId); if(!r) continue; const cx=(r.x+f.x+f.w/2)*S, cy=(r.y+f.y+f.d/2)*S;
      L.push(`<g transform="translate(${cx} ${cy}) rotate(${f.rot})">`);
      const w=f.w*S, d=f.d*S;
      if (f.type==='plant'||f.type==='lamp') L.push(`<circle cx="0" cy="0" r="${Math.min(w,d)/2}"/>`);
      else if (f.type==='toilet') L.push(`<rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d*0.3}"/><ellipse cx="0" cy="${d*0.15}" rx="${w*0.45}" ry="${d*0.33}"/>`);
      else if (f.type==='bed') L.push(`<rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}"/><rect x="${-w/2+6}" y="${-d/2+6}" width="${w/2-9}" height="${d*0.2}" fill="none"/><rect x="${3}" y="${-d/2+6}" width="${w/2-9}" height="${d*0.2}" fill="none"/><line x1="${-w/2}" y1="${-d/2+d*0.3}" x2="${w/2}" y2="${-d/2+d*0.3}"/>`);
      else if (f.type==='sofa'||f.type==='armchair') L.push(`<rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}" rx="4"/><rect x="${-w/2+10}" y="${-d/2+18}" width="${w-20}" height="${d-24}" fill="none"/>`);
      else if (f.type==='rug') L.push(`<rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}" fill="none" stroke-dasharray="5 4"/>`);
      else if (f.type==='sink'||f.type==='vanity') L.push(`<rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}"/><ellipse cx="0" cy="0" rx="${w*0.3}" ry="${d*0.3}" fill="none"/>`);
      else if (f.type==='stove') L.push(`<rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}"/><circle cx="${-w*0.25}" cy="${-d*0.25}" r="${w*0.14}" fill="none"/><circle cx="${w*0.25}" cy="${-d*0.25}" r="${w*0.14}" fill="none"/><circle cx="${-w*0.25}" cy="${d*0.25}" r="${w*0.14}" fill="none"/><circle cx="${w*0.25}" cy="${d*0.25}" r="${w*0.14}" fill="none"/>`);
      else if (f.type==='bathtub') L.push(`<rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}" rx="6"/><rect x="${-w/2+8}" y="${-d/2+8}" width="${w-16}" height="${d-16}" rx="12" fill="none"/>`);
      else if (f.type==='dining_table'||f.type==='table'||f.type==='coffee_table'||f.type==='desk') L.push(`<rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}"/>`);
      else if (f.type==='chair') L.push(`<rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}" rx="3"/><line x1="${-w/2}" y1="${-d/2+4}" x2="${w/2}" y2="${-d/2+4}" stroke-width="2.5"/>`);
      else L.push(`<rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}"/>${(f.type==='wardrobe'||f.type==='cabinet'||f.type==='bookshelf'||f.type==='kitchen_counter')?`<line x1="${-w/2}" y1="${-d/2}" x2="${w/2}" y2="${d/2}" stroke-width="0.6"/><line x1="${-w/2}" y1="${d/2}" x2="${w/2}" y2="${-d/2}" stroke-width="0.6"/>`:''}`);
      if (w>60 && d>30 && f.type!=='rug') L.push(`<text x="0" y="3" font-size="9" text-anchor="middle" fill="${furnInk}" stroke="none">${esc(f.label).slice(0,16)}</text>`);
      L.push(`</g>`);
    }
    L.push(`</g>`);
  }
  // room labels
  for (const r of m.rooms){ const cx=(r.x+r.w/2)*S, cy=(r.y+r.h/2)*S; const area=r.w*r.h;
    L.push(`<text x="${cx}" y="${cy-8}" font-size="13" font-weight="500" text-anchor="middle" fill="${ink}" font-family="IBM Plex Sans, sans-serif">${esc(r.name.toUpperCase())}</text>`);
    L.push(`<text x="${cx}" y="${cy+8}" font-size="10" text-anchor="middle" fill="${ink}">${fmtLen(r.w)} × ${fmtLen(r.h)} · ${fmtArea(area)}</text>`);
  }
  // dimension lines: overall + per-room columns along top, rows along left
  const dimColor=ink;
  const dim = (x1,y1,x2,y2,label,offset,horiz)=>{ // offset: distance from edge
    const ext=10;
    if (horiz){ const y=y1-offset; L.push(`<line x1="${x1}" y1="${y1-6}" x2="${x1}" y2="${y-ext}" stroke="${dimColor}" stroke-width="0.8"/><line x1="${x2}" y1="${y1-6}" x2="${x2}" y2="${y-ext}" stroke="${dimColor}" stroke-width="0.8"/><line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${dimColor}" stroke-width="0.8"/><line x1="${x1-4}" y1="${y+4}" x2="${x1+4}" y2="${y-4}" stroke="${dimColor}" stroke-width="1.2"/><line x1="${x2-4}" y1="${y+4}" x2="${x2+4}" y2="${y-4}" stroke="${dimColor}" stroke-width="1.2"/><text x="${(x1+x2)/2}" y="${y-4}" font-size="10" text-anchor="middle" fill="${dimColor}">${label}</text>`); }
    else { const x=x1-offset; L.push(`<line x1="${x1-6}" y1="${y1}" x2="${x-ext}" y2="${y1}" stroke="${dimColor}" stroke-width="0.8"/><line x1="${x1-6}" y1="${y2}" x2="${x-ext}" y2="${y2}" stroke="${dimColor}" stroke-width="0.8"/><line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${dimColor}" stroke-width="0.8"/><line x1="${x-4}" y1="${y1+4}" x2="${x+4}" y2="${y1-4}" stroke="${dimColor}" stroke-width="1.2"/><line x1="${x-4}" y1="${y2+4}" x2="${x+4}" y2="${y2-4}" stroke="${dimColor}" stroke-width="1.2"/><text transform="translate(${x-4} ${(y1+y2)/2}) rotate(-90)" font-size="10" text-anchor="middle" fill="${dimColor}">${label}</text>`); }
  };
  if (m.rooms.length){
    // chained dims along top: unique x breakpoints
    const xs=[...new Set(m.rooms.flatMap(r=>[r.x,r.x+r.w]).map(v=>Math.round(v*1000)/1000))].sort((a,b)=>a-b);
    for (let i=0;i<xs.length-1;i++) dim(xs[i]*S,b.y*S,xs[i+1]*S,b.y*S,fmtLen(xs[i+1]-xs[i]),40,true);
    dim(b.x*S,b.y*S,(b.x+b.w)*S,b.y*S,fmtLen(b.w),80,true);
    const ys=[...new Set(m.rooms.flatMap(r=>[r.y,r.y+r.h]).map(v=>Math.round(v*1000)/1000))].sort((a,b)=>a-b);
    for (let i=0;i<ys.length-1;i++) dim(b.x*S,ys[i]*S,b.x*S,ys[i+1]*S,fmtLen(ys[i+1]-ys[i]),40,false);
    dim(b.x*S,b.y*S,b.x*S,(b.y+b.h)*S,fmtLen(b.h),80,false);
  }
  // north arrow + scale bar + title
  const nx=vb.x+vb.w-60, ny=vb.y+50;
  L.push(`<g stroke="${ink}" fill="${ink}"><line x1="${nx}" y1="${ny+30}" x2="${nx}" y2="${ny-25}" stroke-width="1.5"/><polygon points="${nx},${ny-32} ${nx-7},${ny-14} ${nx+7},${ny-14}"/><text x="${nx}" y="${ny+45}" font-size="11" text-anchor="middle" stroke="none">N</text></g>`);
  const sbx=vb.x+30, sby=vb.y+vb.h-40;
  L.push(`<g stroke="${ink}" fill="${ink}">`); for (let i=0;i<4;i++) L.push(`<rect x="${sbx+i*S/2}" y="${sby}" width="${S/2}" height="6" fill="${i%2?paper:ink}" stroke-width="0.8"/>`); L.push(`<text x="${sbx}" y="${sby-4}" font-size="9" stroke="none">0</text><text x="${sbx+S}" y="${sby-4}" font-size="9" stroke="none" text-anchor="middle">${state.opts.units==='ft'?"3'-3\"":'1 m'}</text><text x="${sbx+2*S}" y="${sby-4}" font-size="9" stroke="none" text-anchor="middle">${state.opts.units==='ft'?"6'-7\"":'2 m'}</text></g>`);
  L.push(`<text x="${vb.x+30}" y="${vb.y+vb.h-62}" font-size="13" font-weight="500" fill="${ink}" font-family="IBM Plex Sans, sans-serif">${esc(m.name)} — FLOOR PLAN</text>`);
  L.push(`<text x="${vb.x+30}" y="${vb.y+vb.h-14}" font-size="9" fill="${ink}">Scale 1:100 at A3 · wall height ${fmtLen(m.wallHeight)} · walls ${state.opts.thick?'150 mm nominal':'centreline (no thickness)'} · doors shown as openings · ${m.rooms.length} rooms · ${fmtArea(m.rooms.reduce((a,r)=>a+r.w*r.h,0))} total</text>`);
  L.push(`</svg>`);
  return {svg:L.join('\n'), vb};
}
function esc(s){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function renderPlan(){
  if (!state.model) return; const wrap=$('planwrap'); if (wrap.hidden) return;
  const dark = document.documentElement.dataset.theme==='dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const {svg, vb} = planSVG(state.model,{theme:dark?'dark':'light'});
  wrap.innerHTML = svg; const el=wrap.firstElementChild; plan.vb=vb; applyPlanView();
}
function applyPlanView(){ const el=$('planwrap').firstElementChild; if(!el||!plan.vb) return; const vb=plan.vb; const w=vb.w/plan.zoom, h=vb.h/plan.zoom; el.setAttribute('viewBox', `${vb.x+vb.w/2-w/2-plan.px} ${vb.y+vb.h/2-h/2-plan.py} ${w} ${h}`); }
function setupPlanControls(){
  const wrap=$('planwrap'); let last=null; const ptrs=new Map(); let pinch=null;
  wrap.addEventListener('pointerdown', e=>{ wrap.setPointerCapture(e.pointerId); ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY}); last={x:e.clientX,y:e.clientY}; if(ptrs.size===2){ const [a,b]=[...ptrs.values()]; pinch=Math.hypot(a.x-b.x,a.y-b.y);} });
  wrap.addEventListener('pointermove', e=>{ if(!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY}); if(ptrs.size===2){ const [a,b]=[...ptrs.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); plan.zoom=Math.max(0.3,Math.min(8,plan.zoom*d/pinch)); pinch=d; applyPlanView(); return; } if(!last) return; const sc=(plan.vb.w/plan.zoom)/wrap.clientWidth; plan.px+=(e.clientX-last.x)*sc; plan.py+=(e.clientY-last.y)*sc; last={x:e.clientX,y:e.clientY}; applyPlanView(); });
  const end=e=>{ ptrs.delete(e.pointerId); if(!ptrs.size){last=null;pinch=null;} };
  wrap.addEventListener('pointerup',end); wrap.addEventListener('pointercancel',end);
  wrap.addEventListener('wheel', e=>{ e.preventDefault(); plan.zoom=Math.max(0.3,Math.min(8,plan.zoom*Math.exp(-e.deltaY*0.0015))); applyPlanView(); },{passive:false});
  $('planFit').onclick=()=>{ plan.zoom=1; plan.px=0; plan.py=0; applyPlanView(); };
  $('planZoomIn').onclick=()=>{ plan.zoom=Math.min(8,plan.zoom*1.25); applyPlanView(); };
  $('planZoomOut').onclick=()=>{ plan.zoom=Math.max(0.3,plan.zoom/1.25); applyPlanView(); };
}

/* ============================================================
   Exporters
   ============================================================ */
function collectTriangles(){ // world-space triangles from houseGroup (skip sprites/transparent glass)
  houseGroup.updateMatrixWorld(true); const tris=[]; const v=new THREE.Vector3();
  houseGroup.traverse(o=>{ if(!o.isMesh||o.isSprite) return; if (o.material && o.material.transparent && o.material.opacity<0.5) return; const g=o.geometry; const pos=g.attributes.position; if(!pos) return; const idx=g.index;
    const n = idx? idx.count : pos.count; const get=i=>{ const k=idx?idx.getX(i):i; v.fromBufferAttribute(pos,k).applyMatrix4(o.matrixWorld); return [v.x,v.y,v.z]; };
    for (let i=0;i<n;i+=3){ tris.push([get(i),get(i+1),get(i+2)]); } });
  return tris;
}
function toSTL(){ // binary STL, Z-up (CAD convention): swap y/z, in millimetres
  const tris=collectTriangles(); const buf=new ArrayBuffer(84+tris.length*50); const dv=new DataView(buf); const hdr='HouseForge Studio binary STL (mm, Z up)'; for(let i=0;i<80;i++) dv.setUint8(i, i<hdr.length?hdr.charCodeAt(i):0); dv.setUint32(80,tris.length,true); let off=84;
  const conv=p=>[p[0]*1000, p[2]*1000, p[1]*1000]; // x, z→y(depth), y→z(up)
  for (const t of tris){ const a=conv(t[0]), b=conv(t[1]), c=conv(t[2]); const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], w=[c[0]-a[0],c[1]-a[1],c[2]-a[2]]; let n=[u[1]*w[2]-u[2]*w[1], u[2]*w[0]-u[0]*w[2], u[0]*w[1]-u[1]*w[0]]; const l=Math.hypot(...n)||1; n=n.map(x=>x/l);
    // flip winding since y/z swap mirrors
    for (const x of n) { dv.setFloat32(off,x,true); off+=4; } for (const p of [a,c,b]) for (const x of p){ dv.setFloat32(off,x,true); off+=4; } dv.setUint16(off,0,true); off+=2; }
  return buf;
}
function toOBJ(){ const tris=collectTriangles(); const out=['# HouseForge Studio OBJ (metres, Y up)','o house']; let n=0; const lines=[]; for (const t of tris){ for (const p of t) out.push(`v ${p[0].toFixed(4)} ${p[1].toFixed(4)} ${p[2].toFixed(4)}`); lines.push(`f ${n+1} ${n+2} ${n+3}`); n+=3; } return out.concat(lines).join('\n'); }
function toDXF(m){ // R12-style ASCII DXF in millimetres, plan view
  const E=[]; const S=1000; const t=state.opts.thick?0.15:0;
  const line=(x1,y1,x2,y2,layer)=>E.push('0','LINE','8',layer,'10',(x1*S).toFixed(1),'20',(-y1*S).toFixed(1),'30','0','11',(x2*S).toFixed(1),'21',(-y2*S).toFixed(1),'31','0');
  const text=(x,y,h,s,layer,rot)=>E.push('0','TEXT','8',layer,'10',(x*S).toFixed(1),'20',(-y*S).toFixed(1),'30','0','40',(h*S).toFixed(1),'1',s,'50',String(rot||0));
  const arc=(cx,cy,r,a0,a1,layer)=>E.push('0','ARC','8',layer,'10',(cx*S).toFixed(1),'20',(-cy*S).toFixed(1),'30','0','40',(r*S).toFixed(1),'50',String(a0),'51',String(a1));
  const rect=(x,y,w,h,layer)=>{ line(x,y,x+w,y,layer); line(x+w,y,x+w,y+h,layer); line(x+w,y+h,x,y+h,layer); line(x,y+h,x,y,layer); };
  for (const s of wallSegments(m)){
    for (const p of wallPieces(s,m.wallHeight)){ if (p.y0>0.001) continue;
      if (t>0){ if (s.o==='H') rect(p.a,s.c-t/2,p.b-p.a,t,'WALLS'); else rect(s.c-t/2,p.a,t,p.b-p.a,'WALLS'); }
      else { if (s.o==='H') line(p.a,s.c,p.b,s.c,'WALLS'); else line(s.c,p.a,s.c,p.b,'WALLS'); } }
    for (const o of s.ops){ const oa=Math.max(s.a,o.a), ob=Math.min(s.b,o.b); if(ob<=oa) continue; const len=ob-oa; const ww=Math.max(t,0.07);
      if (o.type==='window'){ for (const d of [-ww/2,0,ww/2]){ if (s.o==='H') line(oa,s.c+d,ob,s.c+d,'WINDOWS'); else line(s.c+d,oa,s.c+d,ob,'WINDOWS'); } }
      else if (o.type==='door'){ if (s.o==='H'){ line(oa,s.c,oa,s.c+len,'DOORS'); arc(oa,s.c,len,270,0,'DOORS'); } else { line(s.c,oa,s.c+len,oa,'DOORS'); arc(s.c,oa,len,0,90,'DOORS'); } }
      else { if (s.o==='H') line(oa,s.c,ob,s.c,'OPENINGS'); else line(s.c,oa,s.c,ob,'OPENINGS'); } }
  }
  if (!state.opts.empty) for (const f of m.furniture){ const r=roomById(f.roomId); if(!r) continue; const cx=r.x+f.x+f.w/2, cy=r.y+f.y+f.d/2; const a=f.rot*Math.PI/180; const c=Math.cos(a), sn=Math.sin(a); const pts=[[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]].map(([x,y])=>[cx+x*c-y*sn, cy+x*sn+y*c]); for(let i=0;i<4;i++){ const p=pts[i], q=pts[(i+1)%4]; line(p[0],p[1],q[0],q[1],'FURNITURE'); } text(cx,cy,0.08,f.label,'FURNITURE'); }
  for (const r of m.rooms){ text(r.x+r.w/2-r.name.length*0.07, r.y+r.h/2-0.1, 0.18, r.name.toUpperCase(),'TEXT'); text(r.x+r.w/2-0.6, r.y+r.h/2+0.2, 0.1, `${r.w.toFixed(2)} x ${r.h.toFixed(2)} m  ${(r.w*r.h).toFixed(1)} m2`,'TEXT'); }
  const b=bounds(m); const xs=[...new Set(m.rooms.flatMap(r=>[r.x,r.x+r.w]))].sort((a,b)=>a-b); const ys=[...new Set(m.rooms.flatMap(r=>[r.y,r.y+r.h]))].sort((a,b)=>a-b);
  for (let i=0;i<xs.length-1;i++){ const y=b.y-0.5; line(xs[i],y,xs[i+1],y,'DIMS'); line(xs[i],b.y-0.1,xs[i],y-0.1,'DIMS'); line(xs[i+1],b.y-0.1,xs[i+1],y-0.1,'DIMS'); text((xs[i]+xs[i+1])/2-0.2,y-0.05,0.1,`${((xs[i+1]-xs[i])*1000).toFixed(0)}`,'DIMS'); }
  for (let i=0;i<ys.length-1;i++){ const x=b.x-0.5; line(x,ys[i],x,ys[i+1],'DIMS'); line(b.x-0.1,ys[i],x-0.1,ys[i],'DIMS'); line(b.x-0.1,ys[i+1],x-0.1,ys[i+1],'DIMS'); text(x-0.05,(ys[i]+ys[i+1])/2+0.2,0.1,`${((ys[i+1]-ys[i])*1000).toFixed(0)}`,'DIMS',90); }
  line(b.x,b.y-0.9,b.x+b.w,b.y-0.9,'DIMS'); text(b.x+b.w/2-0.3,b.y-0.95,0.12,`${(b.w*1000).toFixed(0)}`,'DIMS');
  line(b.x-0.9,b.y,b.x-0.9,b.y+b.h,'DIMS'); text(b.x-0.95,b.y+b.h/2+0.3,0.12,`${(b.h*1000).toFixed(0)}`,'DIMS',90);
  text(b.x, b.y+b.h+0.6, 0.2, `${m.name.toUpperCase()} - FLOOR PLAN - mm`, 'TEXT');
  const layers=['WALLS','WINDOWS','DOORS','OPENINGS','FURNITURE','TEXT','DIMS']; const colors={WALLS:7,WINDOWS:5,DOORS:3,OPENINGS:8,FURNITURE:4,TEXT:2,DIMS:1};
  const H=['0','SECTION','2','HEADER','9','$ACADVER','1','AC1009','9','$INSUNITS','70','4','0','ENDSEC','0','SECTION','2','TABLES','0','TABLE','2','LAYER','70',String(layers.length)];
  for (const l of layers) H.push('0','LAYER','2',l,'70','0','62',String(colors[l]),'6','CONTINUOUS');
  H.push('0','ENDTAB','0','ENDSEC','0','SECTION','2','ENTITIES');
  return H.concat(E,['0','ENDSEC','0','EOF']).join('\r\n');
}
function snapshotPNG(){ updateCamera(); renderer.render(scene,camera); return renderer.domElement.toDataURL('image/png'); }
async function toPDF(m){
  const doc = new jsPDF({orientation:'landscape', unit:'mm', format:'a3'});
  const PW=420, PH=297; const margin=15; const b=bounds(m);
  // frame + title block
  doc.setLineWidth(0.5); doc.rect(margin-5,margin-5,PW-2*margin+10,PH-2*margin+10);
  const tbH=28; doc.rect(margin-5,PH-margin+5-tbH,PW-2*margin+10,tbH);
  doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.text(`${m.name} — FLOOR PLAN`, margin, PH-margin+5-tbH+9);
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  doc.text(`Scale 1:100 · units ${state.opts.units==='ft'?'ft-in':'metres'} · wall height ${fmtLen(m.wallHeight)} · walls ${state.opts.thick?'150 mm nominal':'centreline'} · doors drawn as openings`, margin, PH-margin+5-tbH+16);
  doc.text(`Generated by HouseForge Studio · ${new Date().toISOString().slice(0,10)} · dimensions assumed from photographs; verify on site before construction`, margin, PH-margin+5-tbH+22);
  // plan at 1:100 → 1 m = 10 mm; centre in sheet
  const k=10; const availW=PW-2*margin, availH=PH-2*margin-tbH-10; let scale=1; if (b.w*k+40>availW || b.h*k+40>availH){ scale=Math.min((availW-40)/(b.w*k),(availH-40)/(b.h*k)); doc.text(`(drawing reduced to fit: 1:${Math.round(100/scale)})`, margin+300, PH-margin+5-tbH+16); }
  const ox = margin+ (availW-b.w*k*scale)/2 - b.x*k*scale + 10, oy = margin+ (availH-b.h*k*scale)/2 - b.y*k*scale + 10;
  const X=x=>ox+x*k*scale, Y=y=>oy+y*k*scale, Lm=l=>l*k*scale;
  const t=state.opts.thick?0.15:0;
  doc.setDrawColor(20,40,70);
  for (const s of wallSegments(m)){
    for (const p of wallPieces(s,m.wallHeight)){ if (p.y0>0.001) continue;
      if (t>0){ doc.setFillColor(200,205,215); if (s.o==='H') doc.rect(X(p.a),Y(s.c-t/2),Lm(p.b-p.a),Lm(t),'FD'); else doc.rect(X(s.c-t/2),Y(p.a),Lm(t),Lm(p.b-p.a),'FD'); }
      else { doc.setLineWidth(1.2); if (s.o==='H') doc.line(X(p.a),Y(s.c),X(p.b),Y(s.c)); else doc.line(X(s.c),Y(p.a),X(s.c),Y(p.b)); } }
    doc.setLineWidth(0.25);
    for (const o of s.ops){ const oa=Math.max(s.a,o.a), ob=Math.min(s.b,o.b); if(ob<=oa) continue; const len=ob-oa; const ww=Math.max(t,0.1);
      if (o.type==='window'){ for (const d of [-ww/2,0,ww/2]){ if (s.o==='H') doc.line(X(oa),Y(s.c+d),X(ob),Y(s.c+d)); else doc.line(X(s.c+d),Y(oa),X(s.c+d),Y(ob)); } }
      else if (o.type==='door' && state.opts.swing){ if (s.o==='H'){ doc.line(X(oa),Y(s.c),X(oa),Y(s.c+len)); arcPDF(doc,X(oa),Y(s.c),Lm(len),0,90); } else { doc.line(X(s.c),Y(oa),X(s.c+len),Y(oa)); arcPDF(doc,X(s.c),Y(oa),Lm(len),270,360); } }
      else if (o.type==='passage'){ doc.setLineDashPattern([1.5,1],0); if (s.o==='H') doc.line(X(oa),Y(s.c),X(ob),Y(s.c)); else doc.line(X(s.c),Y(oa),X(s.c),Y(ob)); doc.setLineDashPattern([],0); } }
  }
  if (!state.opts.empty){ doc.setDrawColor(90,110,150); doc.setLineWidth(0.2); for (const f of m.furniture){ const r=roomById(f.roomId); if(!r) continue; const cx=r.x+f.x+f.w/2, cy=r.y+f.y+f.d/2; const a=f.rot*Math.PI/180; const c=Math.cos(a), sn=Math.sin(a); const pts=[[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]].map(([x,y])=>[X(cx+x*c-y*sn), Y(cy+x*sn+y*c)]); for(let i=0;i<4;i++){ const p=pts[i], q=pts[(i+1)%4]; doc.line(p[0],p[1],q[0],q[1]); } if (f.w>0.8&&f.d>0.4){ doc.setFontSize(5); doc.setTextColor(90,110,150); doc.text(f.label.slice(0,18), X(cx), Y(cy), {align:'center'}); } } }
  doc.setTextColor(20,40,70);
  for (const r of m.rooms){ doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.text(r.name.toUpperCase(), X(r.x+r.w/2), Y(r.y+r.h/2)-1.5, {align:'center'}); doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.text(`${fmtLen(r.w)} x ${fmtLen(r.h)}  ${fmtArea(r.w*r.h)}`, X(r.x+r.w/2), Y(r.y+r.h/2)+2, {align:'center'}); }
  // dims
  doc.setLineWidth(0.2); doc.setFontSize(6);
  const xs=[...new Set(m.rooms.flatMap(r=>[r.x,r.x+r.w]))].sort((a,b)=>a-b); const ys=[...new Set(m.rooms.flatMap(r=>[r.y,r.y+r.h]))].sort((a,b)=>a-b);
  const dimH=(x1,x2,yv,off,label)=>{ const y=Y(yv)-off; doc.line(X(x1),Y(yv)-2,X(x1),y-2); doc.line(X(x2),Y(yv)-2,X(x2),y-2); doc.line(X(x1),y,X(x2),y); doc.line(X(x1)-1,y+1,X(x1)+1,y-1); doc.line(X(x2)-1,y+1,X(x2)+1,y-1); doc.text(label,(X(x1)+X(x2))/2,y-1,{align:'center'}); };
  const dimV=(y1,y2,xv,off,label)=>{ const x=X(xv)-off; doc.line(X(xv)-2,Y(y1),x-2,Y(y1)); doc.line(X(xv)-2,Y(y2),x-2,Y(y2)); doc.line(x,Y(y1),x,Y(y2)); doc.line(x-1,Y(y1)+1,x+1,Y(y1)-1); doc.line(x-1,Y(y2)+1,x+1,Y(y2)-1); doc.text(label,x-1,(Y(y1)+Y(y2))/2,{align:'center',angle:90}); };
  for (let i=0;i<xs.length-1;i++) dimH(xs[i],xs[i+1],b.y,8,fmtLen(xs[i+1]-xs[i])); dimH(b.x,b.x+b.w,b.y,16,fmtLen(b.w));
  for (let i=0;i<ys.length-1;i++) dimV(ys[i],ys[i+1],b.x,8,fmtLen(ys[i+1]-ys[i])); dimV(b.y,b.y+b.h,b.x,16,fmtLen(b.h));
  // north arrow
  const nx=PW-margin-10, ny=margin+12; doc.setLineWidth(0.4); doc.line(nx,ny+8,nx,ny-6); doc.triangle(nx,ny-9,nx-2.5,ny-3,nx+2.5,ny-3,'F'); doc.setFontSize(8); doc.text('N',nx,ny+13,{align:'center'});
  // page 2: 3D view
  doc.addPage('a3','landscape'); doc.rect(margin-5,margin-5,PW-2*margin+10,PH-2*margin+10);
  doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text(`${m.name} — 3D VIEW (${state.mode})`, margin, margin+5);
  const was=state.tab; const png=snapshotPNG(); const img=new Image(); await new Promise(res=>{ img.onload=res; img.src=png; });
  const iw=PW-2*margin, ih=iw*img.height/img.width; const fitH=Math.min(ih, PH-2*margin-20); const fitW=fitH*img.width/img.height; doc.addImage(png,'PNG',margin+(iw-fitW)/2,margin+12,fitW,fitH);
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.text('Open-ceiling isometric render. Furniture dimensions are standard assumptions unless confirmed by close-up photographs.', margin, PH-margin);
  // page 3: schedule
  doc.addPage('a3','landscape'); doc.rect(margin-5,margin-5,PW-2*margin+10,PH-2*margin+10);
  doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text('ROOM & FURNITURE SCHEDULE', margin, margin+5); doc.setFont('helvetica','normal'); doc.setFontSize(8);
  let yy=margin+15; doc.text('Room', margin, yy); doc.text('Size', margin+70, yy); doc.text('Area', margin+120, yy); doc.text('Floor', margin+160, yy); doc.text('Openings', margin+200, yy); yy+=5;
  for (const r of m.rooms){ doc.text(r.name, margin, yy); doc.text(`${fmtLen(r.w)} x ${fmtLen(r.h)}`, margin+70, yy); doc.text(fmtArea(r.w*r.h), margin+120, yy); doc.text(r.floor, margin+160, yy); doc.text(r.openings.map(o=>`${o.type} ${o.wall} ${fmtLen(o.width)}`).join(', ').slice(0,90), margin+200, yy); yy+=4.5; if (yy>PH-margin-10){ doc.addPage('a3','landscape'); yy=margin+10; } }
  yy+=6; doc.setFont('helvetica','bold'); doc.text('Item', margin, yy); doc.text('Room', margin+70, yy); doc.text('W x D x H', margin+120, yy); doc.text('Confidence', margin+180, yy); doc.setFont('helvetica','normal'); yy+=5;
  for (const f of m.furniture){ const r=roomById(f.roomId); doc.text(f.label, margin, yy); doc.text(r?r.name:'', margin+70, yy); doc.text(`${fmtLen(f.w)} x ${fmtLen(f.d)} x ${fmtLen(f.h)}`, margin+120, yy); doc.text(`${Math.round(f.confidence*100)}%${f.confidence<0.6?' (needs photo)':''}`, margin+180, yy); yy+=4.5; if (yy>PH-margin-10){ doc.addPage('a3','landscape'); yy=margin+10; } }
  return doc.output('arraybuffer');
}
function arcPDF(doc,cx,cy,r,a0,a1){ const n=16; let prev=null; for(let i=0;i<=n;i++){ const a=(a0+(a1-a0)*i/n)*Math.PI/180; const p=[cx+r*Math.cos(a), cy+r*Math.sin(a)]; if(prev) doc.line(prev[0],prev[1],p[0],p[1]); prev=p; } }
function dataURLtoBlob(u){ const [h,b]=u.split(','); const bin=atob(b); const arr=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); return new Blob([arr],{type:h.match(/:(.*?);/)[1]}); }
async function saveFile(filename, data, mime){
  if (state.downloads){ try { await state.downloads.save({filename, data}); toast(`Saved ${filename}`); return; } catch(e){ if (e && e.code==='declined') { toast('Save cancelled'); return; } toast(`Could not save: ${e && e.code || 'error'}`, true); return; } }
  // Outside claude.ai (local file): regular download
  const blob = data instanceof Blob ? data : new Blob([data],{type:mime||'application/octet-stream'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},1000); toast(`Downloaded ${filename}`);
}
async function doExport(kind){
  const m=state.model; if(!m) return; const base=(m.name||'house').replace(/[^a-z0-9]+/gi,'_').toLowerCase(); setBusy(true);
  try {
    if (kind==='svg') await saveFile(base+'_plan.svg', planSVG(m,{forExport:true}).svg, 'image/svg+xml');
    else if (kind==='json') await saveFile(base+'_model.json', JSON.stringify(m,null,2), 'application/json');
    else if (kind==='png') { if (state.tab!=='3d') switchTab('3d'); await saveFile(base+'_3d.png', dataURLtoBlob(snapshotPNG()), 'image/png'); }
    else if (kind==='pdf') await saveFile(base+'_drawings.pdf', new Blob([await toPDF(m)],{type:'application/pdf'}), 'application/pdf');
    else if (kind==='stl'||kind==='obj'||kind==='dxf'){
      const data = kind==='stl'? toSTL() : kind==='obj'? toOBJ() : toDXF(m); const ext=kind;
      if (state.downloads){ const zip=new JSZip(); zip.file(`${base}_${kind==='dxf'?'plan':'model'}.${ext}`, data); zip.file('README.txt', readme(m)); await saveFile(`${base}_${ext}.zip`, await zip.generateAsync({type:'blob'})); }
      else await saveFile(`${base}_${kind==='dxf'?'plan':'model'}.${ext}`, data, 'application/octet-stream');
    } else if (kind==='zip'){
      const zip=new JSZip(); zip.file(`${base}_model.stl`, toSTL()); zip.file(`${base}_model.obj`, toOBJ()); zip.file(`${base}_plan.dxf`, toDXF(m)); zip.file(`${base}_plan.svg`, planSVG(m,{forExport:true}).svg); zip.file(`${base}_model.json`, JSON.stringify(m,null,2)); zip.file(`${base}_drawings.pdf`, await toPDF(m)); zip.file(`${base}_3d.png`, dataURLtoBlob(snapshotPNG())); zip.file('README.txt', readme(m));
      await saveFile(`${base}_houseforge.zip`, await zip.generateAsync({type:'blob'}));
    }
  } catch(e){ console.error(e); toast('Export failed: '+(e.message||e), true); }
  setBusy(false);
}
function readme(m){ return `HouseForge Studio export — ${m.name}\n\nFiles:\n  *_model.stl   binary STL, millimetres, Z up (3D printing / CAD)\n  *_model.obj   Wavefront OBJ, metres, Y up (Blender, SketchUp, Unity)\n  *_plan.dxf    AutoCAD DXF (R12), millimetres, layers WALLS / WINDOWS / DOORS / OPENINGS / FURNITURE / TEXT / DIMS\n  *_plan.svg    floor plan at 100 px per metre\n  *_drawings.pdf A3 sheet set: plan at 1:100, 3D view, schedules\n  *_model.json  the editable house model (re-import in HouseForge via 'Model JSON')\n\nDimensions are inferred from photographs and standard sizes; verify on site before construction.\n`; }

/* ============================================================
   UI
   ============================================================ */
function toast(msg, isErr){ addLog(msg, isErr?'err':'ai'); }
function addLog(text, cls){ const el=document.createElement('div'); el.className=cls||''; el.textContent=text; $('log').appendChild(el); $('log').scrollTop=$('log').scrollHeight; while($('log').children.length>40) $('log').firstChild.remove(); }
function setBusy(b){ state.busy=b; $('busyChip').hidden=!b; $('btnAnalyze').disabled = b || !state.photos.length; $('btnRefine').disabled = b || !state.photos.some(p=>!p.used); $('btnPrompt').disabled=b; $('btnSuggest').disabled=b; $('btnRedesign').disabled=b; $('btnStop').hidden=!b; }
function updateStatus(){ const m=state.model; if(!m) return; const b=bounds(m); const area=m.rooms.reduce((a,r)=>a+r.w*r.h,0); $('status').innerHTML = `<span>${esc(m.name)}</span><span>${m.rooms.length} rooms · ${fmtArea(area)}</span><span>footprint ${fmtLen(b.w)} × ${fmtLen(b.h)}</span><span>${m.furniture.length} furniture items</span>${m.notes?`<span>${esc(m.notes).slice(0,120)}</span>`:''}`; $('roomStats').textContent=`${m.rooms.length} · ${fmtArea(area)}`; $('furnCount').textContent=`${m.furniture.length} items`; }
function renderRooms(){ const m=state.model; const el=$('rooms'); el.innerHTML=''; for (const r of m.rooms){ const d=document.createElement('div'); d.className='room'; d.setAttribute('aria-current', state.selectedRoom===r.id?'true':'false'); d.innerHTML=`<span class="sw" style="background:${esc(r.wallColor)}"></span><span>${esc(r.name)}</span><span class="dim">${fmtLen(r.w)} × ${fmtLen(r.h)}</span>`; d.onclick=()=>{ state.selectedRoom = state.selectedRoom===r.id? null : r.id; renderRooms(); if(!state.opts.whole) rebuild3D(); const cx=r.x+r.w/2, cz=r.y+r.h/2; cam.target.set(cx,0.8,cz); cam.dist=Math.max(r.w,r.h)*1.6; }; el.appendChild(d); } }
function renderFurniture(){ const m=state.model; const el=$('furn'); el.innerHTML=''; for (const f of m.furniture){ const r=roomById(f.roomId); const d=document.createElement('div'); d.className='f'; d.innerHTML=`<span>${esc(f.label)} <span class="note">· ${esc(r?r.name:'?')}</span></span><span class="sz">${f.w.toFixed(2)}×${f.d.toFixed(2)}×${f.h.toFixed(2)}</span><span class="conf ${f.confidence<0.6?'low':''}" title="confidence ${Math.round(f.confidence*100)}%"><i style="width:${Math.round(f.confidence*100)}%"></i></span>`; el.appendChild(d); } }
function renderNeeds(){ const m=state.model; const list=[...(m.photoRequests||[])]; for (const f of m.furniture) if (f.confidence<0.6 || f.needsPhoto){ const r=roomById(f.roomId); if (!list.some(p=>p.subject===f.label)) list.push({subject:f.label, roomId:f.roomId, reason:`Low confidence (${Math.round(f.confidence*100)}%) — a close-up from the front and side would fix size and shape`, priority:'medium'}); }
  $('needSection').hidden = !list.length && !state.photos.some(p=>!p.used); $('needCount').textContent=`${list.length} items`; const el=$('needList'); el.innerHTML='';
  for (const p of list){ const r=p.roomId?roomById(p.roomId):null; const d=document.createElement('div'); d.className='item'; d.innerHTML=`<div><b>${esc(p.subject)}</b>${r?` <span class="note">· ${esc(r.name)}</span>`:''}<small>${esc(p.reason||'')}</small></div><button class="btn small">Add photo</button>`; d.querySelector('button').onclick=()=>{ $('photoTag').value='furniture'; $('photoRoom').value=r?r.name:''; $('fileIn').click(); }; el.appendChild(d); }
}
function renderPhotos(){ const el=$('photos'); el.innerHTML=''; for (const p of state.photos){ const d=document.createElement('div'); d.className='photo'; d.innerHTML=`<img alt=""><span class="tag">${esc((p.room?p.room+' · ':'')+p.tag)}${p.used?'':' · new'}</span><button class="x" title="Remove">×</button>`; d.querySelector('img').src=p.url; d.querySelector('.x').onclick=()=>{ URL.revokeObjectURL(p.url); state.photos=state.photos.filter(q=>q!==p); renderPhotos(); }; el.appendChild(d); } $('photoCount').textContent=`${state.photos.length} photos`; $('btnAnalyze').disabled=!state.photos.length||state.busy; $('btnRefine').disabled=state.busy||!state.photos.some(p=>!p.used)||!state.model; $('needSection').hidden = $('needList').children.length===0 && !state.photos.some(p=>!p.used); }
function refreshAll(){ updateStatus(); renderRooms(); renderFurniture(); renderNeeds(); rebuild3D(); renderPlan(); }
function setModel(m, note){ state.model=normalizeModel(m); if (state.model.mode && !note) setMode(state.model.mode, true); $('wallH').value=state.model.wallHeight; if (state.model.wallThickness>0){ state.opts.thick=true; $('tThick').checked=true; } refreshAll(); setView('iso'); if (note) addLog(note,'ai'); }
function setMode(mode, silent){ state.mode=mode; $('modeInterior').setAttribute('aria-pressed', mode==='interior'); $('modeExterior').setAttribute('aria-pressed', mode==='exterior'); if (state.model){ rebuild3D(); setView('iso'); } if(!silent) addLog(`Mode: ${mode}`); $('shotlist').innerHTML = shotList(mode); }
function switchTab(tab){ state.tab=tab; $('tab3d').setAttribute('aria-selected', tab==='3d'); $('tabPlan').setAttribute('aria-selected', tab==='plan'); $('planwrap').hidden = tab!=='plan'; $('gl').style.visibility = tab==='3d'?'visible':'hidden'; $('hud3d').hidden = tab!=='3d'; $('hudPlan').hidden = tab!=='plan'; if (tab==='plan') renderPlan(); }
function shotList(mode){ const items = mode==='exterior' ? ['Each facade straight-on from across the street (front, back, both sides)','Each corner of the house at 45°, showing two facades','Roof from a distance showing ridge and eaves','Front door and any porch, garage door, steps','Any window with a known size (e.g. standard 1.2 m wide) for scale','Chimney, dormers, extensions'] : ['Every room from each corner, camera at chest height','Each wall straight-on, including doors and windows','Doorways looking through into the next room (helps connect rooms)','Floor-to-ceiling shot of one wall with a door for scale','Each large furniture item from the front and from the side','Kitchen run end-to-end; bathroom fittings individually','Built-ins, radiators, stairs, fireplaces, odd angles'];
  return '<ul>'+items.map(i=>`<li><span>☐</span><span>${i}</span></li>`).join('')+'</ul>'; }

/* ---------- Photo intake ---------- */
async function addFiles(files){ const tag=$('photoTag').value, room=$('photoRoom').value.trim(); for (const f of files){ if(!f.type.startsWith('image/')) continue; const blob = await downscale(f); state.photos.push({id:'p'+Date.now()+Math.random().toString(36).slice(2,6), file:f, blob, url:URL.createObjectURL(blob), tag, room, used:false}); } renderPhotos(); if (state.model && state.photos.some(p=>!p.used)) $('needSection').hidden=false; }
async function downscale(file){ try { const bmp = await createImageBitmap(file); const max=1600; const s=Math.min(1, max/Math.max(bmp.width,bmp.height)); const c=document.createElement('canvas'); c.width=Math.round(bmp.width*s); c.height=Math.round(bmp.height*s); c.getContext('2d').drawImage(bmp,0,0,c.width,c.height); return await new Promise(res=>c.toBlob(res,'image/jpeg',0.88)); } catch(e){ return file; } }
$('fileIn').addEventListener('change', e=>{ addFiles([...e.target.files]); e.target.value=''; });
const drop=$('drop'); ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over');})); ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over');})); drop.addEventListener('drop', e=>addFiles([...e.dataTransfer.files]));
document.addEventListener('paste', e=>{ const fs=[...(e.clipboardData&&e.clipboardData.files||[])]; if (fs.length) addFiles(fs); });

/* ============================================================
   AI: photo analysis, refinement, revisions, suggestions, redesign
   ============================================================ */
const SCHEMA_DOC = `JSON schema (all lengths in METRES, plan coordinates: x to the right, y downwards, origin at the top-left of the whole house; rooms are axis-aligned rectangles that tile the plan and share edges where they touch):
{
 "name": string, "mode": "interior"|"exterior", "units": "m", "wallHeight": number, "wallThickness": 0,
 "rooms": [{ "id": string, "name": string, "x": number, "y": number, "w": number, "h": number,
            "floor": "wood"|"tile"|"carpet"|"concrete", "wallColor": "#hex",
            "openings": [{ "wall": "N"|"E"|"S"|"W", "offset": number (metres from the wall's start: N and S walls start at the room's left/x edge; E and W walls start at the room's top/y edge), "width": number,
                           "type": "door"|"window"|"passage", "sill": number (windows only, height of sill above floor), "height": number (opening height) }] }],
 "furniture": [{ "id": string, "roomId": string, "type": one of bed|sofa|armchair|chair|dining_table|table|coffee_table|desk|nightstand|dresser|wardrobe|cabinet|bookshelf|shelf|tv_stand|tv|kitchen_counter|kitchen_island|fridge|stove|oven|sink|toilet|bathtub|shower|vanity|washer|lamp|rug|plant|piano|box,
                "label": string, "x": number, "y": number (top-left of footprint RELATIVE to the room's top-left corner), "w": number (width along x), "d": number (depth along y), "h": number (height), "rot": 0|90|180|270 (rotation about the footprint centre; 0 = the item's back faces the room's N wall / its front faces +y), "color": "#hex", "confidence": 0..1, "needsPhoto": boolean }],
 "exterior": { "stories": integer, "storyHeight": number, "roof": "gable"|"hip"|"flat"|"shed", "pitch": degrees, "ridgeAxis": "x"|"z", "overhang": number, "wallColor": "#hex", "roofColor": "#hex", "trimColor": "#hex", "chimney": boolean,
               "windows": [{ "side": "N"|"E"|"S"|"W", "offset": number (metres from the left end of that facade when viewed from outside), "width": number, "height": number, "sill": number, "story": integer }],
               "door": { "side": "N"|"E"|"S"|"W", "offset": number, "width": number, "height": number } } | null,
 "photoRequests": [{ "subject": string, "roomId": string|null, "reason": string, "priority": "high"|"medium"|"low" }],
 "notes": string (one or two sentences on assumptions made)
}
Rules: a door between two rooms must be listed as an opening on BOTH rooms at the same wall position (room A wall E offset o ≡ room B wall W offset o, with matching width). Use standard sizes when unsure: doors 0.9 wide × 2.1 high, windows 1.2 × 1.2 with 0.9 sill, ceilings 2.4–2.7, sofas 2.2 × 0.9 × 0.8, double beds 1.6 × 2.0 × 0.55, kitchen counters 0.6 deep × 0.9 high, dining chairs 0.45 × 0.45 × 0.9, wardrobes 0.6 deep × 2.2 high. Keep furniture inside its room and not overlapping walls. Give every item a confidence; set needsPhoto true and add a photoRequest when size or shape is unclear. Reply with ONLY the JSON object.`;


function storedKey(){ try { return localStorage.getItem('hf_anthropic_key')||''; } catch(e){ return ''; } }
function refreshAIStatus(){
  const info = state.aiInfo||{}; const key = storedKey(); const chip=$('aiChip'), banner=$('aiBanner');
  if (info.configured){ chip.textContent='AI ready'; chip.className='chip ok'; banner.hidden=true; $('keyInfo').textContent='This site already has a server key, so you do not need your own. A key saved here is only used if the server key is removed.'; }
  else if (key){ chip.textContent='AI ready (your key)'; chip.className='chip ok'; banner.hidden=true; $('keyInfo').textContent='Using the key saved in this browser. Requests go straight from this browser to the Anthropic API.'; }
  else { chip.textContent='Add API key'; chip.className='chip warn'; banner.hidden=false; banner.className='banner warn'; banner.textContent='Photo analysis, suggestions, redesign and the prompt box use Claude. Add an Anthropic API key with the API key button to turn them on. The sample house, plan, toggles and exports work without one.'; $('keyInfo').textContent='No server key is set for this site. Paste your own key from console.anthropic.com.'; }
}
async function initAI(){
  state.downloads = null;
  try { const r = await fetch('/api/ai', {cache:'no-store'}); state.aiInfo = await r.json(); } catch(e){ state.aiInfo = {configured:false, maxImages:10}; }
  const maxCount = (state.aiInfo && state.aiInfo.maxImages) || 10;
  state.aiLimits = { images: { maxCount, mediaTypes: ['image/jpeg','image/png','image/webp','image/gif'] } };
  state.ai = { json: (prompt, opts) => callAI(prompt, opts||{}) };
  $('btnKey').onclick=()=>{ $('keyIn').value=storedKey(); $('keyModal').hidden=false; $('keyIn').focus(); };
  $('keyClose').onclick=()=>{ $('keyModal').hidden=true; };
  $('keyModal').addEventListener('click', e=>{ if(e.target===$('keyModal')) $('keyModal').hidden=true; });
  $('keySave').onclick=()=>{ const v=$('keyIn').value.trim(); try { if(v) localStorage.setItem('hf_anthropic_key', v); } catch(e){ addLog('This browser blocked storage, so the key cannot be saved.','err'); } $('keyModal').hidden=true; refreshAIStatus(); if (v) addLog('API key saved in this browser.','ai'); };
  $('keyClear').onclick=()=>{ try { localStorage.removeItem('hf_anthropic_key'); } catch(e){} $('keyIn').value=''; refreshAIStatus(); addLog('API key removed from this browser.','ai'); };
  refreshAIStatus();
}
function parseLooseJSON(text){
  const t = text.trim(); try { return JSON.parse(t); } catch(e){}
  const fence = t.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/); if (fence){ try { return JSON.parse(fence[1]); } catch(e){} }
  const a = Math.min(...['{','['].map(c=>{ const i=t.indexOf(c); return i<0?Infinity:i; })); const b = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (a!==Infinity && b>a){ try { return JSON.parse(t.slice(a,b+1)); } catch(e){} }
  throw {code:'invalid_json', message:'No JSON in the answer', text};
}
function blobToBase64(b){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(',')[1]); r.onerror=rej; r.readAsDataURL(b); }); }
async function callAIDirect(prompt, opts, key){
  // Browser -> Anthropic API with the viewer's own key: no server time limit on long analyses.
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
  const imgs = opts.images ? (Array.isArray(opts.images) ? opts.images : [opts.images]) : [];
  const content = [];
  for (const [i,b] of imgs.entries()){ const type = AI.IMAGE_TYPES.includes(b.type) ? b.type : 'image/jpeg'; content.push({type:'text', text:'Photo '+(i+1)+':'}); content.push({type:'image', source:{type:'base64', media_type:type, data: await blobToBase64(b)}}); }
  content.push({type:'text', text: prompt});
  const task = opts.modelTier==='complex' ? 'analyze' : 'edit';
  let text='';
  try {
    const stream = client.beta.messages.stream({ model: AI.MODEL, max_tokens: 64000, betas:['server-side-fallback-2026-07-01'], fallbacks:'default', output_config:{effort: AI.effortFor(task)}, system: AI.SYSTEM, messages:[{role:'user', content}] }, { signal: opts.signal });
    stream.on('text', (_d, snap)=>{ text = snap; if (opts.onText && snap.trim()) opts.onText({text: snap}); });
    const msg = await stream.finalMessage();
    if (msg.stop_reason==='refusal') throw {code:'refused'};
    if (msg.stop_reason==='max_tokens') throw {code:'invalid_json', message:'The answer was cut short.', text};
  } catch(e){
    if (e && e.code) throw e;
    if (e instanceof Anthropic.APIUserAbortError || (e && e.name==='AbortError')) throw {code:'cancelled'};
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw {code:'auth'};
    if (e instanceof Anthropic.RateLimitError) throw {code:'rate_limited'};
    if (e instanceof Anthropic.BadRequestError) throw {code:'bad_request', message:e.message};
    throw {code:'upstream_error', message:String(e && e.message || e), text};
  }
  if (!text.trim()) throw {code:'empty_completion'};
  return parseLooseJSON(text);
}
async function callAI(prompt, opts){
  const ownKey = storedKey();
  if (ownKey && !(state.aiInfo && state.aiInfo.configured)) return callAIDirect(prompt, opts, ownKey);
  const fd = new FormData(); fd.append('prompt', prompt); fd.append('task', opts.modelTier==='complex' ? 'analyze' : 'edit');
  const imgs = opts.images ? (Array.isArray(opts.images) ? opts.images : [opts.images]) : [];
  imgs.forEach((b,i)=>fd.append('images', b, 'photo'+(i+1)+'.'+((b.type||'image/jpeg').split('/')[1]||'jpg')));
  const headers = {}; const key = storedKey(); if (key) headers['x-anthropic-key'] = key;
  let res;
  try { res = await fetch('/api/ai', {method:'POST', body:fd, headers, signal:opts.signal}); }
  catch(e){ if (e && e.name==='AbortError') throw {code:'cancelled'}; throw {code:'upstream_error', message:String(e)}; }
  if (!res.ok){ let err={code:'upstream_error', message:'HTTP '+res.status}; try { err = await res.json(); } catch(e){} throw err; }
  const reader = res.body.getReader(); const dec = new TextDecoder(); let text='';
  try { for(;;){ const {done, value} = await reader.read(); if (done) break; text += dec.decode(value, {stream:true}); const cut = text.indexOf('\n[[HF_ERROR]]'); if (opts.onText && text.trim()) opts.onText({text: cut<0?text:text.slice(0,cut)}); } }
  catch(e){ if (e && e.name==='AbortError') throw {code:'cancelled'}; throw {code:'upstream_error', message:String(e)}; }
  const cut = text.indexOf('\n[[HF_ERROR]]');
  if (cut>=0){ let err={code:'upstream_error'}; try { err = JSON.parse(text.slice(cut+14)); } catch(e){} err.text = text.slice(0,cut); throw err; }
  if (!text.trim()) throw {code:'empty_completion'};
  return parseLooseJSON(text);
}
function aiErrorCopy(e){ const c=e&&e.code; return ({no_key:'Add your Anthropic API key with the API key button (top right) to use Claude.', auth:'The Anthropic API key was rejected. Check it with the API key button.', bad_request:(e&&e.message)||'The request was rejected.', not_granted:'You declined to let this page use Claude. Reload to be asked again.', rate_limited:'Claude is busy or your usage limit is reached. Try again in a little while.', refused:'Claude declined this request. Try different photos or wording.', invalid_json:'The answer was not valid JSON. Try again, or send fewer photos per pass.', image_rejected:'One of the photos was rejected (type or size). Remove it and retry.', images_unavailable:'This view cannot send photos to Claude.', prompt_too_large:'Too much data in one request. Try fewer photos or a smaller model.', cancelled:'Stopped.', upstream_error:'Claude had a hiccup. Try again.'})[c] || `AI error: ${c||'unknown'}`; }
function photoManifest(photos){ return photos.map((p,i)=>`Photo ${i+1}: ${p.tag}${p.room?` of "${p.room}"`:''}`).join('\n'); }
async function analyze(fresh){
  if (!state.ai) return; const m=state.model; const pending = fresh ? state.photos : state.photos.filter(p=>!p.used); if (!pending.length) return;
  const maxN = (state.aiLimits&&state.aiLimits.images&&state.aiLimits.images.maxCount)||8; const batches=[]; for (let i=0;i<pending.length;i+=maxN) batches.push(pending.slice(i,i+maxN));
  setBusy(true); state.abort=new AbortController(); let current = fresh? null : m; let n=0;
  $('analyzeNote').innerHTML = `<span class="busy"></span> Analysing ${pending.length} photos in ${batches.length} pass${batches.length>1?'es':''}…`;
  try {
    for (const batch of batches){ n++;
      const roomsNamed=[...new Set(batch.map(p=>p.room).filter(Boolean))];
      const prompt = current
        ? `You are an architectural surveyor. Below is the CURRENT house model as JSON, followed by ${batch.length} additional photographs. Update and refine the model: correct dimensions, add rooms, furniture, openings or exterior details that the new photos reveal, raise confidence on items now clearly visible, and remove photoRequests that these photos satisfy. Keep ids stable. Keep the mode "${state.mode}".\n\nCURRENT MODEL:\n${JSON.stringify(current)}\n\nPHOTOS:\n${photoManifest(batch)}\n\n${SCHEMA_DOC}`
        : `You are an architectural surveyor producing a measured survey from photographs. Mode: ${state.mode.toUpperCase()}. ${state.mode==='exterior' ? 'Build the exterior block (footprint as one or more rooms sized to the building, stories, roof form, windows and doors on each facade with positions and sizes) and estimate the room layout only roughly.' : 'Reconstruct every room visible, with realistic dimensions estimated from standard door/window/furniture sizes, and position furniture accurately. Connect rooms to each other by shared walls and doors/passages so the whole house maps together; if the photos show doorways into other rooms, create those rooms with estimated sizes.'}\n${roomsNamed.length?`Rooms named by the user: ${roomsNamed.join(', ')}.`:''}\nPHOTOS:\n${photoManifest(batch)}\n\n${SCHEMA_DOC}`;
      const result = await state.ai.json(prompt, { images: batch.map(p=>p.blob), modelTier:'complex', cache:false, signal: state.abort.signal, onText: ({text})=>{ $('analyzeNote').innerHTML = `<span class="busy"></span> Pass ${n}/${batches.length}: writing model… ${text.length} chars`; } });
      if (!result || typeof result!=='object' || !Array.isArray(result.rooms)) throw {code:'invalid_json', message:'no rooms'};
      current = result; for (const p of batch) p.used=true; setModel(current, `Pass ${n}/${batches.length}: ${current.rooms.length} rooms, ${(current.furniture||[]).length} furniture items.`); renderPhotos();
    }
    $('analyzeNote').textContent = `Done. ${current.rooms.length} rooms, ${(current.furniture||[]).length} furniture items. ${(current.photoRequests||[]).length?'See "More photos needed" for items to photograph.':''}`;
    $('btnOriginal').hidden=true; state.originalFurniture=null; state.redesigned=false;
  } catch(e){ console.error(e); $('analyzeNote').textContent = aiErrorCopy(e); addLog(aiErrorCopy(e),'err'); }
  state.abort=null; setBusy(false);
}
async function revise(instruction){
  if (!state.ai){ addLog('The prompt box needs an Anthropic API key. Add one with the API key button.','err'); return; }
  setBusy(true); state.abort=new AbortController(); addLog(instruction,'me');
  try {
    const prompt = `You are editing a house model. Apply the user's instruction and return the COMPLETE updated model JSON (same schema, keep ids stable, keep everything not mentioned unchanged). Mode: ${state.mode}.\n\nINSTRUCTION: ${instruction}\n\nCURRENT MODEL:\n${JSON.stringify(state.model)}\n\n${SCHEMA_DOC}`;
    const result = await state.ai.json(prompt, { modelTier:'default', cache:false, signal: state.abort.signal });
    if (!result || !Array.isArray(result.rooms)) throw {code:'invalid_json'};
    setModel(result, `Applied: ${result.notes ? result.notes : 'model updated'}`);
  } catch(e){ addLog(aiErrorCopy(e),'err'); }
  state.abort=null; setBusy(false);
}
async function suggest(){
  if (!state.ai){ addLog('Suggestions need Claude; open this page inside claude.ai.','err'); return; }
  const room = state.selectedRoom ? roomById(state.selectedRoom) : null; setBusy(true); state.abort=new AbortController(); $('sugg').innerHTML='<span class="note"><span class="busy"></span> Thinking about the space…</span>';
  try {
    const prompt = `You are an interior designer. ${room?`Focus on the room "${room.name}" (${room.w} × ${room.h} m).`:'Consider every room.'} Suggest 4–8 furniture or fitting additions/changes that would improve function and flow, each placed where it fits without blocking doors or windows. Reply with ONLY a JSON array of objects: {"roomId": string, "type": <furniture type from the schema>, "label": string, "why": string (one sentence), "x": number, "y": number, "w": number, "d": number, "h": number, "rot": 0|90|180|270, "color": "#hex"}.\n\nCURRENT MODEL:\n${JSON.stringify(state.model)}\n\nReference schema for coordinates and types:\n${SCHEMA_DOC}`;
    const list = await state.ai.json(prompt, { modelTier:'default', cache:false, signal: state.abort.signal });
    if (!Array.isArray(list)) throw {code:'invalid_json'};
    const el=$('sugg'); el.innerHTML=''; for (const s of list){ const r=roomById(String(s.roomId)); const d=document.createElement('div'); d.className='s'; d.innerHTML=`<div class="row"><b>${esc(s.label||s.type)}</b><span class="note">· ${esc(r?r.name:'?')}</span><span class="spacer"></span><button class="btn small">Add</button></div><small>${esc(s.why||'')} (${(+s.w||0).toFixed(1)} × ${(+s.d||0).toFixed(1)} × ${(+s.h||0).toFixed(1)} m)</small>`; d.querySelector('button').onclick=()=>{ state.model.furniture.push(normalizeModel({furniture:[Object.assign({id:'s'+Date.now()},s)],rooms:state.model.rooms}).furniture[0]); refreshAll(); d.remove(); addLog(`Added ${s.label||s.type}.`,'ai'); }; el.appendChild(d); }
    if (!list.length) el.innerHTML='<span class="note">No suggestions this time.</span>';
  } catch(e){ $('sugg').innerHTML=''; addLog(aiErrorCopy(e),'err'); }
  state.abort=null; setBusy(false);
}
async function redesign(){
  if (!state.ai){ addLog('Redesign needs an Anthropic API key. Add one with the API key button.','err'); return; }
  const room = state.selectedRoom ? roomById(state.selectedRoom) : null; const style=$('styleIn').value.trim(); setBusy(true); state.abort=new AbortController(); addLog(`Redesign ${room?room.name:'whole interior'}${style?' in style: '+style:''}`,'me');
  try {
    if (!state.originalFurniture) state.originalFurniture = JSON.parse(JSON.stringify(state.model.furniture));
    const prompt = `You are an interior designer. Produce a NEW furniture layout ${room?`for the room "${room.name}" only (keep furniture in other rooms exactly as is)`:'for every room'}${style?`, in this style: ${style}`:''}. Keep the architecture (rooms, openings) unchanged. Choose pieces with standard real-world dimensions, place them with clear circulation (≥0.8 m walkways), away from door swings, beds with headboards against a wall, sofas facing the TV or window, dining tables with chairs. Return the COMPLETE model JSON with the replaced "furniture" array (new ids), and in "notes" one sentence describing the concept.\n\nCURRENT MODEL:\n${JSON.stringify(state.model)}\n\n${SCHEMA_DOC}`;
    const result = await state.ai.json(prompt, { modelTier:'default', cache:false, signal: state.abort.signal });
    if (!result || !Array.isArray(result.furniture)) throw {code:'invalid_json'};
    result.rooms = state.model.rooms; result.exterior = state.model.exterior; // architecture stays
    state.redesigned=true; $('btnOriginal').hidden=false; $('btnOriginal').textContent='Show original'; setModel(result, `Redesign: ${result.notes||'new layout applied'}`);
  } catch(e){ addLog(aiErrorCopy(e),'err'); }
  state.abort=null; setBusy(false);
}

/* ---------- Wire up ---------- */
function wire(){
  $('modeInterior').onclick=()=>setMode('interior'); $('modeExterior').onclick=()=>setMode('exterior');
  $('tab3d').onclick=()=>switchTab('3d'); $('tabPlan').onclick=()=>switchTab('plan');
  document.querySelectorAll('#hud3d [data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
  document.querySelectorAll('[data-exp]').forEach(b=>b.onclick=()=>doExport(b.dataset.exp));
  $('btnDemo').onclick=()=>{ setModel(SAMPLE,'Loaded the sample house (example data).'); };
  $('btnAnalyze').onclick=()=>analyze(true); $('btnRefine').onclick=()=>analyze(false); $('btnStop').onclick=()=>{ if(state.abort) state.abort.abort(); };
  $('btnPrompt').onclick=()=>{ const v=$('prompt').value.trim(); if(!v) return; $('prompt').value=''; revise(v); };
  $('prompt').addEventListener('keydown', e=>{ if ((e.metaKey||e.ctrlKey) && e.key==='Enter') $('btnPrompt').click(); });
  $('btnSuggest').onclick=suggest; $('btnRedesign').onclick=redesign;
  $('btnOriginal').onclick=()=>{ if(!state.originalFurniture) return; const cur=JSON.parse(JSON.stringify(state.model.furniture)); state.model.furniture=state.originalFurniture; state.originalFurniture=cur; state.redesigned=!state.redesigned; $('btnOriginal').textContent = state.redesigned?'Show original':'Show redesign'; refreshAll(); };
  const t=(id,key,after)=>$(id).addEventListener('change', e=>{ state.opts[key]=e.target.checked; (after||refreshAll)(); });
  t('tEmpty','empty'); t('tThick','thick'); t('tLabels','labels'); t('tGrid','grid'); t('tWhole','whole'); t('tSwing','swing');
  $('wallH').addEventListener('change', e=>{ state.model.wallHeight=Math.max(2,Math.min(6,+e.target.value||2.7)); refreshAll(); });
  $('units').addEventListener('change', e=>{ state.opts.units=e.target.value; refreshAll(); });
  $('btnJson').onclick=()=>{ $('jsonText').value=JSON.stringify(state.model,null,2); $('jsonErr').textContent=''; $('jsonModal').hidden=false; };
  $('jsonClose').onclick=()=>{ $('jsonModal').hidden=true; };
  $('jsonApply').onclick=()=>{ try { const m=JSON.parse($('jsonText').value); setModel(m,'Model JSON applied.'); $('jsonModal').hidden=true; } catch(e){ $('jsonErr').textContent='Invalid JSON: '+e.message; } };
  $('jsonModal').addEventListener('click', e=>{ if(e.target===$('jsonModal')) $('jsonModal').hidden=true; });
  setupPlanControls();
}
function start(){
  initGL(); wire(); setMode('interior', true); setModel(SAMPLE); switchTab('3d'); initAI();
  addLog('Add photos of your rooms (or facades in Exterior mode), then build the model. The sample house is loaded so you can explore first.','ai');
}
start();

}
