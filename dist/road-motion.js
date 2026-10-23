import {ROAD_JOURNEY,ROAD_LENGTH,sampleRoad} from './journey.js';
export const ROAD_START=.9,ROAD_END=1.6;
const turns=[];
for(let i=1;i<ROAD_JOURNEY.length-1;i++){const a=ROAD_JOURNEY[i-1].p,b=ROAD_JOURNEY[i].p,c=ROAD_JOURNEY[i+1].p,u=[b[0]-a[0],b[2]-a[2]],v=[c[0]-b[0],c[2]-b[2]],angle=Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v)))));if(angle>Math.PI/7)turns.push({s:ROAD_JOURNEY[i].s,angle});}
const pacing=[{s:0,w:0}];let total=0;
for(let s=1;s<=Math.ceil(ROAD_LENGTH);s++){const end=Math.min(s,ROAD_LENGTH),mid=(end+pacing.at(-1).s)/2,weight=1+turns.reduce((n,t)=>n+2.8*Math.min(1,t.angle/(Math.PI/2))*Math.exp(-(((mid-(t.s-22))/20)**2)),0);total+=(end-pacing.at(-1).s)*weight;pacing.push({s:end,w:total});}
function interpolate(value,from,to){let lo=0,hi=pacing.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(pacing[m][from]<value)lo=m;else hi=m;}const a=pacing[lo],b=pacing[hi],t=Math.max(0,Math.min(1,(value-a[from])/(b[from]-a[from]||1)));return a[to]+(b[to]-a[to])*t;}
export function roadProgressAt(s){return ROAD_START+interpolate(Math.max(0,Math.min(ROAD_LENGTH,s)),'s','w')/total*(ROAD_END-ROAD_START);}
export function roadDistanceAt(q){return interpolate(Math.max(0,Math.min(1,(q-ROAD_START)/(ROAD_END-ROAD_START)))*total,'w','s');}
export function sampleRoadPose(s){const p=sampleRoad(s).p,a=sampleRoad(Math.max(0,s-12)).p,b=sampleRoad(Math.min(ROAD_LENGTH,s+12)).p;return{p,yaw:Math.atan2(b[0]-a[0],b[2]-a[2])};}
export const TURN_PACING=turns.map(t=>({...t,progressSpan:roadProgressAt(t.s+20-22)-roadProgressAt(t.s-20-22),oldProgressSpan:40/ROAD_LENGTH*(ROAD_END-ROAD_START)}));
