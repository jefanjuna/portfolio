import {Reflector} from 'three/addons/objects/Reflector.js';

// Mapped shoreline, small displaced swells, multi-scale normals and softened,
// broken reflections. The height stays above the terrain and below the quays.
export function buildBayWater(city,k,map){
 const {THREE:T}=k,shapes=map.water.map(r=>new T.Shape(r.map(([x,z])=>new T.Vector2(x,-z)))),source=new T.ShapeGeometry(shapes),plain=source.toNonIndexed(),position=plain.attributes.position,vertices=[];
 let triangleCount=0;
 function refine(a,b,c,depth=0){
  const points=[a,b,c],lengths=[a.distanceToSquared(b),b.distanceToSquared(c),c.distanceToSquared(a)],i=lengths.indexOf(Math.max(...lengths)),near=Math.min(a.x,b.x,c.x)<2000&&Math.max(a.x,b.x,c.x)>-1100&&Math.min(a.y,b.y,c.y)<700&&Math.max(a.y,b.y,c.y)>-2100,limit=near?32:650;
  if(lengths[i]>limit*limit&&depth<22&&triangleCount<140000){const x=points[i],y=points[(i+1)%3],z=points[(i+2)%3],mid=x.clone().add(y).multiplyScalar(.5);refine(x,mid,z,depth+1);refine(mid,y,z,depth+1);return;}
  vertices.push(...a.toArray(),...b.toArray(),...c.toArray());triangleCount++;
 }
 for(let i=0;i<position.count;i+=3)refine(new T.Vector3().fromBufferAttribute(position,i),new T.Vector3().fromBufferAttribute(position,i+1),new T.Vector3().fromBufferAttribute(position,i+2));
 source.dispose();plain.dispose();const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
 const water=new Reflector(geometry,{textureWidth:innerWidth<700?512:1024,textureHeight:innerWidth<700?512:1024,clipBias:.003,color:0x3a657a,multisample:0});water.rotation.x=-Math.PI/2;water.position.y=-.12;water.userData.dynamic=true;water.userData.waveTriangles=triangleCount;city.add(water);
 // Keep reflection clipping explicit: the renderer uses logarithmic depth, so
 // clipping only through the reflected projection's near row is insufficient.
 const reflectionSource=new T.PerspectiveCamera(),reflect=water.onBeforeRender,reflectionPlane=new T.Plane(new T.Vector3(0,1,0),.12);let reflectionMaterials;
 water.onBeforeRender=function(renderer,scene,camera,...args){
  if(!reflectionMaterials){const materials=new Set();scene.traverse(object=>{for(const material of Array.isArray(object.material)?object.material:[object.material])if(material&&(material.isMeshStandardMaterial||material.isMeshBasicMaterial||material.isMeshPhongMaterial))materials.add(material);});reflectionMaterials=[...materials].map(material=>({material,source:null,clipped:[],saved:null}));}
  for(const entry of reflectionMaterials){entry.saved=entry.material.clippingPlanes;if(entry.source!==entry.saved||!entry.clipped.length){entry.source=entry.saved;entry.clipped=[...(entry.saved||[]),reflectionPlane];}entry.material.clippingPlanes=entry.clipped;}
  // The reflected camera reverses its horizontal axis. Mirror the principal
  // point too, so an off-centre story composition still covers the whole view.
  reflectionSource.copy(camera,false);reflectionSource.projectionMatrix.elements[8]*=-1;reflectionSource.projectionMatrixInverse.copy(reflectionSource.projectionMatrix).invert();
  try{reflect.call(this,renderer,scene,reflectionSource,...args);}finally{for(const entry of reflectionMaterials)entry.material.clippingPlanes=entry.saved;}
 };
 const waves=`
 uniform float time;
 float hashWater(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noiseWater(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hashWater(i),hashWater(i+vec2(1.,0.)),f.x),mix(hashWater(i+vec2(0.,1.)),hashWater(i+vec2(1.,1.)),f.x),f.y);}
 float swell(vec2 p){vec2 q=p+vec2(noiseWater(p*.035+time*.013),noiseWater(p*.027-time*.011))*16.;return .035*sin(dot(q,vec2(.13,.19))-time*.72+noiseWater(p*.12)*4.)+.018*sin(dot(q,vec2(-.42,.28))+time*1.07+noiseWater(p*.23)*3.)+.012*(noiseWater(p*.85+vec2(-time*.24,time*.09))-.5);}
 `;
 water.material.uniforms.time={value:0};
 water.material.vertexShader=water.material.vertexShader.replace('varying vec4 vUv;',`varying vec4 vUv;varying vec3 waterPoint;${waves}`).replace('vUv = textureMatrix * vec4( position, 1.0 );','vec3 waved=position;vec3 basePoint=(modelMatrix*vec4(position,1.)).xyz;waved.z+=swell(basePoint.xz);waterPoint=(modelMatrix*vec4(waved,1.)).xyz;vUv=textureMatrix*vec4(waved,1.);').replace('projectionMatrix * modelViewMatrix * vec4( position, 1.0 )','projectionMatrix * modelViewMatrix * vec4( waved, 1.0 )');
 water.material.fragmentShader=water.material.fragmentShader.replace('varying vec4 vUv;',`varying vec4 vUv;varying vec3 waterPoint;${waves}`).replace('vec4 base = texture2DProj( tDiffuse, vUv );',`
 vec2 p=waterPoint.xz;float e=.18;
 vec2 slope=vec2(swell(p+vec2(e,0.))-swell(p-vec2(e,0.)),swell(p+vec2(0.,e))-swell(p-vec2(0.,e)))/(2.*e);
 vec3 normal=normalize(vec3(-slope.x*9.,1.,-slope.y*9.));vec3 view=normalize(cameraPosition-waterPoint);
 // Do not stretch the last bright texel row across water outside the mirror
 // camera's image as the window/viewport angle changes.
 vec2 uv=vUv.xy/max(vUv.w,.0001)+normal.xz*.009;
 vec2 edge=smoothstep(vec2(.002),vec2(.035),uv)*(1.-smoothstep(vec2(.965),vec2(.998),uv));
 float reflectionCoverage=edge.x*edge.y*step(.0001,vUv.w);
 uv=clamp(uv,vec2(.003),vec2(.997));vec2 blur=vec2(.0015,.0024);
 vec4 base=texture2D(tDiffuse,uv)*.36;
 base+=texture2D(tDiffuse,clamp(uv+blur,vec2(.003),vec2(.997)))*.16;
 base+=texture2D(tDiffuse,clamp(uv-blur,vec2(.003),vec2(.997)))*.16;
 base+=texture2D(tDiffuse,clamp(uv+vec2(-blur.x,blur.y),vec2(.003),vec2(.997)))*.16;
 base+=texture2D(tDiffuse,clamp(uv+vec2(blur.x,-blur.y),vec2(.003),vec2(.997)))*.16;
 base.rgb=mix(vec3(.008,.034,.049),base.rgb,reflectionCoverage);
 `).replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );',`
 float fresnel=.15+.55*pow(1.-max(0.,dot(normal,view)),3.);
 vec3 moon=normalize(vec3(.4,.72,-.45));float glint=pow(max(0.,dot(reflect(-moon,normal),view)),55.);
 float ridge=pow(max(0.,normal.z*.6-normal.x*.4),2.);
 vec3 deep=vec3(.008,.034,.049)+vec3(.022,.056,.065)*ridge;
 vec3 shade=mix(deep,base.rgb,fresnel)+vec3(.2,.29,.33)*glint;
 gl_FragColor=vec4(shade,1.);
 `);
 water.material.needsUpdate=true;k.animations.push(t=>water.material.uniforms.time.value=t);return water;
}
