// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';

const COLORS=['#162e22','#203d29','#2c5032','#3c643c','#527b45','#668951'].map(c=>new THREE.Color(c));
const LOBES=[[0,.9,0,.82,.73,.75],[-.57,.69,.08,.62,.57,.61],
  [.57,.83,.12,.64,.68,.58],[.12,.64,.62,.62,.49,.58],
  [-.18,.95,-.52,.64,.63,.59],[.3,1.19,-.13,.51,.54,.49]];

// Three.js generates the shrub surfaces and stems. The caller copies them into
// the park's retained GPU batch, then releases these temporary geometries.
export function createBushGeometries(bush){
  const geometries=[];
  for(const [cx,cy,cz,rx,ry,rz] of LOBES){
    const sphere=new THREE.SphereGeometry(1,10,6),p=sphere.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const noise=Math.sin(x*12.9898+y*39.346+z*78.233+bush.x*3.1+bush.z*7.3)*43758.5453;
      const radius=.91+(noise-Math.floor(noise))*.18;
      p.setXYZ(i,x*radius,y*radius,z*radius);
    }
    sphere.scale(rx,ry,rz);
    const geometry=sphere.toNonIndexed();sphere.dispose();
    geometry.computeVertexNormals();
    const colors=[],normal=geometry.attributes.normal;
    for(let i=0;i<normal.count;i+=3){
      const light=normal.getY(i)*.65+normal.getX(i)*.25+normal.getZ(i)*.1;
      const color=COLORS[Math.max(0,Math.min(5,Math.round(2.5+light*2.5)))];
      for(let j=0;j<3;j++)colors.push(color.r,color.g,color.b);
    }
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.translate(bush.x+cx,cy,-bush.z-cz);geometries.push(geometry);
  }
  for(const dx of [-.24,0,.28]){
    const stem=new THREE.CylinderGeometry(.055,.085,.425,5);
    stem.translate(bush.x+dx,.2675,-bush.z);
    const colors=[],color=new THREE.Color('#423133');
    for(let i=0;i<stem.attributes.position.count;i++)colors.push(color.r,color.g,color.b);
    stem.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometries.push(stem);
  }
  return geometries;
}
