// SPDX-License-Identifier: AGPL-3.0-only
// The display implementation belongs to this disposable arcade realm. Return
// its import promise explicitly so iframe load never races module readiness.
window.createCabinetDisplay=async(canvas,options)=>{
  const {createCabinetRenderer}=await import('./cabinet-renderer.js');
  return createCabinetRenderer(canvas,options);
};
