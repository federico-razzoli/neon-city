const TATTOOED_MAN={
  label:'Talk to the tattooed man',
  script:[
    {ask:'I LIKE YOUR TATTOOS!',answer:['NAH. THEY SUCK.']},
    {ask:'LIFE IS GOOD',answer:['SURE. IF YOU LIKE THINGS THAT SUCK.']},
    {ask:'BYE!',answer:['IT WAS GREAT TALKING TO YOU!'],ends:true},
  ],
  gifts:{
    flower:['THIS FLOWER SUCKS.','IT REALLY DOES.'],
    'pine-cone':['THIS PINE CONE SUCKS.','IT REALLY DOES.'],
  },
};
export const followupFor=(type,place)=>type===5&&['pub','river','footpath'].includes(place)?TATTOOED_MAN:null;
