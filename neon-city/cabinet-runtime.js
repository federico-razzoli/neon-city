// This script and the selected game live only in the disposable cabinet frame.
window.createCabinetGame=async name=>{
  switch(name){
    case 'AMIGOS':{const {Amigos}=await import('./amigos.js?v=1');return new Amigos();}
    case 'PING':{const {Ping}=await import('./ping.js?v=game-over-2');return new Ping();}
    case 'GROG':{const {Frog}=await import('./frog.js?v=grog-screens-1');return new Frog();}
    case 'KONGY KONG':{const {KongyKong}=await import('./kongy-kong.js?v=monkey-stomp-6');return new KongyKong();}
    default:throw new Error('Unknown cabinet game');
  }
};
