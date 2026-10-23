import {fromOld} from './geo.js';
// Shaded 3D billows with soft edges. Whole banks move aside before descent;
// the lens never needs to fly through an opaque card or a clipped volume box.
export function buildClouds(city,k){const {THREE:T,random}=k,banks=[],geometry=new T.SphereGeometry(1,24,16);
 const material=new T.MeshStandardMaterial({color:'#3b5672',roughness:1,transparent:true,opacity:.24,depthWrite:false});
 material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>\nfloat edge=abs(dot(normal,normalize(vViewPosition)));diffuseColor.a*=smoothstep(.02,.7,edge);`);};
 for(const side of [-1,1]){const bank=new T.Group();bank.userData.dynamic=true;bank.position.fromArray(fromOld([-720+side*260,305,1130+side*180]));city.add(bank);for(let i=0;i<42;i++){const a=i*2.399,r=Math.sqrt(random()),puff=new T.Mesh(geometry,material),size=22+random()*48;puff.position.set(Math.cos(a)*r*175,(random()-.5)*36,Math.sin(a)*r*120);puff.scale.set(size*(1.1+random()*.6),size*(.6+random()*.25),size);bank.add(puff);}banks.push({bank,base:bank.position.clone(),side});}
 return{setProgress(q){const t=T.MathUtils.smoothstep(q,.015,.4);material.opacity=.24*(1-t*.5);for(const b of banks){b.bank.position.set(b.base.x+b.side*t*520,b.base.y+t*65,b.base.z+b.side*t*360);b.bank.visible=q<.65;}}};}
