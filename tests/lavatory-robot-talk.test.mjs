import test from 'node:test';
import assert from 'node:assert/strict';
import {WalkerTalk} from '../neon-city/walker-talk.js';
import {followupFor} from '../neon-city/npc-dialogue.js';
import {StaffTalk} from '../neon-city/pub-interior.js';

test('lavatory robot finishes its passive lines and offers the interactive follow-up',()=>{
  const talk=new WalkerTalk(()=>0),walker={type:11},contact=[{walker,place:'lavatory'}],lines=[];
  for(let i=0;i<14;i++){const line=talk.update(1,contact);if(line)lines.push(line);}
  assert.deepEqual(lines,['I FEEL MUCH BETTER NOW!','ROBOTS NEED TO GO TO THE TOILET, TOO.','ACTUALLY, MORE OFTEN THAN HUMANS.','BUT NOT AS OFTEN AS LADYBUGS.']);
  assert.equal(talk.conversation.ready,true);
  assert.deepEqual(talk.conversation.followup,followupFor(11,'lavatory'));
  assert.equal(followupFor(11,'pub'),null);
});

test('robot options give exact replies and paranormal question requires remembered activity',()=>{
  const {script}=followupFor(11,'lavatory'),record={},talk=new StaffTalk(script,record);
  const unusual='HAVE YOU SEEN OR HEARD ANYTHING UNUSUAL IN THE TOILET?';
  assert.equal(talk.script.some(o=>o.ask===unusual),false);
  for(const [ask,answer] of [['BUT HOW DO YOU PEE?',"THAT'S A PRIVATE QUESTION."],['YOU SAID... LADYBUGS?','YES. THE HIGHEST FORM OF LIFE IN YOUR GALAXY!']]){
    talk.confirm(talk.script.findIndex(o=>o.ask===ask));assert.equal(talk.line,answer);talk.confirm();
  }
  record.PUB_PARANORMAL_ACTIVITIES=true;
  talk.confirm(talk.script.findIndex(o=>o.ask===unusual));
  for(const line of ['YES. A WEIRD GIRL SINGING A WEIRD SONG IN A CUBICLE.',"I DIDN'T GET EVERY WORD, BUT IT WAS ABOUT...",'A COW, I THINK.']){
    assert.equal(talk.line,line);talk.confirm();
  }
  assert.equal(talk.over,false);talk.confirm(talk.script.findIndex(o=>o.ends));talk.confirm();assert.equal(talk.over,true);
});
