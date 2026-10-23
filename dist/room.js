import {ROOM_FLOOR} from './architecture.js';
// An imagined bedroom, scaled in metres and placed inside the fifth storey.
// Every object is geometry or a drawing in code. No generated artwork is used.
export function buildRoom(scene,k){
 const {THREE,random,mat,basic,palette:p,mesh,box,cyl,ball,tube,texture,plane,group,action,contact,animations}=k;
 const room=group(scene,0,ROOM_FLOOR,0),photoFrames=[],fanRotors=[],curtains=[];let sceneProgress=0;
 const grain=texture(512,512,(c,w,h)=>{c.fillStyle='#654b36';c.fillRect(0,0,w,h);for(let i=0;i<1600;i++){c.strokeStyle=`rgba(${random()>.5?'10,5,0':'180,150,90'},${random()*.15})`;c.beginPath();const y=random()*h;c.moveTo(0,y);c.bezierCurveTo(120,y+Math.sin(i)*8,320,y-3,w,y+random()*7);c.stroke();}});grain.wrapS=grain.wrapT=THREE.RepeatWrapping;
 const wood=mat({color:'#9b7854',map:grain,roughness:.56}),darkWood=mat({color:'#473c30',map:grain,roughness:.65});
 const plaster=texture(256,256,(c,w,h)=>{c.fillStyle='#c9c2ac';c.fillRect(0,0,w,h);for(let i=0;i<14000;i++){const a=random()*.08;c.fillStyle=`rgba(${random()>.5?'255,255,240':'50,50,40'},${a})`;c.fillRect(random()*w,random()*h,1,1);}});
 const wall=mat({color:'#b5b1a0',map:plaster,roughness:.96}),fabricTex=texture(128,128,(c,w,h)=>{c.fillStyle='#959187';c.fillRect(0,0,w,h);for(let i=0;i<w;i+=3){c.strokeStyle='#c8c3ab28';c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.moveTo(0,i);c.lineTo(w,i);c.stroke();}}),fabric=mat({color:'#4c605d',map:fabricTex,roughness:.96});
 const rugMat=mat({color:'#7b6d52',map:fabricTex,roughness:1});
 const floor=box(7.1,.08,6.425,wood,room,0,.02,.0875);for(let i=0;i<25;i++)box(.008,.005,6.375,darkWood,room,-3.4+i*.28,.064,.0875);
 const windowSkirting=box(7.1,.1,.022,p.paper,room,0,.11,3.282);windowSkirting.name='window-skirting';
 box(7.2,2.92,.08,wall,room,0,1.5,-3.21);for(const x of [-3.55,3.55])box(.06,2.92,6.2,wall,room,x,1.5,0);
 box(7.2,.06,6.4,mat({color:'#b6b29f',roughness:1}),room,0,2.93,0);
 for(const x of [-3.5,3.5])box(.045,.12,6.2,darkWood,room,x,.14,0);box(7.1,.12,.045,darkWood,room,0,.14,-3.15);
 box(2.6,.012,1.8,rugMat,room,-.5,.072,-.55);contact(room,-.5,.08,-1.5,3,2,.3);
 // Desk: proper joinery, drawers, feet, monitor stand, individual keys and cables.
 const DESK_TOP=.8025,desk=group(room,-.6,0,-1.85);desk.name='desk';box(2.3,.065,.85,wood,desk,0,.77,0,.018);for(const x of [-1.04,1.04]){box(.07,.72,.07,p.black,desk,x,.38,-.3);box(.07,.72,.07,p.black,desk,x,.38,.3);box(.09,.04,.75,p.metal,desk,x,.1,0);}
 box(.52,.58,.68,darkWood,desk,.78,.45,0);for(let i=0;i<3;i++){box(.49,.16,.02,wood,desk,.78,.25+i*.18,.35);box(.19,.013,.025,p.metal,desk,.78,.29+i*.18,.37);}
 const monitor=group(desk,-.05,1.22,-.23);box(1,.62,.045,p.black,monitor,0,0,0,.018);box(.045,.25,.045,p.metal,desk,-.05,.91,-.27);const monitorBase=box(.34,.016,.21,p.black,desk,-.05,.813,-.24,.012);
 let ember=false;const screenTex=texture(1600,960,()=>{}),screenCanvas=screenTex.image,c=screenCanvas.getContext('2d');
 function drawDesktop(){const w=1600,h=960;c.fillStyle='#0c1820';c.fillRect(0,0,w,h);const g=c.createRadialGradient(1000,420,20,850,430,900);g.addColorStop(0,ember?'#c29469':'#497b82');g.addColorStop(.5,ember?'#5e4d46':'#203f4b');g.addColorStop(1,'#0d1924');c.fillStyle=g;c.fillRect(0,0,w,h);
  // Sculptural wave contours form a wallpaper, not a biography on a screen.
  for(let row=0;row<75;row++){c.beginPath();for(let x=0;x<w;x+=8){const y=160+row*9+Math.sin(x*.006+row*.065)*Math.cos(row*.04)*135+Math.exp(-(((x-1020)/350)**2))*Math.sin(row*.09)*180;x?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle=`rgba(190,216,198,${.09+row/400})`;c.lineWidth=1;c.stroke();}
  c.fillStyle='#071019dc';c.fillRect(20,18,w-40,44);c.font='19px monospace';c.fillStyle='#b1cbbf';c.fillText('01   02   03',44,47);c.textAlign='right';c.fillText('22:17   ◉   ♬   ▰',w-46,47);c.textAlign='left';
  c.fillStyle='#09131eea';c.fillRect(74,143,720,534);c.strokeStyle='#88a8ac55';c.strokeRect(74,143,720,534);c.fillStyle='#243c45';c.fillRect(74,143,720,45);for(let i=0;i<3;i++){c.fillStyle=['#b57863','#b9a878','#77a898'][i];c.beginPath();c.arc(98+i*24,165,6,0,Math.PI*2);c.fill();}c.fillStyle='#b9c9c2';c.font='17px monospace';c.fillText('layers.py',335,171);
  const code=['import jax','import jax.numpy as jnp','','def forward(params, x):','    for weights, bias in params:','        x = jax.nn.relu(x @ weights + bias)','    return x','','# one layer at a time'];code.forEach((line,i)=>{c.fillStyle='#4b6673';c.fillText(String(i+1).padStart(2,' '),96,233+i*43);c.fillStyle=i===8?'#739a81':i<2?'#b6accc':'#aec4b8';c.fillText(line,141,233+i*43);});
  c.fillStyle='#102630ed';c.fillRect(1040,660,450,210);c.fillStyle='#9bb8b1';c.font='16px monospace';c.fillText('SYSTEM',1070,696);for(let i=0;i<24;i++){c.fillStyle=i%4?'#4d7980':'#b6bf9a';c.fillRect(1070+i*15,788-Math.sin(i*.5)*28,6,35+Math.sin(i*.5)*28);}c.font='14px monospace';c.fillText('CPU',1070,852);c.fillText('MEMORY',1270,852);
  c.fillStyle='#0b1723dd';c.fillRect(590,888,420,54);for(let i=0;i<7;i++){c.strokeStyle='#aec5bd';c.strokeRect(614+i*55,903,24,24);}screenTex.needsUpdate=true;}
 drawDesktop();const ledMaterial=basic('#94b9a5',{transparent:true,opacity:.8});plane(.008,.003,ledMaterial,monitor,.43,-.294,.026);animations.push(time=>ledMaterial.opacity=.65+Math.sin(time*2)*.2);const screen=action(plane(.953,.548,basic('#ffffff',{map:screenTex}),monitor,0,.012,.026),'theme');
 const keyboard=group(desk,-.07,DESK_TOP+.0125,.22);box(.48,.025,.165,p.black,keyboard,0,0,0,.009);for(let row=0;row<5;row++)for(let col=0;col<14;col++){if(row===4&&col>3&&col<10)continue;box(.026,.013,.021,(row===0&&col===0)?p.accent:p.chrome,keyboard,-.219+col*.033,.019,-.065+row*.03,.003);}box(.19,.013,.021,p.chrome,keyboard,0,.019,.055,.003);
 const mousePad=box(.38,.006,.28,mat({color:'#273b3b',roughness:.95}),desk,.45,DESK_TOP+.003,.18,.012);
 // A domed, tapered mouse with separate button seams, a ridged wheel and base.
 const mouse=group(desk,.44,DESK_TOP+.006,.16);mouse.name='desk-mouse';
 const mouseBase=cyl(.031,.006,p.black,mouse,0,.003,0);mouseBase.scale.z*=1.62;
 const mouseGeo=new THREE.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI/2),mousePos=mouseGeo.attributes.position;
 for(let i=0;i<mousePos.count;i++){const x=mousePos.getX(i),y=mousePos.getY(i),z=mousePos.getZ(i);mousePos.setXYZ(i,x*.033*(1-.14*Math.max(0,-z)),.004+y*.032,z*.055);}mouseGeo.computeVertexNormals();
 mesh(mouseGeo,mat({color:'#3b4549',roughness:.4,metalness:.16}),mouse);
 const mouseY=(x,z)=>.004+.032*Math.sqrt(Math.max(0,1-(x/.033)**2-(z/.055)**2))+.0007;
 for(const [a,b]of [[-.049,-.027],[-.009,.003]])tube(Array.from({length:12},(_,i)=>{const z=a+(b-a)*i/11;return[0,mouseY(0,z),z];}),.00065,p.black,mouse);
 for(const side of [-1,1])tube(Array.from({length:12},(_,i)=>{const x=side*(.003+i/11*.027),z=-.003-i/11*.004;return[x,mouseY(x,z),z];}),.00055,p.black,mouse);
 const wheel=cyl(.0065,.008,p.black,mouse,0,.034,-.018);wheel.rotation.z=Math.PI/2;
 for(let i=0;i<5;i++){const ridge=mesh(new THREE.TorusGeometry(.0065,.00055,5,20),p.metal,mouse,-.003+i*.0015,.034,-.018);ridge.rotation.y=Math.PI/2;}
 const mouseMark=plane(.011,.002,p.accent,mouse,0,mouseY(0,.028)+.0002,.028);mouseMark.rotation.x=-Math.PI/2;
 contact(desk,.44,DESK_TOP+.0062,.16,.085,.14,.2);
 tube([[-.05,.9,-.27],[-.05,.7,-.42],[.45,.2,-.42],[1,.15,-.1]],.008,p.black,desk);
 // Two speakers, a pen pot, a cup, a task lamp and hanging headphones.
 const speakers=[];for(const x of [-.8,.65]){speakers.push(box(.15,.23,.15,p.black,desk,x,.92,-.24,.012));const woofer=mesh(new THREE.CircleGeometry(.044,24),p.metal,desk,x,.91,-.158);mesh(new THREE.CircleGeometry(.018,20),p.black,desk,x,1.0,-.157);}
 const cup=group(desk,-.91,DESK_TOP,.2);cup.name='ceramic-mug';
 const ceramic=mat({color:'#bac3af',roughness:.24,metalness:.02}),profile=[[0,0],[.031,0],[.038,.003],[.041,.075],[.040,.085],[.036,.086],[.034,.081],[.034,.013],[.029,.008],[0,.008]].map(v=>new THREE.Vector2(...v));
 mesh(new THREE.LatheGeometry(profile,48),ceramic,cup);const coffee=mesh(new THREE.CircleGeometry(.033,48),mat({color:'#241c16',roughness:.25}),cup,0,.071,0);coffee.rotation.x=-Math.PI/2;
 const cupHandle=tube([[.034,.068,0],[.055,.075,0],[.072,.059,0],[.072,.036,0],[.052,.019,0],[.034,.026,0]],.005,ceramic,cup);cupHandle.name='mug-handle';
 const pot=cyl(.035,.085,p.metal,desk,.93,.85,-.2);for(let i=0;i<5;i++)box(.004,.12,.004,i%2?p.wood:p.chrome,desk,.91+i*.009,.92,-.2+Math.sin(i)*.012);
 const lamp=group(desk,-1,.81,-.27);cyl(.09,.018,p.black,lamp);tube([[0,0,0],[.05,.28,0],[-.3,.46,-.02]],.012,p.metal,lamp);const shade=mesh(new THREE.ConeGeometry(.13,.14,24,1,true),mat({color:'#b9a575',metalness:.6,roughness:.35,side:THREE.DoubleSide}),lamp,-.3,.44,-.02);shade.rotation.z=-.3;const taskLight=new THREE.PointLight('#ffd4a0',4,3,2);taskLight.position.set(-1.9,1.25,-2.05);room.add(taskLight);
 const headphones=group(desk,-1.13,.61,.18);mesh(new THREE.TorusGeometry(.105,.011,8,32,Math.PI),p.black,headphones);for(const x of [-.1,.1])box(.042,.09,.06,p.black,headphones,x,-.035,0,.02);
 function chair(x,z,angle=0){const g=group(room,x,0,z);g.rotation.y=angle;box(.52,.09,.5,fabric,g,0,.48,0,.055);box(.49,.52,.07,fabric,g,0,.78,.22,.045);cyl(.027,.4,p.chrome,g,0,.27,0);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;tube([[0,.1,0],[Math.cos(a)*.31,.07,Math.sin(a)*.31]],.016,p.black,g);cyl(.035,.04,p.black,g,Math.cos(a)*.31,.05,Math.sin(a)*.31);}for(const x of [-.27,.27]){box(.025,.18,.025,p.black,g,x,.62,.04);box(.05,.035,.31,p.black,g,x,.71,.04,.015);}contact(room,x,.074,z,.9,.9,.3);return g;}
 chair(-.65,-.75,0);chair(.65,.5,-.6);
 // Open PC side: motherboard, traces, heatsink, GPU, fans and individually routed cables.
 const pc=group(room,.85,.42,-2.12);const board=mat({color:'#264c42',roughness:.63}),copper=mat({color:'#9a794a',metalness:.78,roughness:.3});
 box(.36,.77,.025,p.black,pc,0,0,-.24,.008);let pcTop;for(const y of [-.38,.38]){const surface=box(.36,.025,.5,p.black,pc,0,y,0,.006);if(y>0)pcTop=surface;}for(const x of [-.175,.175])box(.015,.74,.5,p.black,pc,x,0,0,.005);box(.009,.67,.43,board,pc,.185,0,0);const pane=mat({color:'#97b7ba',transparent:true,opacity:.09,metalness:.15,roughness:.08,side:THREE.DoubleSide});box(.35,.72,.008,pane,pc,0,0,.258,.005);
 box(.26,.12,.34,p.metal,pc,0,-.07,.045,.008);for(let i=0;i<14;i++)box(.24,.007,.23,p.chrome,pc,0,.02+i*.008,-.02);
 for(let i=0;i<10;i++)box(.003,.03+random()*.22,.002,copper,pc,-.13+i*.026,.19,-.2);
 for(let i=0;i<2;i++){const fan=group(pc,0,-.22+i*.43,.271);fan.userData.dynamic=true;mesh(new THREE.TorusGeometry(.135,.008,6,36),p.accent,fan);for(let j=0;j<7;j++){const a=j/7*Math.PI*2;const blade=box(.045,.1,.007,p.metal,fan,Math.sin(a)*.065,Math.cos(a)*.065,0,.009);blade.rotation.z=-a+.5;}fanRotors.push(fan);}
 action(box(.34,.72,.018,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),pc,0,0,.29),'pyjosh');
 for(let i=0;i<4;i++)tube([[.1,.1,-.1],[.2,.05-i*.02,.1],[.12,-.2,.17],[-.05,-.28,.15]],.006,i%2?copper:p.black,pc);
 animations.push(time=>fanRotors.forEach((f,i)=>f.rotation.z=time*(i?-8:10)));
 // Bed and wardrobe are part of a room, rather than exhibition plinths.
 const bed=group(room,-2.75,0,.1);box(1.32,.28,2.2,darkWood,bed,0,.25,0,.03);const mattress=box(1.28,.19,2.14,mat({color:'#b2b4a3',roughness:1}),bed,0,.48,0,.07);box(1.34,.8,.08,darkWood,bed,0,.5,-1.11,.02);box(.8,.12,.4,mat({color:'#bfc4b6',map:fabricTex,roughness:1}),bed,0,.63,-.76,.065);
 const blanketGeo=new THREE.PlaneGeometry(1.35,1.5,36,36);const positions=blanketGeo.attributes.position;for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i);positions.setZ(i,.022*Math.sin(x*16+y*5)+.012*Math.sin(y*28+x*3));}blanketGeo.computeVertexNormals();const blanket=mesh(blanketGeo,mat({color:'#294a51',map:fabricTex,roughness:.96,side:THREE.DoubleSide}),bed,0,.617,.34);blanket.name='waved-blanket';blanket.rotation.x=-Math.PI/2;contact(room,-2.75,.07,.1,1.8,2.7,.35);
 const wardrobe=group(room,-3,0,2.1);box(1,.0+2.25,.65,darkWood,wardrobe,0,1.18,0,.014);for(const x of [-.255,.255]){box(.47,2.17,.025,wood,wardrobe,x,1.18,.34);box(.018,.28,.025,p.chrome,wardrobe,x>0?.07:-.07,1.2,.365);}
 // Bookcase, actual book spines, a record sleeve and an analog clock.
 const shelf=group(room,-2.95,0,-2.75);for(const x of [-.5,.5])box(.045,2.2,.42,darkWood,shelf,x,1.15,0);for(const y of [.1,.66,1.22,1.78,2.28])box(1.05,.04,.45,wood,shelf,0,y,0);
 const bookColours=['#708379','#a38a64','#394d5b','#886657','#b0b29c'];for(let row=0;row<3;row++)for(let i=0;i<9;i++){const h=.32+random()*.12,w=.045+random()*.04;const b=box(w,h,.28,mat({color:bookColours[(i+row)%5],roughness:.9}),shelf,-.44+i*.095,.7+row*.56+h/2,.02,.002);if(i===7)b.rotation.z=.13;box(w*.7,.006,.003,p.paper,shelf,b.position.x,b.position.y+.07,.163);}
 const record=group(shelf,0,2.465,.08);box(.33,.33,.025,mat({color:'#335962',roughness:.8}),record);const disc=mesh(new THREE.CircleGeometry(.13,40),p.black,record,0,0,.014);mesh(new THREE.CircleGeometry(.04,24),p.paper,record,0,0,.015);
 const clock=group(room,3.21,2.52,-3.12);clock.name='wall-clock';const face=mesh(new THREE.CircleGeometry(.18,40),p.paper,clock);mesh(new THREE.TorusGeometry(.185,.012,8,40),p.metal,clock);for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const mark=box(.008,.025,.002,p.black,clock,Math.sin(a)*.15,Math.cos(a)*.15,.003);mark.rotation.z=-a;}const hand=box(.01,.12,.005,p.black,clock,-.03,.04,.009);hand.rotation.z=.9;const minute=box(.008,.15,.005,p.black,clock,.04,.045,.012);minute.rotation.z=-.7;const seconds=box(.004,.21,.003,mat({color:'#a15e44',roughness:.5}),clock,0,.07,.016);animations.push(time=>seconds.rotation.z=-Math.floor(time)*Math.PI/30);
 // The camera is recognisable equipment: grip, lens glass, focus rings, hotshoe, dial and strap.
 const cabinet=group(room,2,0,-.65);box(1.1,.85,.64,darkWood,cabinet,0,.49,0,.015);const cabinetTop=box(1.15,.055,.7,wood,cabinet,0,.94,0,.012);for(let i=0;i<3;i++){box(1.03,.23,.025,wood,cabinet,0,.26+i*.25,.333);box(.19,.014,.025,p.metal,cabinet,0,.27+i*.25,.358);}
 const camera=group(room,1.95,1.0385,-.65);camera.rotation.y=-.25;box(.22,.135,.09,p.black,camera,0,0,0,.018);box(.045,.14,.1,mat({color:'#1b2227',roughness:.98}),camera,-.09,0,.01,.01);box(.075,.03,.06,p.metal,camera,0,.08,-.01,.005);const lens=cyl(.053,.1,p.black,camera,.025,-.005,.08);lens.rotation.x=Math.PI/2;for(let i=0;i<5;i++)mesh(new THREE.TorusGeometry(.053,.003,5,32),i%2?p.metal:p.black,camera,.025,-.005,.05+i*.014);action(mesh(new THREE.CircleGeometry(.046,40),mat({color:'#173a4a',metalness:.85,roughness:.06}),camera,.025,-.005,.133),'viewfinder');cyl(.014,.015,p.chrome,camera,.072,.08,0);box(.025,.01,.02,p.chrome,camera,-.045,.075,.005);const strapPath=new THREE.CurvePath(),strapY=.9675-1.0385+.005;
 const bezier=points=>strapPath.add(new THREE.CubicBezierCurve3(...points.map(v=>new THREE.Vector3(...v))));
 bezier([[-.112,.035,.018],[-.21,-.03,.02],[-.24,strapY,.10],[-.22,strapY,.18]]);
 bezier([[-.22,strapY,.18],[-.18,strapY,.25],[.04,strapY,.25],[.14,strapY,.18]]);
 bezier([[.14,strapY,.18],[.19,strapY,.10],[.16,-.02,.04],[.112,.035,.018]]);
 const cameraStrap=mesh(new THREE.TubeGeometry(strapPath,72,.004,8,false),p.black,camera);cameraStrap.name='camera-strap';
 const strapMounts=[-1,1].map(side=>box(.015,.016,.012,p.metal,camera,side*.109,.035,.018,.003));
 for(let j=0;j<2;j++){const spare=cyl(.041,.09,p.black,cabinet,.31+j*.13,1.01,-.08);mesh(new THREE.TorusGeometry(.041,.003,6,24),p.chrome,cabinet,.31+j*.13,1.052,-.08).rotation.x=Math.PI/2;}
 // Photographic studies show alternate views rendered from this same 3D city.
 const contactBoard=group(room,2.12,1.98,-3.15);contactBoard.name='photo-board';box(1.6,1.0,.04,mat({color:'#6a543b',roughness:1}),contactBoard);for(let j=0;j<6;j++){const x=-.5+(j%3)*.5,y=.22-Math.floor(j/3)*.47;const print=box(.44,.4,.008,p.paper,contactBoard,x,y,.03);const photo=plane(.395,.29,basic('#244452'),contactBoard,x,y+.025,.036);photoFrames.push(photo);box(.08,.025,.008,mat({color:'#baab8b',transparent:true,opacity:.55}),contactBoard,x,y+.19,.043);}
 // Project notebooks are tangible, with tabs, elastic bands and diagrammed pages.
 const notes=group(desk,-.62,DESK_TOP+.006,.17);notes.name='project-notes';notes.rotation.y=.06;const noteTex=texture(1024,700,(c,w,h)=>{c.fillStyle='#d4cfb9';c.fillRect(0,0,w,h);c.strokeStyle='#b9b5a24d';for(let y=45;y<h;y+=26){c.beginPath();c.moveTo(25,y);c.lineTo(w-25,y);c.stroke();}c.fillStyle='#314955';c.font='40px serif';c.fillText('PyJosh',55,75);for(let layer=0;layer<3;layer++)for(let node=0;node<4;node++){const x=120+layer*210,y=190+node*110;if(layer<2)for(let j=0;j<4;j++){c.strokeStyle='#54777977';c.beginPath();c.moveTo(x,y);c.lineTo(x+210,190+j*110);c.stroke();}c.fillStyle='#55756e';c.beginPath();c.arc(x,y,14,0,Math.PI*2);c.fill();}c.fillStyle='#6f7767';c.font='20px monospace';c.fillText('layers · activations · gradients',55,650);});
 box(.36,.012,.27,mat({color:'#6e7869',roughness:.8}),notes);const page=action(plane(.34,.25,basic('#ffffff',{map:noteTex}),notes,0,.0066,0),'pyjosh');page.rotation.x=-Math.PI/2;box(.006,.008,.24,p.black,notes,.12,.0108,0);
 const projectBooks=[],bookTitles=[['Sunbrew','#9e7953',-.56,-.26,-.1],['optialgos','#4c7275',-.285,-.03,.05]];
 bookTitles.forEach(([title,color,x,z,yaw])=>{const book=group(desk,x,DESK_TOP,z);book.name=title+'-notebook';book.rotation.y=yaw;projectBooks.push(book);
  const coverMaterial=mat({color,roughness:.8});box(.23,.002,.16,coverMaterial,book,0,.001,0);box(.218,.018,.148,p.paper,book,0,.011,0);box(.23,.002,.16,coverMaterial,book,0,.021,0);
  const t=texture(512,320,(c,w,h)=>{c.fillStyle=color;c.fillRect(0,0,w,h);c.fillStyle='#e2d9ba';c.font='42px serif';c.fillText(title,26,75);c.strokeStyle='#d1c5a5';c.strokeRect(25,150,60,60);c.beginPath();c.moveTo(35,180);c.lineTo(50,195);c.lineTo(75,160);c.stroke();});
  const cover=action(plane(.23,.16,basic('#ffffff',{map:t}),book,0,.0222,0),title==='Sunbrew'?'sunbrew':'optialgos');cover.rotation.x=-Math.PI/2;
 });
 // Framed paper, a double mat, fine engraved borders, a rosette and foil make an
 // achievement read as a certificate. This is a designed representation, not a scan.
 function certificate(x,y,z,title,subtitle,colour,year,wide=1.13){
  const frame=group(room,x,y,z),gold=mat({color:colour,metalness:.8,roughness:.32});box(wide+.14,.89,.065,darkWood,frame);box(wide+.10,.85,.012,gold,frame,0,0,.038);box(wide+.065,.815,.014,p.paper,frame,0,0,.047);
  const tex=texture(1600,1100,(c,w,h)=>{c.fillStyle='#ddd7bf';c.fillRect(0,0,w,h);for(let i=0;i<12000;i++){c.fillStyle=`rgba(80,65,30,${random()*.06})`;c.fillRect(random()*w,random()*h,1,1);}c.strokeStyle=colour;c.lineWidth=2;for(const inset of [39,51,66])c.strokeRect(inset,inset,w-inset*2,h-inset*2);for(const x of [65,w-65])for(const y of [65,h-65]){c.save();c.translate(x,y);c.rotate(Math.PI/4);c.strokeRect(-13,-13,26,26);c.restore();}c.textAlign='center';c.fillStyle='#4a514a';c.font='30px serif';c.fillText(title,w/2,150);c.fillStyle='#283d3a';c.font='61px serif';c.fillText(subtitle,w/2,320);c.font='italic 24px serif';c.fillText('Presented to',w/2,425);c.font='48px serif';c.fillText('Josh Stefan Junarto',w/2,515);c.strokeStyle='#a89b73';c.beginPath();c.moveTo(370,555);c.lineTo(1230,555);c.stroke();c.font='29px serif';c.fillStyle='#4a514a';c.fillText(year,w/2,635);c.font='18px serif';c.fillText('A milestone along the way.',w/2,695);
   // Decorative guilloché rosette, deliberately without an institutional seal or signature.
   c.save();c.translate(w/2,864);c.strokeStyle=colour;c.lineWidth=1.2;for(let i=0;i<48;i++){c.rotate(Math.PI*2/48);c.beginPath();c.ellipse(0,0,91,39,0,0,Math.PI*2);c.stroke();}c.fillStyle=colour;c.beginPath();c.arc(0,0,54,0,Math.PI*2);c.fill();c.fillStyle='#e5dec4';c.font='19px serif';c.fillText(subtitle.includes('Merit')?'MERIT':'LEARN',0,6);c.restore();c.fillStyle='#938b73';c.font='13px monospace';c.fillText('DESIGNED AWARD REPRESENTATION / NOT THE ORIGINAL DOCUMENT',w/2,1032);});
  action(plane(wide,.76,basic('#ffffff',{map:tex}),frame,0,0,.058),'profile');return frame;
 }
 certificate(-1.85,2.1,-3.13,'IBM','AI Fundamentals','#87713d','');certificate(-.38,2.13,-3.13,'CISCO NETWORKING ACADEMY','Python Essentials 1','#4a6971','Completed · 22 February 2026',1.1);
 // Plants, curtain folds, pin notes, a switch plate and a ceiling pendant finish the room.
 function plant(x,y,z,size){const g=group(room,x,y,z);const terracotta=mat({color:'#8d6a51',roughness:.84});cyl(.12*size,.24*size,terracotta,g,0,.12*size,0);cyl(.105*size,.008,p.soil,g,0,.244*size,0);for(let i=0;i<8;i++){const a=i*2.4,end=[Math.cos(a)*.22*size,(.42+i*.025)*size,Math.sin(a)*.22*size];tube([[0,.22*size,0],end],.005*size,p.leaf,g);const leaf=ball(...end,.11*size,p.leaf,g,.55,1.8,.13);leaf.rotation.z=Math.sin(a)*.9;}return g;}
 plant(2.9,.07,2.3,1.5);box(.45,.65,.5,darkWood,room,-1.85,.425,-.25,.012);box(.48,.035,.53,wood,room,-1.85,.765,-.25,.008);plant(-1.85,.785,-.25,.55);const pcPlant=plant(.85,.8125,-2.12,.48);pcPlant.name='pc-plant';contact(room,.85,.8127,-2.12,.16,.16,.24);
 const curtainMat=mat({color:'#5e706b',map:fabricTex,roughness:.98,side:THREE.DoubleSide});for(const [x,w] of [[-2.12,.65],[2.9,.6]]){const geo=new THREE.PlaneGeometry(w,2.65,24,32);const pos=geo.attributes.position;for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin(pos.getX(i)*45)*.055);geo.computeVertexNormals();const curtain=mesh(geo,curtainMat,room,x,1.55,3.07);curtain.castShadow=true;curtain.userData.dynamic=true;curtains.push(curtain);}const rail=cyl(.016,5.8,p.metal,room,.3,2.9,3.08);rail.rotation.z=Math.PI/2;
 box(.065,.1,.015,p.paper,room,3.5,1.1,1.65).rotation.y=-Math.PI/2;const pendant=mesh(new THREE.ConeGeometry(.24,.25,32,1,true),mat({color:'#9c8b62',metalness:.65,roughness:.35,side:THREE.DoubleSide}),room,.4,2.68,-.2);cyl(.008,.19,p.black,room,.4,2.87,-.2);const bulb=ball(.4,2.58,-.2,.045,p.warm,room);
 const ceilingLight=new THREE.PointLight('#ffdbab',50,8,2);ceilingLight.position.set(.4,2.6,-.2);room.add(ceilingLight);const windowLight=new THREE.PointLight('#99c3d1',30,8,2);windowLight.position.set(1.2,2.2,2.7);room.add(windowLight);
 // Fine dust catches the light near the window, and curtains respond to the
 // open casement. Keep their movement quieter than the scroll journey.
 const dustGeo=new THREE.BufferGeometry(),dustPos=[];for(let i=0;i<95;i++)dustPos.push(-1+random()*4,.4+random()*2.2,random()*3);dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(dustPos,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#e6d9b0',size:.009,transparent:true,opacity:.22,depthWrite:false}));room.add(dust);
 animations.push(time=>{curtains.forEach((curtain,i)=>{curtain.rotation.y=Math.sin(time*.6+i)*.035*Math.min(1,Math.max(0,sceneProgress-1.8));});dust.rotation.y=Math.sin(time*.09)*.08;dust.position.y=Math.sin(time*.16)*.04;});
 return{room,photoFrames,props:{bed,mattress,blanket,floor,windowSkirting,screen,desk,DESK_TOP,mouse,mousePad,notes,projectBooks,pcPlant,pcTop,keyboard,monitorBase,speakers,cup,cupHandle,camera,cameraStrap,strapMounts,cabinetTop,clock,contactBoard},setProgress(q){sceneProgress=q;ceilingLight.intensity=34+Math.max(0,Math.min(1,(q-1.5)/.7))*12;windowLight.intensity=24;},setAccent(value){ember=value;taskLight.color.set(value?'#ffd0a6':'#ffd4a0');windowLight.color.set(value?'#dca592':'#99c3d1');ceilingLight.color.set(value?'#ffe0b7':'#ffdbab');drawDesktop();}};
}
