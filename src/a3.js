
/* ---------- drum rendering ---------- */
function tPath(t,open){var h=t.w/2,y0=-(t.tip+t.len),y1=-(t.tip+h);return 'M'+(-h)+' '+y0+'L'+(-h)+' '+y1+'A'+h+' '+h+' 0 0 0 '+h+' '+y1+'L'+h+' '+y0+(open?'':'Z')}
function labelInfo(t){var fs=t.w>=60?27:t.w>=44?22:19;var p=pt(t.angle+cfg.set.rot,t.tip+t.w/2);return {x:p[0],y:p[1],fs:fs}}
function labelText(t){var m=cfg.hint.labels;if(m==='hidden'||(G&&G.on&&cfg.game.hide))return '';if(m==='solfege')return SOL[t.deg-1];if(m==='note')return NAMES[t.deg-1];return String(t.deg)}
function faceDefs(sk,id){var a=sk.face,b=sk.face2||mix(sk.face,'#000000',.25),U=' gradientUnits="userSpaceOnUse"';
 if(sk.fin==='grad'&&sk.grad){var g=sk.grad;return '<linearGradient id="'+id+'"'+U+' x1="40" y1="40" x2="560" y2="560">'+g.map(function(c,i){return '<stop offset="'+(i/(g.length-1))+'" stop-color="'+c+'"/>'}).join('')+'</linearGradient>'}
 if(sk.fin==='linear')return '<linearGradient id="'+id+'"'+U+' x1="0" y1="0" x2="600" y2="600"><stop offset="0" stop-color="'+mix(a,'#ffffff',.1)+'"/><stop offset=".5" stop-color="'+a+'"/><stop offset="1" stop-color="'+b+'"/></linearGradient>';
 if(sk.fin==='galaxy')return '<radialGradient id="'+id+'"'+U+' cx="204" cy="180" r="540"><stop offset="0" stop-color="'+b+'"/><stop offset=".35" stop-color="'+mix(b,a,.55)+'"/><stop offset=".8" stop-color="'+a+'"/></radialGradient>';
 return '<radialGradient id="'+id+'"'+U+' cx="300" cy="300" r="300"><stop offset="0" stop-color="'+mix(a,'#ffffff',.07)+'"/><stop offset=".62" stop-color="'+a+'"/><stop offset="1" stop-color="'+b+'"/></radialGradient>'}
function drumHTML(Lay,sk,uid,mini){
 var rot=cfg.set.rot,fc='fc'+uid,fg='fg'+uid,rg='rg'+uid,mg='mg'+uid,cut=sk.style==='cut';
 var s='<defs><clipPath id="'+fc+'"><circle cx="300" cy="300" r="286"/></clipPath>'+faceDefs(sk,fg)
  +'<linearGradient id="'+rg+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+mix(sk.rim,'#ffffff',.38)+'"/><stop offset=".5" stop-color="'+sk.rim+'"/><stop offset="1" stop-color="'+mix(sk.rim,'#000000',.38)+'"/></linearGradient>'
  +'<linearGradient id="'+mg+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+mix(sk.tongue,'#ffffff',.22)+'"/><stop offset="1" stop-color="'+mix(sk.tongue,'#000000',.22)+'"/></linearGradient></defs>';
 s+='<circle cx="300" cy="300" r="298" fill="url(#'+rg+')"/><circle cx="300" cy="300" r="289.5" fill="'+mix(sk.rim,'#000000',.5)+'"/><circle cx="300" cy="300" r="286" fill="url(#'+fg+')"/>';
 if(sk.pattern&&sk.pattern!=='none')s+='<g clip-path="url(#'+fc+')" opacity="'+sk.patOp+'"><g fill="none" stroke="'+sk.pat+'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+patMarkup(sk.pattern,sk.pat,'url(#'+fg+')')+'</g></g>';
 s+='<circle cx="300" cy="300" r="283" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="6"/>';
 var base=sk.style==='metal'?'url(#'+mg+')':cut?'transparent':sk.tongue,fo=sk.style==='metal'?'.97':cut?'1':'.93';
 s+='<g class="tongues">';
 Lay.tongues.forEach(function(t){var tr='translate(300 300) rotate('+(t.angle+rot)+')';
  s+='<g class="tg" data-id="'+t.id+'" transform="'+tr+'"><path class="tf" d="'+tPath(t)+'" fill="'+base+'" fill-opacity="'+fo+'" pointer-events="all"/>'
   +(mini?'':'<path class="nx" d="'+tPath(t,true)+'" fill="none" stroke-width="5" stroke-linecap="round" opacity="0" pointer-events="none"/>')
   +'<path class="tl" d="'+tPath(t,true)+'" fill="none" stroke="'+sk.line+'" stroke-width="'+(cut?3:2.2)+'" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/></g>'});
 s+='</g>';
 if(!mini){
  s+='<g class="labels" pointer-events="none">';
  Lay.tongues.forEach(function(t){var li=labelInfo(t),tx=labelText(t),lab=cfg.hint.labels,fs=lab==='jianpu'?li.fs:li.fs*(tx.length>2?.56:.68);
   s+='<g class="lb" data-id="'+t.id+'">';
   s+='<g class="lt" fill="'+sk.num+'"'+(cut?' stroke="'+sk.face+'" stroke-width="'+f1(li.fs*.26)+'" stroke-opacity=".85" stroke-linejoin="round" paint-order="stroke"':'')+'><text x="'+f1(li.x)+'" y="'+f1(li.y)+'" text-anchor="middle" dominant-baseline="central" font-family="Outfit,Noto Sans TC,sans-serif" font-weight="600" font-size="'+f1(fs)+'">'+tx+'</text>';
   if(tx&&t.oct!==0){var dy=t.oct>0?-(li.fs*.72):(li.fs*.72);s+='<circle cx="'+f1(li.x)+'" cy="'+f1(li.y+dy)+'" r="'+(li.fs>22?2.8:2.3)+'"/>'}
   s+='</g></g>'});
  s+='</g>'}
 return s}
