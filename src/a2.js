(function(){
'use strict';
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var clamp=function(v,a,b){return Math.min(b,Math.max(a,v))};
var store={get:function(k,d){try{var v=localStorage.getItem('tdc.'+k);return v?JSON.parse(v):d}catch(e){return d}},set:function(k,v){try{localStorage.setItem('tdc.'+k,JSON.stringify(v))}catch(e){}}};

/* ---------- colour helpers ---------- */
function hex2rgb(h){h=String(h).replace('#','');if(h.length===3)h=h.split('').map(function(c){return c+c}).join('');var n=parseInt(h,16)||0;return [(n>>16)&255,(n>>8)&255,n&255]}
function rgb2hex(r,g,b){return '#'+[r,g,b].map(function(v){return Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')}).join('')}
function mix(a,b,t){var A=hex2rgb(a),B=hex2rgb(b);return rgb2hex(A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t)}
function lum(h){var c=hex2rgb(h).map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function textOn(h){return lum(h)>.4?'#15171D':'#FFFFFF'}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function rng(seed){return function(){seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- drum layouts (600x600, centre 300,300; angle clockwise from 12 o'clock) ---------- */
var RAW={
 d11:{name:'D調 11 音',baseR:262,rows:[
  ['L5',5,-1,57,0,-80,104,'a',150],['L6',6,-1,59,0,100,80,'a'],['M7',7,0,73,35,128,68,'r'],['M5',5,0,69,70,128,70,'r'],
  ['M3',3,0,66,105,128,72,'r'],['M1',1,0,62,141,124,74,'r'],['L7',7,-1,61,180,112,80,'a'],['M2',2,0,64,215,124,74,'l'],
  ['M4',4,0,67,253,128,72,'l'],['M6',6,0,71,286,128,70,'l'],['H1',1,1,74,321,132,66,'l']]},
 d15:{name:'D調 15 音',baseR:262,rows:[
  ['L3',3,-1,54,180,-92,100,'a',160],['H3',3,1,78,0,188,40,'a'],['M3',3,0,66,25,118,72,'r'],['H1',1,1,74,47,188,42,'r'],
  ['M1',1,0,62,70,112,74,'r'],['M6',6,0,71,96,176,46,'r'],['L6',6,-1,59,122,100,82,'r'],['M4',4,0,67,151,168,50,'r'],
  ['L4',4,-1,55,180,100,88,'a'],['M5',5,0,69,211,168,50,'l'],['L5',5,-1,57,240,104,84,'l'],['M7',7,0,73,266,176,44,'l'],
  ['L7',7,-1,61,291,110,78,'l'],['H2',2,1,76,313,188,42,'l'],['M2',2,0,64,335,118,74,'l']]}
};
function buildLayout(k){var r=RAW[k];var ts=r.rows.map(function(a){return {id:a[0],deg:a[1],oct:a[2],midi:a[3],angle:a[4],tip:a[5],w:a[6],hand:a[7],len:a[8]||(r.baseR-a[5])}});
 var by={},bm=new Map();ts.forEach(function(t){by[t.id]=t;bm.set(t.midi,t)});
 var ms=ts.map(function(t){return t.midi});
 return {id:k,name:r.name,tongues:ts,byId:by,byMidi:bm,pcs:new Set(ms.map(function(m){return m%12})),min:Math.min.apply(null,ms),max:Math.max.apply(null,ms)}}
var LAY={d11:buildLayout('d11'),d15:buildLayout('d15')};
var SOL=['Do','Re','Mi','Fa','Sol','La','Ti'],NAMES=['D','E','F♯','G','A','B','C♯'];

/* ---------- pattern geometry ---------- */
function f1(v){return Math.round(v*10)/10}
function pt(a,r){var x=a*Math.PI/180;return [300+r*Math.sin(x),300-r*Math.cos(x)]}
function ps(a,r){var p=pt(a,r);return f1(p[0])+' '+f1(p[1])}
function Yr(r){return f1(300-r)}
function rotN(n,fn,off){var s='';for(var i=0;i<n;i++)s+='<g transform="rotate('+f1(360/n*i+(off||0))+' 300 300)">'+fn(i)+'</g>';return s}
function circ(r,ex){return '<circle cx="300" cy="300" r="'+f1(r)+'" '+(ex||'')+'/>'}
function dot(a,r,rad,c){var p=pt(a,r);return '<circle cx="'+f1(p[0])+'" cy="'+f1(p[1])+'" r="'+rad+'" fill="'+c+'" stroke="none"/>'}
function petal(r0,r1,w,ex){var m=(r0+r1)/2;return '<path d="M300 '+Yr(r0)+'Q'+f1(300+w)+' '+Yr(m)+' 300 '+Yr(r1)+'Q'+f1(300-w)+' '+Yr(m)+' 300 '+Yr(r0)+'Z" '+(ex||'')+'/>'}
function petalC(r0,r1,w,ex){var h=r1-r0;return '<path d="M300 '+Yr(r0)+'C'+f1(300+w)+' '+Yr(r0+h*.28)+' '+f1(300+w*.6)+' '+Yr(r1-h*.1)+' 300 '+Yr(r1)+'C'+f1(300-w*.6)+' '+Yr(r1-h*.1)+' '+f1(300-w)+' '+Yr(r0+h*.28)+' 300 '+Yr(r0)+'Z" '+(ex||'')+'/>'}
function petalR(r0,r1,w,ex){var h=r1-r0;return '<path d="M300 '+Yr(r0)+'C'+f1(300+w*.95)+' '+Yr(r0+h*.1)+' '+f1(300+w)+' '+Yr(r1-h*.38)+' 300 '+Yr(r1)+'C'+f1(300-w)+' '+Yr(r1-h*.38)+' '+f1(300-w*.95)+' '+Yr(r0+h*.1)+' 300 '+Yr(r0)+'Z" '+(ex||'')+'/>'}
function polyline(pts,close){var d='';pts.forEach(function(p,i){d+=(i?'L':'M')+f1(p[0])+' '+f1(p[1])});return d+(close?'Z':'')}
function star(n,k,R,off){var d='';for(var i=0;i<n;i++){var a=pt((off||0)+i*360/n,R),b=pt((off||0)+((i+k)%n)*360/n,R);d+='M'+f1(a[0])+' '+f1(a[1])+'L'+f1(b[0])+' '+f1(b[1])}return '<path d="'+d+'"/>'}
function star8(s,a){var r='<rect x="'+(300-s)+'" y="'+(300-s)+'" width="'+2*s+'" height="'+2*s+'"';return '<g transform="rotate('+a+' 300 300)">'+r+'/>'+r+' transform="rotate(45 300 300)"/></g>'}
function spiral(cx,cy,r0,r1,turns,a0,dir,n){var pts=[];n=n||Math.max(16,Math.round(turns*28));for(var i=0;i<=n;i++){var t=i/n,a=a0+dir*t*turns*2*Math.PI,r=r0+(r1-r0)*t;pts.push([cx+r*Math.cos(a),cy+r*Math.sin(a)])}return pts}
function band(R,A,per,ph,n){var pts=[];n=n||per*16;for(var i=0;i<=n;i++){var th=i/n*2*Math.PI,r=R+A*Math.sin(per*th+ph);pts.push([300+r*Math.sin(th),300-r*Math.cos(th)])}return pts}

var PATS={
 none:function(){return ''},
 ring:function(){return circ(282)+circ(275,'stroke-dasharray="1 7"')+circ(214,'stroke-width=".7"')+circ(150,'stroke-width=".7"')+circ(84,'stroke-width=".7"')},
 mandala:function(c){var F='fill="'+c+'" fill-opacity=".14"';
  return circ(283)+circ(277,'stroke-width=".8"')
  +rotN(40,function(){return '<path d="M'+ps(-4.5,262)+'Q'+ps(0,286)+' '+ps(4.5,262)+'"/>'+dot(4.5,268,1.8,c)})
  +circ(258,'stroke-width=".8"')
  +rotN(24,function(){return petal(196,254,13,F)+'<path d="M300 '+Yr(204)+'V'+Yr(242)+'" stroke-width=".7"/>'})
  +rotN(24,function(){return dot(0,236,2.2,c)+dot(0,222,1.4,c)},7.5)
  +circ(190)+circ(184,'stroke-dasharray="1 4.5"')
  +rotN(16,function(){return petalC(122,180,21,F)+petalC(130,168,10)})
  +rotN(16,function(){return dot(0,176,2.4,c)},11.25)
  +circ(116)+rotN(32,function(){return dot(0,108,1.9,c)})+circ(100,'stroke-width=".8"')
  +rotN(12,function(){return petalC(56,96,15,F)})+rotN(12,function(){return petal(62,88,6)},15)
  +circ(52)+circ(45,'stroke-dasharray="2 4"')+rotN(8,function(){return petalC(12,40,9,F)})
  +'<circle cx="300" cy="300" r="7" fill="'+c+'"/>'},
 flower:function(c){var R=58,s='',cs=[[0,0]];for(var k=0;k<6;k++){var a=k*60*Math.PI/180,b=(k*60+30)*Math.PI/180;cs.push([R*Math.cos(a),R*Math.sin(a)]);cs.push([2*R*Math.cos(a),2*R*Math.sin(a)]);cs.push([R*Math.sqrt(3)*Math.cos(b),R*Math.sqrt(3)*Math.sin(b)])}
  cs.forEach(function(p){s+='<circle cx="'+f1(300+p[0])+'" cy="'+f1(300+p[1])+'" r="'+R+'"/>'});
  return s+circ(3*R,'stroke-width="2"')+circ(3*R+7)+rotN(36,function(){return '<circle cx="300" cy="'+Yr(223)+'" r="20"/>'})+circ(201,'stroke-width=".7"')+circ(245,'stroke-width=".7"')
   +circ(262)+circ(271,'stroke-dasharray="1 5"')+circ(281)+rotN(36,function(){return dot(5,223,1.8,c)})},
 girih:function(c){var F='fill="'+c+'" fill-opacity=".10"';
  return circ(282)+circ(270)+rotN(48,function(){return '<path d="M'+ps(0,270)+'L'+ps(3.75,276)+'L'+ps(0,282)+'L'+ps(-3.75,276)+'Z" '+F+'/>'})
  +star(12,5,262,0)+star(12,5,164,15)+star(12,4,164,15)+star(6,2,84,0)+circ(84,'stroke-width=".7"')+circ(164,'stroke-width=".7"')
  +rotN(12,function(){return dot(0,213,2.6,c)},15)+rotN(12,function(){return dot(0,124,2,c)})+'<circle cx="300" cy="300" r="10" fill="'+c+'" fill-opacity=".8"/>'},
 lotus:function(c){var F='fill="'+c+'" fill-opacity=".10"';
  return circ(283)+rotN(48,function(){return '<path d="M'+ps(-3.75,266)+'Q'+ps(0,286)+' '+ps(3.75,266)+'"/>'})+circ(266,'stroke-width=".8"')
  +rotN(8,function(){return petalR(72,252,64,F)+'<path d="M300 '+Yr(90)+'V'+Yr(232)+'" stroke-width=".7"/>'})
  +rotN(8,function(){return petalR(62,204,50,F)},22.5)
  +rotN(8,function(){return petalR(52,146,32,F)})
  +rotN(8,function(){return petalR(44,104,20,F)},22.5)
  +circ(42,F)+rotN(10,function(){return dot(0,26,3,c)})+'<circle cx="300" cy="300" r="5" fill="'+c+'"/>'},
 sakura:function(c){var R=rng(71),pts=[],s='',F='fill="'+c+'" fill-opacity=".18"',tries=0;
  function blossom(x,y,z,r){var p='M0 0C'+f1(-.42*z)+' '+f1(-.25*z)+' '+f1(-.56*z)+' '+f1(-.82*z)+' '+f1(-.17*z)+' '+f1(-z)+'L0 '+f1(-.84*z)+'L'+f1(.17*z)+' '+f1(-z)+'C'+f1(.56*z)+' '+f1(-.82*z)+' '+f1(.42*z)+' '+f1(-.25*z)+' 0 0Z';
   var o='<g transform="translate('+f1(x)+' '+f1(y)+') rotate('+f1(r)+')">';for(var i=0;i<5;i++)o+='<path d="'+p+'" transform="rotate('+i*72+')" '+F+'/>';
   for(var j=0;j<5;j++){var a=(j*72+36)*Math.PI/180;o+='<path d="M0 0L'+f1(Math.sin(a)*z*.36)+' '+f1(-Math.cos(a)*z*.36)+'" stroke-width=".8"/><circle cx="'+f1(Math.sin(a)*z*.4)+'" cy="'+f1(-Math.cos(a)*z*.4)+'" r="'+f1(Math.max(1,z*.05))+'" fill="'+c+'" stroke="none"/>'}
   return o+'<circle r="'+f1(z*.12)+'" fill="'+c+'" stroke="none"/></g>'}
  while(pts.length<24&&tries<3000){tries++;var a=R()*360,r=Math.sqrt(R())*262,z=14+R()*20,p=pt(a,r);if(r+z>278)continue;if(pts.some(function(q){return Math.hypot(q[0]-p[0],q[1]-p[1])<q[2]+z+8}))continue;pts.push([p[0],p[1],z,R()*72])}
  pts.forEach(function(q){s+=blossom(q[0],q[1],q[2],q[3])});
  for(var i=0;i<18;i++){var a2=R()*360,r2=Math.sqrt(R())*270,p2=pt(a2,r2),z2=6+R()*5;s+='<path transform="translate('+f1(p2[0])+' '+f1(p2[1])+') rotate('+f1(R()*360)+')" d="M0 0C'+f1(-.5*z2)+' '+f1(-.3*z2)+' '+f1(-.5*z2)+' '+f1(-.9*z2)+' '+f1(-.15*z2)+' '+f1(-z2)+'L0 '+f1(-.85*z2)+'L'+f1(.15*z2)+' '+f1(-z2)+'C'+f1(.5*z2)+' '+f1(-.9*z2)+' '+f1(.5*z2)+' '+f1(-.3*z2)+' 0 0Z" '+F+'/>'}
  return s+circ(282)+circ(276,'stroke-dasharray="1 6"')},
 cloud:function(c){var F='fill="'+c+'" fill-opacity=".9"';
  function cloudMotif(){var s='';var main=spiral(0,0,2,15,1.25,Math.PI*.1,-1),l=spiral(-24,7,1.5,9,1.1,Math.PI*.95,1),r=spiral(24,7,1.5,9,1.1,Math.PI*.05,-1);
   s+='<path d="'+polyline(main)+'"/><path d="'+polyline(l)+'"/><path d="'+polyline(r)+'"/>';
   s+='<path d="M-33 16C-26 22 -12 20 -8 12M33 16C26 22 12 20 8 12M-33 16C-44 14 -46 4 -40 -2M33 16C44 14 46 4 40 -2"/>';
   return s}
  function key(){var d='';for(var i=0;i<48;i++){var a=i*7.5;d+='M'+ps(a-3.2,266)+'L'+ps(a-3.2,280)+'L'+ps(a+3.2,280)+'L'+ps(a+3.2,270)+'L'+ps(a-.6,270)+'L'+ps(a-.6,275)}return '<path d="'+d+'" stroke-width="1.4"/>'}
  var ruyi=function(){return '<path d="M'+ps(-22.5,196)+'C'+ps(-20,170)+' '+ps(-15,158)+' '+ps(-9,160)+'C'+ps(-3,162)+' '+ps(-6,146)+' '+ps(0,136)+'C'+ps(6,146)+' '+ps(3,162)+' '+ps(9,160)+'C'+ps(15,158)+' '+ps(20,170)+' '+ps(22.5,196)+'"/>'
    +'<path d="M'+ps(-17,194)+'C'+ps(-15,176)+' '+ps(-12,168)+' '+ps(-8,169)+'C'+ps(-2,170)+' '+ps(-4,154)+' '+ps(0,147)+'C'+ps(4,154)+' '+ps(2,170)+' '+ps(8,169)+'C'+ps(12,168)+' '+ps(15,176)+' '+ps(17,194)+'" stroke-width=".8"/>'
    +dot(0,168,2.6,c)};
  return circ(284)+circ(262)+key()+rotN(8,ruyi)+circ(196,'stroke-width=".8"')
   +rotN(8,function(){return '<g transform="translate(300 '+Yr(229)+') scale(.95)">'+cloudMotif()+'</g>'},22.5)
   +circ(96)+circ(90,'stroke-dasharray="1 4"')+rotN(8,function(){return petalC(30,88,18,'fill="'+c+'" fill-opacity=".12"')+petalC(38,76,8)})+rotN(8,function(){return petal(34,70,10)},22.5)
   +'<circle cx="300" cy="300" r="12" '+F+'/>'},
 wave:function(c,face){var s='';for(var row=0;row<=40;row++){var cy=row*15;for(var col=-1;col<=11;col++){var cx=col*60+(row%2?30:0);
  s+='<circle cx="'+cx+'" cy="'+cy+'" r="30" fill="'+face+'"/><circle cx="'+cx+'" cy="'+cy+'" r="21" fill="'+face+'"/><circle cx="'+cx+'" cy="'+cy+'" r="12" fill="'+face+'"/>'}}return s},
 taiji:function(c,face){var F='fill="'+c+'"';var TRI=[[1,1,1],[0,1,1],[0,1,0],[0,0,1],[0,0,0],[1,0,0],[1,0,1],[1,1,0]];
  var s=circ(284)+circ(276,'stroke-dasharray="1 5"')+circ(262)+circ(186)+circ(180,'stroke-width=".7"');
  TRI.forEach(function(tr,i){var g='<g transform="rotate('+i*45+' 300 300)">';tr.forEach(function(v,k){var r=204+k*16,w=22;if(v)g+='<path d="M'+ps(-w/r*57.3,r)+'A'+r+' '+r+' 0 0 1 '+ps(w/r*57.3,r)+'" stroke-width="7" stroke-linecap="butt"/>';else g+='<path d="M'+ps(-w/r*57.3,r)+'A'+r+' '+r+' 0 0 1 '+ps(-4/r*57.3,r)+'M'+ps(4/r*57.3,r)+'A'+r+' '+r+' 0 0 1 '+ps(w/r*57.3,r)+'" stroke-width="7" stroke-linecap="butt"/>'});s+=g+'</g>'});
  s+=rotN(8,function(){return dot(0,246,2.4,c)},22.5)+rotN(64,function(){return '<path d="M300 '+Yr(186)+'V'+Yr(176)+'" stroke-width=".8"/>'});
  s+=circ(120,'stroke-width=".7"')+rotN(24,function(){return petal(122,172,7)});
  s+='<path d="M300 228A72 72 0 0 1 300 372A36 36 0 0 1 300 300A36 36 0 0 0 300 228Z" '+F+'/>'+circ(72,'stroke-width="2"')+'<circle cx="300" cy="264" r="9" '+F+'/><circle cx="300" cy="336" r="9" fill="'+face+'" stroke="none"/>';
  return s},
 zen:function(c){var st=[[205,215,24],[398,322,32],[262,432,16]],ex=function(i){return st[i][2]+50},s='';
  st.forEach(function(q){for(var k=1;k<=4;k++)s+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="'+(q[2]+k*12)+'" stroke-width="1.3"/>';
   var R=rng(q[0]),pts=[];for(var i=0;i<14;i++){var a=i/14*Math.PI*2,r=q[2]*(.82+R()*.3);pts.push([q[0]+r*Math.cos(a),q[1]+r*Math.sin(a)*.9])}s+='<path d="'+polyline(pts,true)+'" fill="'+c+'" fill-opacity=".38" stroke-width="1.2"/>'});
  for(var y=12;y<600;y+=12){var cuts=[];st.forEach(function(q,i){var dy=y-q[1],R2=ex(i);if(Math.abs(dy)<R2){var dx=Math.sqrt(R2*R2-dy*dy);cuts.push([q[0]-dx,q[0]+dx])}});
   cuts.sort(function(a,b){return a[0]-b[0]});var x=0,d='';cuts.forEach(function(ct){if(ct[0]>x+2)d+='M'+f1(x)+' '+y+'H'+f1(ct[0]);x=Math.max(x,ct[1])});if(x<600)d+='M'+f1(x)+' '+y+'H600';s+='<path d="'+d+'" stroke-width="1.1"/>'}
  return s},
 tribal:function(c){var F='fill="'+c+'"',s=circ(284)+circ(266);
  s+=rotN(48,function(){return '<path d="M'+ps(-3.75,266)+'L'+ps(0,283)+'L'+ps(3.75,266)+'Z" '+F+'/>'});
  var z=[];for(var i=0;i<=72;i++)z.push(pt(i*5,i%2?258:242));s+='<path d="'+polyline(z)+'" stroke-width="2.4"/>'+circ(236);
  s+=rotN(24,function(){return '<path d="M'+ps(0,230)+'L'+ps(6,218)+'L'+ps(0,206)+'L'+ps(-6,218)+'Z"/>'+dot(0,218,2.4,c)});
  s+=circ(200,'stroke-width="3"');
  s+=rotN(16,function(){return '<path d="M'+ps(-9,160)+'L'+ps(-9,170)+'L'+ps(-6,170)+'L'+ps(-6,180)+'L'+ps(-3,180)+'L'+ps(-3,190)+'L'+ps(3,190)+'L'+ps(3,180)+'L'+ps(6,180)+'L'+ps(6,170)+'L'+ps(9,170)+'L'+ps(9,160)+'Z" '+F+' fill-opacity=".85"/>'});
  s+=circ(154)+circ(146,'stroke-dasharray="7 5" stroke-width="3"');
  s+=rotN(8,function(){return '<path d="M'+ps(-10,96)+'L'+ps(0,136)+'L'+ps(10,96)+'" stroke-width="3"/><path d="M'+ps(-7,90)+'L'+ps(0,118)+'L'+ps(7,90)+'" stroke-width="2"/>'});
  return s+circ(66,'stroke-width="3"')+rotN(16,function(){return '<path d="M'+ps(-7,40)+'L'+ps(0,60)+'L'+ps(7,40)+'Z" '+F+'/>'})+'<circle cx="300" cy="300" r="33" '+F+' fill-opacity=".9"/>'},
 paisley:function(c){var F='fill="'+c+'" fill-opacity=".14"';
  function boteh(z){return '<path d="M0 '+f1(.9*z)+'C'+f1(-.72*z)+' '+f1(.9*z)+' '+f1(-.78*z)+' '+f1(-.1*z)+' '+f1(-.22*z)+' '+f1(-.46*z)+'C'+f1(.12*z)+' '+f1(-.7*z)+' '+f1(.42*z)+' '+f1(-.8*z)+' '+f1(.3*z)+' '+f1(-1.2*z)+'C'+f1(.95*z)+' '+f1(-.78*z)+' '+f1(.82*z)+' '+f1(.62*z)+' 0 '+f1(.9*z)+'Z" '+F+'/>'}
  function unit(){var o='<g transform="translate(300 '+Yr(208)+') rotate(-20)">'+boteh(34)+'<g transform="translate(2 8)">'+boteh(19).replace(F,'')+'</g>';
   for(var i=0;i<7;i++){var a=(i/7)*Math.PI*1.6-.5;o+='<circle cx="'+f1(2+Math.cos(a)*9)+'" cy="'+f1(10+Math.sin(a)*11)+'" r="1.6" fill="'+c+'" stroke="none"/>'}
   return o+'<circle cx="2" cy="10" r="3.2" fill="'+c+'" stroke="none"/></g>'}
  return circ(283)+circ(274)+rotN(60,function(){return petal(274,284,2.4)})+rotN(10,unit)+circ(152)+circ(146,'stroke-dasharray="1 4"')
   +rotN(20,function(){return dot(0,158,2,c)})+rotN(10,function(){return '<g transform="translate(300 '+Yr(114)+') scale(.55) rotate(160)">'+boteh(34)+'</g>'},18)
   +circ(70)+rotN(8,function(){return petalC(22,66,16,F)})+'<circle cx="300" cy="300" r="10" fill="'+c+'"/>'},
 dream:function(c){var N=12,prev=[],d='',s='';for(var i=0;i<N;i++)prev.push(pt(i*30,248));
  for(var k=1;k<=7;k++){var rr=248*Math.pow(.73,k),cur=[];for(var j=0;j<N;j++)cur.push(pt((j+.5*k)*30,rr));
   for(var q=0;q<N;q++){var a=prev[q],b=cur[q],n=prev[(q+1)%N];d+='M'+f1(a[0])+' '+f1(a[1])+'L'+f1(b[0])+' '+f1(b[1])+'L'+f1(n[0])+' '+f1(n[1])}
   if(k===2||k===4)cur.forEach(function(p,ix){if(ix%3===0)s+='<circle cx="'+f1(p[0])+'" cy="'+f1(p[1])+'" r="4.2" fill="'+c+'" stroke="none"/>'});prev=cur}
  return circ(262,'stroke-width="6"')+circ(252)+rotN(90,function(){return '<path d="M'+ps(-1.4,257)+'L'+ps(1.4,268)+'" stroke-width="1.4"/>'})+'<path d="'+d+'" stroke-width="1.1"/>'+s
   +'<circle cx="300" cy="300" r="10" fill="'+c+'"/>'+circ(284)+rotN(24,function(){return dot(0,278,1.8,c)})},
 celtic:function(c,face){function rope(R,A,per){var a=polyline(band(R,A,per,0)),b=polyline(band(R,A,per,Math.PI)),s='';
   s+='<path d="'+a+'" stroke-width="7"/><path d="'+a+'" stroke="'+face+'" stroke-width="2.6"/><path d="'+b+'" stroke-width="7"/><path d="'+b+'" stroke="'+face+'" stroke-width="2.6"/>';
   for(var k=0;k<per*2;k+=2){var th0=(k/(2*per))*2*Math.PI,pts=[];for(var i=-6;i<=6;i++){var th=th0+i/6*(Math.PI/per)*.45,r=R+A*Math.sin(per*th);pts.push([300+r*Math.sin(th),300-r*Math.cos(th)])}var pp=polyline(pts);s+='<path d="'+pp+'" stroke-width="7" stroke-linecap="butt"/><path d="'+pp+'" stroke="'+face+'" stroke-width="2.6" stroke-linecap="butt"/>'}
   return s}
  var tri='';for(var i=0;i<3;i++){var p=pt(i*120,24);tri+='<circle cx="'+f1(p[0])+'" cy="'+f1(p[1])+'" r="40" stroke-width="6"/><circle cx="'+f1(p[0])+'" cy="'+f1(p[1])+'" r="40" stroke="'+face+'" stroke-width="2.2"/>'}
  return circ(283)+circ(276,'stroke-width=".8"')+rope(238,13,24)+circ(212,'stroke-width=".8"')+circ(206)+rope(150,11,16)+circ(126)+circ(120,'stroke-width=".8"')+tri+circ(30,'stroke-width="6"')+circ(30,'stroke="'+face+'" stroke-width="2.2"')},
 moroccan:function(c){return star8(46,0)+star8(92,22.5)+star8(140,0)+star8(190,22.5)+star8(236,0)+circ(280)+circ(272,'stroke-width=".8"')
  +rotN(16,function(){return '<g transform="translate(300 '+Yr(272)+')"><rect x="-5" y="-5" width="10" height="10"/><rect x="-5" y="-5" width="10" height="10" transform="rotate(45)"/></g>'})
  +rotN(8,function(){return '<path d="M300 '+Yr(46)+'V'+Yr(262)+'" opacity=".35"/>'},22.5)},
 starry:function(c,face){var R=rng(11),s='';
  for(var i=0;i<190;i++){var a=R()*360,r=Math.sqrt(R())*284,p=pt(a,r),z=.5+Math.pow(R(),3)*2.1;s+='<circle cx="'+f1(p[0])+'" cy="'+f1(p[1])+'" r="'+f1(z)+'" fill="'+c+'" fill-opacity="'+f1(.35+R()*.65)+'" stroke="none"/>'}
  for(var j=0;j<11;j++){var a2=R()*360,r2=Math.sqrt(R())*262,q=pt(a2,r2),z2=4+R()*9;s+='<path transform="translate('+f1(q[0])+' '+f1(q[1])+')" d="M0 '+f1(-z2)+'Q'+f1(z2*.14)+' '+f1(-z2*.14)+' '+f1(z2)+' 0Q'+f1(z2*.14)+' '+f1(z2*.14)+' 0 '+f1(z2)+'Q'+f1(-z2*.14)+' '+f1(z2*.14)+' '+f1(-z2)+' 0Q'+f1(-z2*.14)+' '+f1(-z2*.14)+' 0 '+f1(-z2)+'Z" fill="'+c+'" stroke="none"/>'}
  [[[168,150],[208,128],[246,146],[262,188],[232,214]],[[380,420],[420,392],[458,410],[470,452]]].forEach(function(g){s+='<path d="'+polyline(g)+'" stroke-width=".8" stroke-opacity=".6"/>';g.forEach(function(p){s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="2.6" fill="'+c+'" stroke="none"/>'})});
  var m=pt(-48,208),r1=30,dx=12,dy=-9,r3=27,d2=Math.hypot(dx,dy),aa=(r1*r1-r3*r3+d2*d2)/(2*d2),hh=Math.sqrt(Math.max(0,r1*r1-aa*aa)),ux=dx/d2,uy=dy/d2,px=aa*ux,py=aa*uy,A1=[px-hh*uy,py+hh*ux],A2=[px+hh*uy,py-hh*ux];
  s+='<path transform="translate('+f1(m[0])+' '+f1(m[1])+')" d="M'+f1(A1[0])+' '+f1(A1[1])+'A'+r1+' '+r1+' 0 1 1 '+f1(A2[0])+' '+f1(A2[1])+'A'+r3+' '+r3+' 0 1 0 '+f1(A1[0])+' '+f1(A1[1])+'Z" fill="'+c+'" fill-opacity=".92" stroke="none"/>';
  return s+circ(282,'stroke-dasharray="1 6" stroke-width=".8"')},
 sun:function(c){var F='fill="'+c+'"',s=circ(283)+circ(266);
  s+=rotN(48,function(i){return '<path d="M'+ps(-3,266)+'L'+ps(0,i%2?276:282)+'L'+ps(3,266)+'Z" '+F+'/>'});
  for(var k=0;k<12;k++){var p=pt(k*30+15,238),ph=k/12,cr=Math.cos(ph*2*Math.PI),rr=9,rx=f1(Math.abs(cr)*rr),mir=ph>.5?' scale(-1 1)':'',sw=cr>0?0:1;
   s+='<g transform="translate('+f1(p[0])+' '+f1(p[1])+')'+mir+'"><circle r="'+rr+'" stroke-width="1.1"/>'+(k===0?'':'<path d="M0 -'+rr+'A'+rr+' '+rr+' 0 0 1 0 '+rr+'A'+rx+' '+rr+' 0 0 '+sw+' 0 -'+rr+'Z" '+F+' stroke="none"/>')+'</g>'}
  s+=circ(212)+circ(206,'stroke-dasharray="1 5"');
  s+=rotN(24,function(i){if(i%2)return '<path d="M'+ps(-2.6,84)+'L'+ps(0,196)+'L'+ps(2.6,84)+'Z" '+F+' fill-opacity=".5"/>';var w=[];for(var j=0;j<=24;j++){var r=84+j*4.5;w.push(pt(Math.sin(j*.9)*2.6,r))}return '<path d="'+polyline(w)+'" stroke-width="1.6"/>'});
  return s+circ(72,'stroke-width="3"')+rotN(12,function(){return petal(72,92,5,F)})+circ(58)+'<circle cx="300" cy="300" r="44" '+F+' fill-opacity=".85"/>'},
 wood:function(c){var R=rng(5),s='',knots=[[210,190,20],[420,380,26],[150,430,12]];
  for(var y0=-20;y0<=620;y0+=8.5){var pts=[],ph=R()*6.28;for(var x=-10;x<=610;x+=10){var y=y0+4*Math.sin(x*.012+ph)+2*Math.sin(x*.041+ph*2);
    knots.forEach(function(k){var dx=x-k[0],dy=y-k[1],d2=dx*dx+dy*dy;y+=k[2]*k[2]*3*dy/(d2+k[2]*k[2]*2)});pts.push([x,y])}
   s+='<path d="'+polyline(pts)+'" stroke-width="'+f1(.5+R()*1.3)+'" stroke-opacity="'+f1(.35+R()*.6)+'"/>'}
  knots.forEach(function(k){for(var j=1;j<=4;j++)s+='<ellipse cx="'+k[0]+'" cy="'+k[1]+'" rx="'+f1(k[2]*j*.42)+'" ry="'+f1(k[2]*j*.3)+'" stroke-width="1.1"/>';s+='<ellipse cx="'+k[0]+'" cy="'+k[1]+'" rx="'+f1(k[2]*.3)+'" ry="'+f1(k[2]*.2)+'" fill="'+c+'" fill-opacity=".7"/>'});
  return s},
 snow:function(c){var s='',R=rng(23);
  function flake(sc){var o='';for(var i=0;i<6;i++){o+='<g transform="rotate('+i*60+')"><path d="M0 0V'+f1(-sc)+'M0 '+f1(-sc*.5)+'l'+f1(sc*.22)+' '+f1(-sc*.16)+'M0 '+f1(-sc*.5)+'l'+f1(-sc*.22)+' '+f1(-sc*.16)+'M0 '+f1(-sc*.75)+'l'+f1(sc*.15)+' '+f1(-sc*.1)+'M0 '+f1(-sc*.75)+'l'+f1(-sc*.15)+' '+f1(-sc*.1)+'"/></g>'}return o}
  s+=rotN(6,function(){var o='<path d="M300 '+Yr(22)+'V'+Yr(262)+'" stroke-width="3"/>';[[74,36],[134,56],[196,42],[240,20]].forEach(function(b){var x=b[1]*.866,y=300-b[0]-b[1]*.5;o+='<path d="M300 '+Yr(b[0])+'L'+f1(300+x)+' '+f1(y)+'M300 '+Yr(b[0])+'L'+f1(300-x)+' '+f1(y)+'" stroke-width="2.2"/>'});return o+'<path d="M'+ps(-6,262)+'L'+ps(0,272)+'L'+ps(6,262)+'L'+ps(0,252)+'Z" fill="'+c+'" fill-opacity=".5"/>'});
  s+='<path d="'+polyline([0,60,120,180,240,300].map(function(a){return pt(a,22)}),true)+'" stroke-width="2"/>'+circ(10,'fill="'+c+'"');
  for(var i=0;i<16;i++){var a=R()*360,r=110+R()*165,p=pt(a,r),z=5+R()*8;if(Math.abs(((a%60)+60)%60-30)<12)s+='<g transform="translate('+f1(p[0])+' '+f1(p[1])+') rotate('+f1(R()*60)+')" stroke-width="1.2">'+flake(z)+'</g>'}
  for(var j=0;j<60;j++){var a3=R()*360,r3=Math.sqrt(R())*280,q=pt(a3,r3);s+='<circle cx="'+f1(q[0])+'" cy="'+f1(q[1])+'" r="'+f1(.8+R()*1.6)+'" fill="'+c+'" fill-opacity="'+f1(.4+R()*.5)+'" stroke="none"/>'}
  return s+circ(282,'stroke-dasharray="2 5"')},
 hex:function(c){var a=24,h=a*Math.sqrt(3),d='',f='',R=rng(9);for(var row=-1;row<=18;row++)for(var col=-1;col<=15;col++){var cx=col*h+(row%2?h/2:0),cy=row*a*1.5;if(Math.hypot(cx-300,cy-300)>310)continue;
   var p=[];for(var k=0;k<6;k++){var an=(60*k+30)*Math.PI/180;p.push([cx+a*.9*Math.cos(an),cy+a*.9*Math.sin(an)])}var pp=polyline(p,true);d+=pp;if(R()<.14)f+=pp}
  return '<path d="'+d+'" stroke-width="1.4"/><path d="'+f+'" fill="'+c+'" fill-opacity=".35" stroke="none"/>'}
};
var PATNAMES=[['none','素面'],['ring','細環'],['mandala','曼陀羅'],['flower','生命之花'],['girih','伊斯蘭星紋'],['moroccan','摩洛哥星'],['lotus','蓮花'],['cloud','青花雲紋'],['wave','青海波'],['sakura','櫻花'],['taiji','太極八卦'],['zen','枯山水'],['tribal','民族圖騰'],['paisley','佩斯利'],['dream','捕夢網'],['celtic','凱爾特結'],['starry','星空'],['sun','日月光芒'],['wood','木紋'],['snow','雪花'],['hex','蜂巢']];
var patMemo={};
function patMarkup(name,c,face){var k=name+c+face;if(!patMemo[k]){if(Object.keys(patMemo).length>90)patMemo={};patMemo[k]=(PATS[name]||PATS.none)(c,face)}return patMemo[k]}

/* ---------- templates ---------- */
var TPL=[
 {id:'graphite',cat:'素雅',name:'石墨',pattern:'ring',face:'#1D2029',face2:'#15171E',fin:'radial',rim:'#7E8699',pat:'#4A5263',tongue:'#2B303C',line:'#9AA2B4',num:'#E8EBF1',style:'flat',patOp:.9},
 {id:'mist',cat:'素雅',name:'霧白',pattern:'ring',face:'#EEF1F5',face2:'#DCE1E9',fin:'radial',rim:'#B6BDCA',pat:'#B3BBC8',tongue:'#FFFFFF',line:'#8B94A5',num:'#2A2F3A',style:'flat',patOp:.9},
 {id:'champagne',cat:'素雅',name:'香檳金',pattern:'none',face:'#CDAE70',face2:'#8C723F',fin:'linear',rim:'#E8D5A4',pat:'#FFF3D6',tongue:'#D9BE84',line:'#6B5427',num:'#3B2D10',style:'metal',patOp:.5},
 {id:'rosegold',cat:'素雅',name:'玫瑰金',pattern:'ring',face:'#DDA593',face2:'#A56958',fin:'linear',rim:'#F2CDBD',pat:'#FFE6DB',tongue:'#E5B4A3',line:'#7A4434',num:'#4A2419',style:'metal',patOp:.6},
 {id:'mandala-gold',cat:'曼陀羅與幾何',name:'黑金曼陀羅',pattern:'mandala',face:'#17130D',face2:'#0C0A07',fin:'radial',rim:'#B8913A',pat:'#D9B25A',tongue:'#17130D',line:'#E0BC66',num:'#F6E7BD',style:'cut',patOp:.7},
 {id:'mandala-indigo',cat:'曼陀羅與幾何',name:'靛藍曼陀羅',pattern:'mandala',face:'#22306A',face2:'#131B40',fin:'radial',rim:'#AEB9E4',pat:'#C3CCF2',tongue:'#2C3B7E',line:'#C9D2F0',num:'#F1F4FF',style:'flat',patOp:.6},
 {id:'flower',cat:'曼陀羅與幾何',name:'紫晶生命之花',pattern:'flower',face:'#3E2670',face2:'#1B1033',fin:'radial',rim:'#C8A8F0',pat:'#E2CCFF',tongue:'#4A2E80',line:'#E6D4FF',num:'#FFFFFF',style:'cut',patOp:.6},
 {id:'girih',cat:'曼陀羅與幾何',name:'翡翠星紋',pattern:'girih',face:'#0F4D3F',face2:'#062A21',fin:'radial',rim:'#D4B461',pat:'#E3C77A',tongue:'#12594A',line:'#E8CD85',num:'#FFF6DC',style:'cut',patOp:.62},
 {id:'moroccan',cat:'曼陀羅與幾何',name:'摩洛哥藍',pattern:'moroccan',face:'#10657A',face2:'#083B48',fin:'radial',rim:'#F2EBDD',pat:'#EAF4F2',tongue:'#12798F',line:'#F2EBDD',num:'#FFFFFF',style:'metal',patOp:.5},
 {id:'qinghua',cat:'東方',name:'青花瓷',pattern:'cloud',face:'#F7F4EC',face2:'#E4DDCB',fin:'radial',rim:'#27479A',pat:'#2C55B0',tongue:'#F7F4EC',line:'#27479A',num:'#1B3577',style:'cut',patOp:.85},
 {id:'seigaiha',cat:'東方',name:'青海波',pattern:'wave',face:'#133451',face2:'#0A1D31',fin:'radial',rim:'#8FC3E6',pat:'#6FAAD6',tongue:'#1A4266',line:'#A6D6F4',num:'#EEF8FF',style:'cut',patOp:.55},
 {id:'sakura',cat:'東方',name:'櫻花',pattern:'sakura',face:'#F8E6EA',face2:'#EDC5CF',fin:'radial',rim:'#D98BA0',pat:'#CF6E89',tongue:'#FBEFF2',line:'#B45B75',num:'#6A2B3D',style:'cut',patOp:.7},
 {id:'taiji',cat:'東方',name:'太極八卦',pattern:'taiji',face:'#161514',face2:'#0B0A0A',fin:'radial',rim:'#A8302A',pat:'#E6D9BF',tongue:'#1E1C1B',line:'#C9A77A',num:'#F2E8D5',style:'cut',patOp:.6},
 {id:'zen',cat:'東方',name:'枯山水',pattern:'zen',face:'#E6DECD',face2:'#CDC2AB',fin:'radial',rim:'#6F6658',pat:'#8A806E',tongue:'#EAE3D5',line:'#5E5647',num:'#3A342A',style:'cut',patOp:.75},
 {id:'tribal',cat:'民族風',name:'大地圖騰',pattern:'tribal',face:'#8C3D23',face2:'#561F10',fin:'radial',rim:'#F0D9B0',pat:'#F0D9B0',tongue:'#A34A2B',line:'#F3DEB8',num:'#FFF3DC',style:'cut',patOp:.55},
 {id:'paisley',cat:'民族風',name:'佩斯利',pattern:'paisley',face:'#6E1E38',face2:'#3A0C1C',fin:'radial',rim:'#E7A93B',pat:'#F2C261',tongue:'#7E2542',line:'#F2C261',num:'#FFF1D6',style:'cut',patOp:.6},
 {id:'dream',cat:'民族風',name:'捕夢網',pattern:'dream',face:'#21746F',face2:'#0F3F3C',fin:'radial',rim:'#C9A27A',pat:'#F0DEC4',tongue:'#23807B',line:'#F3E4CE',num:'#FFFFFF',style:'cut',patOp:.55},
 {id:'celtic',cat:'民族風',name:'凱爾特結',pattern:'celtic',face:'#1F3E2C',face2:'#0F2218',fin:'radial',rim:'#B7C9A8',pat:'#CFE0BF',tongue:'#274C37',line:'#D6E6C8',num:'#F4FAEE',style:'cut',patOp:.55},
 {id:'galaxy',cat:'自然',name:'星空',pattern:'starry',face:'#0A0E28',face2:'#43307A',fin:'galaxy',rim:'#8C8FC8',pat:'#FFFFFF',tongue:'#141A40',line:'#B7BBF4',num:'#FFFFFF',style:'cut',patOp:.85},
 {id:'celestial',cat:'自然',name:'日月光芒',pattern:'sun',face:'#0E1534',face2:'#070B1F',fin:'radial',rim:'#E2B54D',pat:'#E2B54D',tongue:'#18204A',line:'#E8BE5E',num:'#FFF1C7',style:'cut',patOp:.55},
 {id:'walnut',cat:'自然',name:'胡桃木',pattern:'wood',face:'#77522F',face2:'#4A2F19',fin:'linear',rim:'#2E1E12',pat:'#2B1A0D',tongue:'#77522F',line:'#20130A',num:'#FFF2DF',style:'cut',patOp:.45},
 {id:'snow',cat:'自然',name:'冰雪',pattern:'snow',face:'#7EB2D8',face2:'#4A7FB0',fin:'radial',rim:'#E1F1FB',pat:'#FFFFFF',tongue:'#8DBEE0',line:'#EFF8FF',num:'#FFFFFF',style:'cut',patOp:.8},
 {id:'lotus',cat:'自然',name:'粉蓮',pattern:'lotus',face:'#3C1F40',face2:'#200F26',fin:'radial',rim:'#E7A9C0',pat:'#F0B8CD',tongue:'#4B2A50',line:'#F3C3D5',num:'#FFE9F0',style:'cut',patOp:.6},
 {id:'honey',cat:'自然',name:'蜂巢',pattern:'hex',face:'#E2A531',face2:'#B0701A',fin:'radial',rim:'#5A3A0E',pat:'#7A4E12',tongue:'#E8B04A',line:'#553509',num:'#3A2406',style:'cut',patOp:.5}
];
var CATS=['素雅','曼陀羅與幾何','東方','民族風','自然'];

/* ---------- fixed drum finishes (anodised colours, no free picking) ---------- */
var COLORS=[
 {id:'obsidian',name:'曜石黑',face:'#18191D',face2:'#0B0C0E',fin:'radial',rim:'#3C3F48',pat:'#8D929E',tongue:'#22242A',line:'#ACB1BC',num:'#F2F3F5'},
 {id:'blackgold',name:'黑金',face:'#17130D',face2:'#0C0A07',fin:'radial',rim:'#B8913A',pat:'#D9B25A',tongue:'#1E1912',line:'#E0BC66',num:'#F6E7BD'},
 {id:'titanium',name:'鈦銀',face:'#B8BDC5',face2:'#868C96',fin:'linear',rim:'#DDE1E6',pat:'#F4F6F8',tongue:'#C3C8CF',line:'#454B55',num:'#20242B'},
 {id:'gunmetal',name:'鐵灰',face:'#4A4F58',face2:'#2B2F35',fin:'radial',rim:'#8A909B',pat:'#BCC1CA',tongue:'#555A64',line:'#CDD2DA',num:'#FFFFFF'},
 {id:'champagne',name:'香檳金',face:'#CDAE70',face2:'#8C723F',fin:'linear',rim:'#E8D5A4',pat:'#FFF3D6',tongue:'#D9BE84',line:'#6B5427',num:'#3B2D10'},
 {id:'rosegold',name:'玫瑰金',face:'#DDA593',face2:'#A56958',fin:'linear',rim:'#F2CDBD',pat:'#FFE6DB',tongue:'#E5B4A3',line:'#7A4434',num:'#4A2419'},
 {id:'navy',name:'星空藍',face:'#1D2D6C',face2:'#0C1438',fin:'radial',rim:'#8FA2E8',pat:'#C5D0FF',tongue:'#26387F',line:'#CBD5FF',num:'#FFFFFF'},
 {id:'sky',name:'天空藍',face:'#5DA6DE',face2:'#2C6BAA',fin:'radial',rim:'#D2E9FA',pat:'#FFFFFF',tongue:'#6BB0E4',line:'#EEF7FF',num:'#FFFFFF'},
 {id:'chime',name:'風鈴青',face:'#2A9C98',face2:'#155E5B',fin:'radial',rim:'#C2EEEA',pat:'#E8FFFC',tongue:'#30AAA6',line:'#E8FFFC',num:'#FFFFFF'},
 {id:'mint',name:'薄荷綠',face:'#93D3B9',face2:'#4E9F80',fin:'radial',rim:'#E4F7EF',pat:'#FFFFFF',tongue:'#9FD9C1',line:'#1E5A44',num:'#12362A'},
 {id:'forest',name:'墨綠',face:'#1F4A36',face2:'#0E261B',fin:'radial',rim:'#9CC7AE',pat:'#CFE9D9',tongue:'#26573F',line:'#D8EEDF',num:'#F4FBF6'},
 {id:'violet',name:'紫羅蘭',face:'#5B3A9E',face2:'#2D195B',fin:'radial',rim:'#C9B5F3',pat:'#E7DBFF',tongue:'#6644AE',line:'#ECE3FF',num:'#FFFFFF'},
 {id:'wine',name:'酒紅',face:'#7A1F33',face2:'#3E0F1A',fin:'radial',rim:'#E3A3B1',pat:'#F6CBD4',tongue:'#88263C',line:'#F8D9E0',num:'#FFF4F6'},
 {id:'coral',name:'珊瑚橙',face:'#E8825F',face2:'#B4472C',fin:'radial',rim:'#FFD5C4',pat:'#FFF1EA',tongue:'#EE9070',line:'#6A2412',num:'#3E1409'},
 {id:'sakura',name:'櫻花粉',face:'#F2BAC8',face2:'#D5879C',fin:'radial',rim:'#FBE4EA',pat:'#FFFFFF',tongue:'#F5C6D2',line:'#8A3850',num:'#55202F'},
 {id:'pearl',name:'珍珠白',face:'#F4F2ED',face2:'#DAD5CA',fin:'radial',rim:'#C9C2B4',pat:'#B5AD9D',tongue:'#FAF8F4',line:'#7A7163',num:'#3A342A'},
 {id:'aurora',name:'漸變・極光',fin:'grad',grad:['#2BC0B4','#3A7BD5','#7A4DD8'],face:'#3A7BD5',face2:'#7A4DD8',rim:'#CFE3FF',pat:'#FFFFFF',tongue:'#3A7BD5',line:'#FFFFFF',num:'#FFFFFF'},
 {id:'sunset',name:'漸變・晚霞',fin:'grad',grad:['#F7A35C','#E8607A','#8E4FC4'],face:'#E8607A',face2:'#8E4FC4',rim:'#FFE0C7',pat:'#FFFFFF',tongue:'#E8607A',line:'#FFF5EE',num:'#FFFFFF'},
 {id:'ocean',name:'漸變・深海',fin:'grad',grad:['#4FD1C5','#1F7A9C','#0E3B66'],face:'#1F7A9C',face2:'#0E3B66',rim:'#BDEFF0',pat:'#E6FFFF',tongue:'#1F7A9C',line:'#E8FFFF',num:'#FFFFFF'},
 {id:'nebula',name:'漸變・星雲',fin:'galaxy',face:'#0A0E28',face2:'#43307A',rim:'#8C8FC8',pat:'#FFFFFF',tongue:'#141A40',line:'#B7BBF4',num:'#FFFFFF'}
];
function colorById(id){return COLORS.filter(function(c){return c.id===id})[0]||null}

/* ---------- backgrounds ---------- */
var BGS=[['ink','夜墨','#0F1115'],['navy','深海藍','#0C1726'],['pine','松林綠','#0E1B16'],['plum','暮紫','#191325'],['walnut','胡桃褐','#1B1511'],['slate','石板灰','#2A2E35'],['rice','米紙','#F2ECE1'],['mist','霧白','#EDF0F4'],['blush','淡櫻','#F6EBED'],['sage','鼠尾草','#E4EAE2']];

/* ---------- state ---------- */
var PAL={rainbow:{1:'#FF6B6B',2:'#FFA94D',3:'#FFD43B',4:'#51CF66',5:'#22B8CF',6:'#5C7CFA',7:'#B197FC'},
 sticker:{1:'#8BC47A',2:'#F2C94C',3:'#F48FB1',4:'#6FA8F5',5:'#F6A56F',6:'#E8707F',7:'#B69CE6'},
 soft:{1:'#C5E8AE',2:'#FBE3A0',3:'#F9C6D8',4:'#BFD8F7',5:'#FAD0B5',6:'#F5B8C0',7:'#D9C9F4'},
 bold:{1:'#E03131',2:'#F76707',3:'#F59F00',4:'#2F9E44',5:'#1098AD',6:'#3B5BDB',7:'#9C36B5'}};
var PALNAME={rainbow:'彩虹',sticker:'貼紙色',soft:'柔和',bold:'鮮明',custom:'自訂'};
var SINGLES=['#F5C451','#FF8A4C','#FF6B81','#2DD4BF','#5AA9FF','#A78BFA','#A3E635','#FFFFFF'];
var DEF={layout:'d15',mode:'demo',song:'twinkle',bpmBySong:{},loop:false,tid:'mandala-gold',ov:{},
 panels:{score:true,tempo:true,hint:false,look:false,bg:false,sound:false,play:false,set:false},
 hint:{mode:'degree',single:'#F5C451',palette:'rainbow',custom:JSON.parse(JSON.stringify(PAL.rainbow)),hands:{l:'#5AA9FF',r:'#FF9F43',a:'#F5C451'},next:false,labels:'jianpu'},
 bg:{id:'ink',custom:'#101218',glow:true},
 snd:{tone:'ti',rev:30,room:'hall',sym:true,vol:80,metroVol:50,tuning:440,demo:true,oct:{d11:1,d15:0}},
 game:{level:'easy',hide:false},
 set:{rot:0,oos:'sub',latency:0,tr:'auto'},
 tempo:{metro:true,count:1,ramp:false,rFrom:60,rStep:4},
 score:{size:'m',color:true}};
function merge(d,s){if(!s||typeof s!=='object')return d;var o=Array.isArray(d)?d.slice():Object.assign({},d);Object.keys(s).forEach(function(k){o[k]=(d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k]))?merge(d[k],s[k]):s[k]});return o}
var cfg=merge(JSON.parse(JSON.stringify(DEF)),store.get('cfg2',{}));
if(!LAY[cfg.layout])cfg.layout='d15';
(function(){var o=cfg.ov||{},n={};['color','pattern','style'].forEach(function(k){if(o[k])n[k]=o[k]});cfg.ov=n;
 var tm={std:'carbon',finger:'tif',deep:'ti'};if(tm[cfg.snd.tone])cfg.snd.tone=tm[cfg.snd.tone];
 if(store.get('cfg3mig',0)<1){cfg.snd.tone='ti';store.set('cfg3mig',1)}})();
var saveT=null;function save(){clearTimeout(saveT);saveT=setTimeout(function(){store.set('cfg2',cfg)},250)}
function tplById(id){return TPL.filter(function(x){return x.id===id})[0]||TPL[0]}
function skinOf(t,ov){var s=Object.assign({patOp:.6,fin:'radial',grad:null},t);ov=ov||{};var c=ov.color&&colorById(ov.color);
 if(c){['face','face2','fin','grad','rim','pat','tongue','line','num'].forEach(function(k){s[k]=c[k]===undefined?null:c[k]});if(!s.fin)s.fin='radial'}
 if(ov.pattern)s.pattern=ov.pattern;if(ov.style)s.style=ov.style;return s}
function skin(){return skinOf(tplById(cfg.tid),cfg.ov)}
function L(){return LAY[cfg.layout]}
function hintColor(t){var h=cfg.hint;if(h.mode==='single')return h.single;if(h.mode==='hands')return h.hands[t.hand]||h.hands.a;var p=h.palette==='custom'?h.custom:(PAL[h.palette]||PAL.rainbow);return p[t.deg]}
