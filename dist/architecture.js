export const ROOM_FLOOR=48.1;
// Facades use real-scale bays, grouped lit floors and distinct construction types.
// Emissive light maps are separate from the reflective glass/concrete surfaces.
export function makeArchitecture(k,city,map){
 const {THREE:T,random,texture,mat,mesh,box,tube}=k,cache=new Map();
 const roofMat=mat({color:'#35424b',roughness:.68,metalness:.35,side:T.DoubleSide}),trim=mat({color:'#9ba7ad',roughness:.4,metalness:.6});
 const ownerById=new Map(),byId=new Map(map.buildings.map(b=>[b.id,b]));
 for(const b of map.buildings)if(b.name)for(const id of b.parts||[])if(!ownerById.has(id)||b.name.length>ownerById.get(id).name.length)ownerById.set(id,b);
 const nameFor=b=>(b.name||ownerById.get(b.id)?.name||'').toLowerCase();
 const profiles={
  glass:{base:'#173849',pane:'#355b6d',cols:32,mullion:'#64818c'},
  silver:{base:'#344b56',pane:'#52727e',cols:24,mullion:'#a3b0b6'},
  curtain:{base:'#153c50',pane:'#426d80',cols:28,mullion:'#91a6b0'},
  ribbed:{base:'#173e40',pane:'#326466',cols:24,mullion:'#799998'},
  uob:{base:'#a5aaa5',pane:'#233f4b',cols:20,mullion:'#bfc1b9',solid:true},
  ocbc:{base:'#a69e88',pane:'#233039',cols:16,mullion:'#6f7167',solid:true},
  maybank:{base:'#668e8b',pane:'#214e55',cols:24,mullion:'#a5b5ac'},
  mosaic:{base:'#526a76',pane:'#294755',cols:24,mullion:'#96a6ad'},
  horizontal:{base:'#758c93',pane:'#264b5a',cols:32,mullion:'#c4c9c2'},
  garden:{base:'#4c6a64',pane:'#173c45',cols:24,mullion:'#c4c9bb'},
  residential:{base:'#53767b',pane:'#193e49',cols:20,mullion:'#8fa4a0',solid:true},
  stone:{base:'#a69f91',pane:'#29343c',cols:16,mullion:'#bdb4a2',solid:true},
  concrete:{base:'#8f948e',pane:'#283c46',cols:20,mullion:'#b7bbb2',solid:true},
  brick:{base:'#855f4e',pane:'#25333b',cols:14,mullion:'#a37a60',solid:true}
 };
 function facade(style='glass',colour='#ffffff',variant=0){
  const key=style+colour+variant;if(cache.has(key))return cache.get(key);const pr=profiles[style]||profiles.glass,cols=pr.cols,rows=32,W=512,H=512,bw=W/cols,rh=H/rows;
  const floors=Array.from({length:rows},(_,y)=>({lit:random()<.52,start:Math.floor(random()*cols),span:3+Math.floor(random()*cols*.65),cool:(y+variant)%5===0}));
  const diffuse=texture(W,H,(c,w,h)=>{c.fillStyle=pr.base;c.fillRect(0,0,w,h);for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const inset=pr.solid?bw*.23:1,sy=pr.solid?3:1;c.fillStyle=style==='mosaic'?['#304c59','#6d7d83','#233f4c','#87959a'][Math.floor(x/3+y/3+variant)%4]:pr.pane;c.fillRect(x*bw+inset,y*rh+sy,bw-inset*2,rh-(pr.solid?7:4));if(style==='uob'||style==='horizontal'){c.fillStyle=pr.mullion;c.fillRect(x*bw,y*rh+rh-4,bw,3);}else if(!pr.solid){c.fillStyle=pr.mullion;c.fillRect(x*bw,y*rh,style==='ribbed'?2:1,rh);}}for(let y=0;y<rows;y++){if((style==='curtain'||style==='ribbed')&&(y+variant*3)%13===0){c.fillStyle=pr.base;c.fillRect(0,y*rh,w,rh*.65);}if(style==='garden'&&y%11===0){c.fillStyle='#305f3b';c.fillRect(0,y*rh,w,rh*.55);}}});
  const light=texture(W,H,(c,w,h)=>{c.fillStyle='#000';c.fillRect(0,0,w,h);for(let y=0;y<rows;y++){const f=floors[y];if(!f.lit)continue;for(let j=0;j<f.span;j++){const x=(f.start+j)%cols;if(random()<.12)continue;c.fillStyle=f.cool?'#a4c5d4':j%4===0?'#f4c382':'#d9d1b2';const inset=pr.solid?bw*.25:2;c.fillRect(x*bw+inset,y*rh+3,bw-inset*2,rh-7);}}});
  for(const tx of [diffuse,light])tx.wrapS=tx.wrapT=T.RepeatWrapping;
  const solid=pr.solid,recognisable=['uob','ocbc','maybank','mosaic','curtain','ribbed','horizontal','garden'].includes(style),m=mat({side:T.DoubleSide,color:recognisable?'#ffffff':colour,map:diffuse,emissiveMap:light,emissive:'#ffe3b1',emissiveIntensity:solid?.65:.83,metalness:solid?.12:.68,roughness:solid?.76:.28});cache.set(key,m);return m;
 }
 function styleFor(b){const n=nameFor(b);if(/ocbc/.test(n))return'ocbc';if(/uob plaza/.test(n))return'uob';if(/maybank/.test(n))return'maybank';if(/asia square|westin|mizuho/.test(n))return'mosaic';if(/republic plaza/.test(n))return'ribbed';if(/financial centre|raffles quay/.test(n))return'curtain';if(/capitagreen|capitaspring/.test(n))return'garden';if(/oue bayfront/.test(n))return'horizontal';if(/sail|marina bay tower|central park tower|residenc|suite|apartment/.test(n)||b.kind==='apartments')return'residential';if(b.material==='brick')return'brick';if(['stone','concrete'].includes(b.material))return b.h>80?'concrete':'stone';if(b.h<24)return b.kind==='house'?'brick':'stone';return parseInt(b.id)%3===0?'silver':'glass';}
 function cap(points,y,material=roofMat){const shape=new T.Shape(points.map(p=>new T.Vector2(p[0],-p[1]))),g=new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);return mesh(g,material,city,0,y,0);}
 function quad(a,b,low,highA,highB,material,u0=0){const v=[a[0],low,a[1],b[0],low,b[1],b[0],highB,b[1],a[0],low,a[1],b[0],highB,b[1],a[0],highA,a[1]],len=Math.hypot(b[0]-a[0],b[1]-a[1]),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute([u0/64,low/105.6,(u0+len)/64,low/105.6,(u0+len)/64,highB/105.6,u0/64,low/105.6,(u0+len)/64,highB/105.6,u0/64,highA/105.6],2));g.computeVertexNormals();const o=mesh(g,material,city);o.castShadow=true;o.receiveShadow=true;return o;}
 const sailIds=new Set(['325793771','325793747']);
 // Replace only mapped landmark members, keeping unrelated neighbours intact.
 const owned=new Set(['116800998','116801004','172307471','172307472','821764692','97582570','256163011','256163012','46595395','171142595','171142597','51761904','230082125','1056849314','1056849315','172014438','172014442']);
 for(let id=827847277;id<=827847307;id++)owned.add(String(id));
 for(const b of map.buildings)if(owned.has(b.id))for(const id of b.parts||[])owned.add(id);
 function replaced(b){return owned.has(b.id)||(!b.part&&b.parts?.length);}
 // This incidental 3 m footprint overlaps the simplified Fullerton Road ribbon.
 // Keep its OSM record intact, but omit this one roadside box from the model.
 const roadObstructions=new Set(['515143394']);
 function build(b){if(roadObstructions.has(b.id))return;if(b.h<=b.min||b.p.length<4||b.h>350||b.kind==='roof')return;if(sailIds.has(b.id))return buildSail(b);if(replaced(b))return;
  const colour=/^#[0-9a-f]{6}$/i.test(b.color)?b.color:'#718c9b',m=facade(styleFor(b),colour,['glass','silver'].includes(styleFor(b))?parseInt(b.id)%3:0),p=b.p.slice(0,-1);let u=0;
  const roofStart=b.roof==='skillion'&&b.roofH>0?Math.max(b.min+2,b.h-b.roofH):b.h;
  const xs=p.map(p=>p[0]),zs=p.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const tops=p.map(v=>b.roof==='skillion'?roofStart+b.roofH*(v[0]-minX)/Math.max(1,maxX-minX):b.h);
  for(let i=0;i<p.length;i++){const j=(i+1)%p.length;quad(p[i],p[j],b.min,tops[i],tops[j],m,u);u+=Math.hypot(p[i][0]-p[j][0],p[i][1]-p[j][1]);}
  if(b.roof==='skillion'){const shape=new T.Shape(p.map(v=>new T.Vector2(v[0],-v[1]))),g=new T.ShapeGeometry(shape);const pos=g.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=-pos.getY(i);pos.setXYZ(i,x,roofStart+b.roofH*(x-minX)/Math.max(1,maxX-minX),z);}g.computeVertexNormals();mesh(g,roofMat,city);}else cap(b.p,b.h+.03);
  if(b.h>65&&b.min===0&&['glass','silver','curtain','ribbed','uob'].includes(styleFor(b))){for(let y=8;y<b.h;y+=(styleFor(b)==='uob'?3.6:16.5)){for(let i=1;i<b.p.length;i++)quad(b.p[i-1],b.p[i],y-.1,y+.1,y+.1,trim);}if(['curtain','ribbed','uob'].includes(styleFor(b))){for(let i=0;i<p.length;i+=Math.max(1,Math.floor(p.length/4))){box(.35,b.h,.35,trim,city,p[i][0],b.h/2,p[i][1]);}}}
 }
 let opening,exitOpening;
 function buildSail(b){const points=b.p.slice(0,-1),selected=b.id==='325793771',m=facade('residential','#6f99a5'),xs=points.map(p=>p[0]),minX=Math.min(...xs),maxX=Math.max(...xs);const top=points.map(p=>b.h-24+24*(p[0]-minX)/(maxX-minX));let u=0;
  for(let i=0;i<points.length;i++){const a=points[i],bb=points[(i+1)%points.length],j=(i+1)%points.length;
   if(selected&&i===17){const l=Math.min(a[0],bb[0]),r=Math.max(a[0],bb[0]),z=3.3,base=ROOM_FLOOR+.84,high=ROOM_FLOOR+2.67;quad([r,z],[l,z],0,base,base,m,u);quad([r,z],[l,z],high,top[i],top[j],m,u);quad([r,z],[2.5,z],base,high,high,m,u);quad([-1.9,z],[l,z],base,high,high,m,u+6);
   }else quad(a,bb,0,top[i],top[j],m,u);u+=Math.hypot(a[0]-bb[0],a[1]-bb[1]);}
  const shape=new T.Shape(points.map(p=>new T.Vector2(p[0],-p[1]))),g=new T.ShapeGeometry(shape),pos=g.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=-pos.getY(i);pos.setXYZ(i,x,b.h-24+24*(x-minX)/(maxX-minX),z);}g.computeVertexNormals();mesh(g,roofMat,city);
  for(let y=25;y<b.h-24;y+=3.3){for(let i=0;i<points.length;i++){const a=points[i],bb=points[(i+1)%points.length];quad(a,bb,y-.045,y+.045,y+.045,trim);}}
  if(!selected)return;
  // The opening lies in the existing facade plane; no detached room-sized box.
  const glass=mat({color:'#365968',transparent:true,opacity:.2,metalness:.8,roughness:.1,side:T.DoubleSide}),frame=mat({color:'#a8bcc1',metalness:.7,roughness:.25});
  for(const x of [-1.9,.3,2.5])box(.07,1.83,.1,frame,city,x,ROOM_FLOOR+1.75,3.31);
  for(const y of [.84,2.67])box(4.5,.07,.1,frame,city,.3,ROOM_FLOOR+y,3.31);
  function casement(x,direction){const leaf=new T.Group();leaf.position.set(x,ROOM_FLOOR+1.75,3.315);leaf.userData.dynamic=true;city.add(leaf);
   for(const edge of [0,direction*2.2])box(.055,1.8,.06,frame,leaf,edge,0,0);
   for(const y of [-.9,.9])box(2.2,.055,.06,frame,leaf,direction*1.1,y,0);
   mesh(new T.PlaneGeometry(2.1,1.7),glass,leaf,direction*1.1,0,0);return leaf;
  }
  opening=casement(2.5,-1);opening.name='entry-casement';exitOpening=casement(-1.9,1);exitOpening.name='exit-casement';
 }
 const identities=[['335167827','UOB','#e9eef0','#d31d37'],['171999282','UOB','#e9eef0','#d31d37'],['171999325','OCBC','#f0343d','#f0343d'],['106193386','Maybank','#f1c74a','#f1c74a'],['679032154','OUE','#d7e2e6','#8fb8bc'],['116905041','MBFC','#d6e6ec','#a1c3d3']];
 const signs=[];
 for(const [id,label,colour,accent]of identities){const parent=byId.get(id);if(!parent)continue;const members=[parent,...(parent.parts||[]).map(id=>byId.get(id)).filter(Boolean)],eligible=members.filter(b=>b.h>20&&b.p.some((p,i)=>i&&Math.hypot(p[0]-b.p[i-1][0],p[1]-b.p[i-1][1])>8)).sort((a,b)=>b.h-a.h),b=eligible[0];if(!b)continue;const ring=b.p,edges=[];let area=0;for(let i=1;i<ring.length;i++)area+=ring[i-1][0]*ring[i][1]-ring[i][0]*ring[i-1][1];for(let i=1;i<ring.length;i++){const a=ring[i-1],v=ring[i],dx=v[0]-a[0],dz=v[1]-a[1],length=Math.hypot(dx,dz);if(length<8)continue;const sign=area>0?1:-1,n=[dz/length*sign,-dx/length*sign],x=(a[0]+v[0])/2,z=(a[1]+v[1])/2;edges.push({x,z,n,length,score:n[0]*(250-x)+n[1]*(550-z)});}edges.sort((a,b)=>b.score-a.score);const face=edges[0];if(!face)continue;
  const tx=texture(512,96,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle=accent;if(label==='UOB'){for(let i=0;i<4;i++)c.fillRect(12+i*11,20,6,56);c.fillRect(8,42,54,6);}else if(label==='OCBC'){c.strokeStyle=accent;c.lineWidth=6;c.beginPath();c.arc(45,48,26,0,Math.PI*2);c.stroke();}c.fillStyle=colour;c.font='bold 67px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(label,label==='UOB'||label==='OCBC'?290:256,51,420);});const material=new T.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,toneMapped:false}),width=Math.min(face.length*.8,29),o=mesh(new T.PlaneGeometry(width,width*96/512),material,city,face.x+face.n[0]*.22,b.h-7,face.z+face.n[1]*.22);o.rotation.y=Math.atan2(face.n[0],face.n[1]);signs.push({id,label,position:o.position.toArray()});
 }
 return{build,facade,roofMat,trim,cap,quad,signs,owned,styleFor,get opening(){return opening;},get exitOpening(){return exitOpening;}};
}
