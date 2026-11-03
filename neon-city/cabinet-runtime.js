// This script and the selected game live only in the disposable cabinet frame.
window.createCabinetGame=async name=>{
  switch(name){
    case 'BYKER':{const {Byker}=await import('./byker.js?v=9');return new Byker();}
    case 'GHOST':{const {Ghost}=await import('./ghost.js?v=4');return new Ghost();}
    case 'PUNCH':{const {Punch}=await import('./punch.js?v=2');return new Punch();}
    case 'SUPER':{const {Super}=await import('./super.js?v=1');return new Super();}
    case 'METEORS':{const {Meteors}=await import('./meteors.js?v=3');return new Meteors();}
    case 'AMIGOS':{const {Amigos}=await import('./amigos.js?v=1');return new Amigos();}
    case 'PING':{const {Ping}=await import('./ping.js?v=game-over-2');return new Ping();}
    case 'GROG':{const {Frog}=await import('./frog.js?v=grog-forward-1');return new Frog();}
    case 'KONGY KONG':{const {KongyKong}=await import('./kongy-kong.js?v=monkey-stomp-6');return new KongyKong();}
    default:throw new Error('Unknown cabinet game');
  }
};
