import {PubConversation} from './pub-life.js?v=enter-talk-1';
import {placeLines} from './world.js?v=talk-13';

// A walk away shorter than this keeps the conversation going; a longer one
// starts it again from the first line, like sitting down at a pub table.
export const TALK_MEMORY=5;
// A contact is a walker and where they are: 'river', 'footpath' or null.
export const talksHere=({walker,place})=>placeLines(walker.type,place).length>0;

// A walker with lines for their place talks to the player who blocks their
// way. They say their first line at once, in place of the bump notice, then
// carry on as a pub conversation does while the player stays in their way.
export class WalkerTalk{
  constructor(random=Math.random){this.random=random;this.walker=null;this.place=null;this.conversation=null;this.apart=0;}
  advance(){return this.apart===0?this.conversation?.advance()??null:null;}
  // Contacts are the walkers the player bumped or blocked this frame.
  // Returns the line that is due now, if any.
  update(dt,contacts){
    const contact=contacts.find(talksHere);
    if(!contact){
      this.apart+=dt;
      if(this.apart>=TALK_MEMORY){this.walker=null;this.place=null;this.conversation=null;}
      return null;
    }
    this.apart=0;
    const {walker,place}=contact;
    if(walker!==this.walker||place!==this.place){
      this.walker=walker;this.place=place;
      this.conversation=new PubConversation(placeLines(walker.type,place),this.random);
      this.conversation.wait=0;
    }
    return this.conversation.update(dt);
  }
}
