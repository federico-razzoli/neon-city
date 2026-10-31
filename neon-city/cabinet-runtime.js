// This script and the selected game live only in the disposable cabinet frame.
window.createCabinetGame=async name=>{
  switch(name){
    case 'PING':{const {Ping}=await import('./ping.js?v=game-over-2');return new Ping();}
    case 'GROG':{const {Frog}=await import('./frog.js?v=grog-screens-1');return new Frog();}
    case 'KONGY KONG':{const {KongyKong}=await import('./kongy-kong.js?v=hammer-3');return new KongyKong();}
    default:throw new Error('Unknown cabinet game');
  }
};
