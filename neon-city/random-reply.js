// SPDX-License-Identifier: AGPL-3.0-only
let lastReply;

export function randomReply(lines,random=Math.random){
  const alternatives=lines.filter(line=>line!==lastReply);
  const choices=alternatives.length?alternatives:lines;
  lastReply=choices[Math.floor(random()*choices.length)];
  return lastReply;
}
