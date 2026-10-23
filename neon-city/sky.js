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
// Use the same perspective as the city, without camera translation.
export function projectSky(object, angle, width, focalLength, horizon) {
  const bearing=object.bearing-angle, depth=Math.cos(bearing);
  if(depth<=0)return null;
  const x=width/2+focalLength*Math.sin(bearing)/depth;
  const y=horizon-focalLength*Math.tan(object.elevation)/depth;
  if(x<0||x>=width||y<0||y>=horizon)return null;
  return {x,y};
}
