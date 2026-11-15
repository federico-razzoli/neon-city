// SPDX-License-Identifier: AGPL-3.0-only
import {createThreeStreetScene} from './three-street-scene.js';
import {createInteriorCamera,updateInteriorCamera} from './three-interior-scene.js';

// Owns the exterior for one interior visit. A venue supplies window visibility,
// a street frame plus world-to-room transform, room-space clipping planes, and
// full interior frames for preparation viewpoints. The final room draw must
// clear the preparation draws before presenting. Disposal releases the exterior;
// this component never transfers interior resources back to an outdoor scene.
export function createVenueStreetWindow(scene,{
  windowViewFor,streetViewFor,clippingPlanes=[],preparationViews=()=>[],
  canUpdate=()=>true,
  createStreet=createThreeStreetScene,streetScene=null
}){
  let street=streetScene,windowView=null;
  street?.setBoundsVisible?.((...bounds)=>windowView?.boundsVisible(...bounds)??true);
  const background=scene.background;
  return {
    prepare(renderer,frame){
      // Retention alone cannot warm unseen walls or the clipped shader variants.
      // Upload them on entry rather than on the first visible window frame.
      if(!canUpdate(frame))return;
      const camera=createInteriorCamera(),autoClear=renderer.autoClear;
      try{
        // Use the same output as the final room draw so shader color-space
        // variants match. The room clears these draws before this frame presents.
        renderer.autoClear=true;
        for(const view of preparationViews(frame)){
          this.update(view);updateInteriorCamera(camera,{position:view.player,eye:view.eye,pitch:view.playerSeat?.pitch??0,indoors:true});
          renderer.render(scene,camera);
        }
      }finally{
        renderer.autoClear=autoClear;
        this.update(frame);
      }
    },
    update(frame){
      if(!canUpdate(frame))return;
      windowView=windowViewFor(frame);
      if(!windowView.visible){if(street)street.scene.visible=false;return;}
      street??=createStreet({boundsVisible:(...bounds)=>windowView.boundsVisible(...bounds)});
      street.scene.visible=true;
      if(street.scene.parent!==scene)scene.add(street.scene);
      const view=streetViewFor(frame,windowView.boundsVisible);street.update(view.frame);
      // Clip in the composed room's world space using the venue's planes.
      street.scene.traverse(object=>{
        for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[]){
          if(material.clippingPlanes===clippingPlanes)continue;
          material.clippingPlanes=clippingPlanes;material.needsUpdate=true;
        }
      });
      street.scene.matrixAutoUpdate=false;street.scene.matrix.copy(view.transform);street.scene.matrixWorldNeedsUpdate=true;
      scene.background=street.scene.background;
    },
    dispose(){if(street){scene.remove(street.scene);street.dispose();street=null;}scene.background=background;}
  };
}
