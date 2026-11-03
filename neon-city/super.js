// SUPER has crashed. Inspecting the error screen is always free.
export class Super{
  kind='super';width=640;height=360;over=true;
  update(){}
  draw(ctx){
    ctx.fillStyle='#0000aa';ctx.fillRect(0,0,640,360);
    ctx.font='16px monospace';ctx.textAlign='center';
    ctx.fillStyle='#c0c0c0';ctx.fillRect(286,35,68,23);
    ctx.fillStyle='#0000aa';ctx.fillText('SUPER',320,52);
    ctx.textAlign='start';ctx.fillStyle='#fff';ctx.font='13px monospace';
    const lines=[
      'A fatal exception 0E has occurred at 0028:C0005EED',
      'in SUPER.EXE. The current game will be terminated.',
      '',
      '* Press any key to pretend this might help.',
      '* Press CTRL+ALT+DEL to lose all hope.',
      '',
      '  Any unsaved high scores have been lost.',
      '  The cabinet is having a very bad day.',
      '',
      '  No tokens were harmed in this crash.'
    ];
    lines.forEach((line,i)=>ctx.fillText(line,36,95+i*20));
    ctx.textAlign='center';ctx.fillText('SPACE / ESC TO RETURN TO THE ARCADE',320,330);ctx.textAlign='start';
  }
}
