export const FRAME={"origin": [1.28134, 103.852972], "anchor": [10.131597919338851, 6.532402544350395], "xAxis": [0.8724005672210904, 0.48879162258811243], "zAxis": [-0.48879162258811243, 0.8724005672210904], "facadeZ": 3.3};
export function fromOld(p){const x=p[0]-FRAME.anchor[0],z=p[2]-FRAME.anchor[1];return[x*FRAME.xAxis[0]+z*FRAME.xAxis[1],p[1],x*FRAME.zAxis[0]+z*FRAME.zAxis[1]+3.3];}
export function fromGeo(lat,lon){const n=(lat-FRAME.origin[0])*111320,e=(lon-FRAME.origin[1])*111292;return fromOld([.33*e-.94398*n,0,.94398*e+.33*n]);}
