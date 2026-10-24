// Stylized Big Dipper: Ursa Major's seven brightest pattern stars.
// Fixed game-world placement, independent of the randomly generated sky.
export const URSA_MAJOR=Object.freeze([
  {name:'Alkaid',bearing:-.68,elevation:.30},
  {name:'Mizar',bearing:-.60,elevation:.34},
  {name:'Alioth',bearing:-.52,elevation:.35},
  {name:'Megrez',bearing:-.44,elevation:.32},
  {name:'Dubhe',bearing:-.30,elevation:.34},
  {name:'Merak',bearing:-.31,elevation:.25},
  {name:'Phecda',bearing:-.42,elevation:.24},
].map(Object.freeze));

// Celestial objects have fixed world bearings and elevations, at infinite distance.
// Use the same perspective as the city, without camera translation. A seated
// viewer may pitch the view upwards, which lowers the horizon on screen.
export function projectSky(object, angle, width, focalLength, horizon, pitch=0) {
  const bearing=object.bearing-angle,c=Math.cos(object.elevation);
  const ahead=Math.cos(bearing)*c,up=Math.sin(object.elevation);
  const depth=ahead*Math.cos(pitch)+up*Math.sin(pitch),height=up*Math.cos(pitch)-ahead*Math.sin(pitch);
  if(depth<=0)return null;
  const x=width/2+focalLength*Math.sin(bearing)*c/depth;
  const y=horizon-focalLength*height/depth;
  if(x<0||x>=width||y<0||y>=skyHorizon(horizon,focalLength,pitch))return null;
  return {x,y};
}
// Screen row of the true horizon for a pitched view.
export const skyHorizon=(horizon,focalLength,pitch=0)=>pitch>=Math.PI/2-1e-6?Infinity:horizon+focalLength*Math.tan(pitch);
