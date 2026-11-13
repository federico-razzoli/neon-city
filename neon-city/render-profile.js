// SPDX-License-Identifier: AGPL-3.0-only
// User Timing events remain visible in Chromium traces, but entries are cleared
// immediately so long play sessions do not accumulate a performance timeline.
export function startPhase(name){performance.mark?.(`${name}:start`);}
export function endPhase(name){
  if(!performance.measure)return;
  performance.mark(`${name}:end`);
  performance.measure(name,`${name}:start`,`${name}:end`);
  performance.clearMarks(`${name}:start`);performance.clearMarks(`${name}:end`);performance.clearMeasures(name);
}
export function profilePhase(name,draw){startPhase(name);try{return draw();}finally{endPhase(name);}}
