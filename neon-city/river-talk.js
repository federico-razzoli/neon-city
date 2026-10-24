import {PubConversation} from './pub-life.js?v=bumps-1';
import {riverLines} from './world.js?v=talk-11';

// A walk away shorter than this keeps the conversation going; a longer one
// starts it again from the first line, like sitting down at a pub table.
export const RIVER_TALK_MEMORY=5;
export const talksOnPromenade=walker=>riverLines(walker.type).length>0;

// A promenade walker with river lines talks to the player who blocks their
// way. They say their first line at once, in place of the bump notice, then
// carry on as a pub conversation does while the player stays in their way.
export class RiverTalk{
  constructor(random=Math.random){this.random=random;this.walker=null;this.conversation=null;this.apart=0;}
  // Contacts are the promenade walkers the player bumped or blocked this frame.
  // Returns the line that is due now, if any.
  update(dt,contacts){
    const walker=contacts.find(talksOnPromenade);
    if(!walker){
      this.apart+=dt;
      if(this.apart>=RIVER_TALK_MEMORY){this.walker=null;this.conversation=null;}
      return null;
    }
    this.apart=0;
    if(walker!==this.walker){
      this.walker=walker;
      this.conversation=new PubConversation(riverLines(walker.type),this.random);
      this.conversation.wait=0;
    }
    return this.conversation.update(dt);
  }
}
