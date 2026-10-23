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
