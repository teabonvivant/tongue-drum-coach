
/* ---------- songs ---------- */
var DEG=[0,2,4,5,7,9,11];
function parseJianpu(text){
 var name='',bpm=90,ts=[4,4],errors=[],notes=[],t=0,tok,body=[];
 String(text).split(/\r?\n/).forEach(function(line){var m=line.match(/^\s*(TITLE|BPM|TIME)\s*=\s*(.*)$/i);
  if(m){var k=m[1].toUpperCase(),v=m[2].trim();if(k==='TITLE')name=v;else if(k==='BPM')bpm=clamp(parseInt(v,10)||90,30,240);else{var q=v.match(/^(\d+)\s*\/\s*(\d+)$/);if(q)ts=[parseInt(q[1],10),parseInt(q[2],10)]}}
  else body.push(line)});
 var toks=body.join(' ').replace(/\[/g,' [ ').replace(/\]/g,' ] ').split(/\s+/).filter(Boolean),last=null,chord=null;
 for(var i=0;i<toks.length;i++){tok=toks[i];
  if(/^(\|+|\|\]|:\||\|:)$/.test(tok))continue;
  if(tok==='['){chord=[];continue}
  if(tok===']'){if(chord&&chord.length){var dd=Math.max.apply(null,chord.map(function(n){return n.d}));chord.forEach(function(n){n.d=dd;notes.push(n)});t+=dd;last={group:chord}}chord=null;continue}
  if(tok==='-'){if(last){if(last.group)last.group.forEach(function(n){n.d+=1});t+=1}else errors.push('「-」前面沒有音');continue}
  var m=tok.match(/^([0-7])([,']*)(\/{0,2})(\.?)$/);
  if(!m){errors.push('看不懂「'+tok+'」');continue}
  var deg=parseInt(m[1],10),oct=0;(m[2]||'').split('').forEach(function(c){oct+=c==="'"?1:-1});
  var d=m[3]==='//'?.25:m[3]==='/'?.5:1;if(m[4])d*=1.5;
  if(chord){if(deg>0)chord.push({t:t,d:d,m:62+DEG[deg-1]+12*oct});continue}
  if(deg===0){last={group:null};t+=d;continue}
  var n={t:t,d:d,m:62+DEG[deg-1]+12*oct};notes.push(n);last={group:[n]};t+=d}
 return {name:name,bpm:bpm,ts:ts,notes:notes,errors:errors,len:t}}

function parseMidi(buf){
 var d=new DataView(buf),p=0;
 function str(n){var s='';for(var i=0;i<n;i++)s+=String.fromCharCode(d.getUint8(p++));return s}
 function vlq(){var v=0,b;do{b=d.getUint8(p++);v=(v<<7)|(b&127)}while(b&128);return v}
 if(d.byteLength<14||str(4)!=='MThd')throw new Error('這不是 MIDI 檔');
 var hl=d.getUint32(p);p+=4;var nt=d.getUint16(p+2),div=d.getUint16(p+4);p+=hl;
 if(div&0x8000)throw new Error('不支援這種時間格式');
 var tracks=[],tempo=null,ts=null;
 for(var ti=0;ti<nt&&p<d.byteLength;ti++){
  if(str(4)!=='MTrk')break;var tl=d.getUint32(p);p+=4;var end=Math.min(p+tl,d.byteLength),tick=0,run=0,on={},notes=[],name='';
  while(p<end){tick+=vlq();var st=d.getUint8(p);if(st<0x80){st=run}else{p++;if(st<0xF0)run=st}
   if(st===0xFF){var ty=d.getUint8(p++),l=vlq();
     if(ty===0x51&&l===3&&tempo===null)tempo=60000000/((d.getUint8(p)<<16)|(d.getUint8(p+1)<<8)|d.getUint8(p+2));
     else if(ty===0x58&&l>=2&&!ts)ts=[d.getUint8(p),Math.pow(2,d.getUint8(p+1))];
     else if(ty===0x03){var nm='';for(var k=0;k<l;k++)nm+=String.fromCharCode(d.getUint8(p+k));name=nm}
     p+=l}
   else if(st===0xF0||st===0xF7){p+=vlq()}
   else{var hi=st&0xF0,ch=st&0x0F;
     if(hi===0xC0||hi===0xD0){p+=1}
     else{var a=d.getUint8(p++),b=d.getUint8(p++),key=ch*128+a;
      if(hi===0x90&&b>0){(on[key]=on[key]||[]).push(tick)}
      else if(hi===0x80||(hi===0x90&&b===0)){var q=on[key];if(q&&q.length){var s0=q.shift();if(ch!==9)notes.push([s0/div,Math.max(.05,(tick-s0)/div),a])}}}}}
  p=end;
  if(notes.length)tracks.push({name:name||('音軌 '+(tracks.length+1)),notes:notes.sort(function(x,y){return x[0]-y[0]||y[2]-x[2]})})}
 if(!tracks.length)throw new Error('這個 MIDI 檔沒有可用的音符');
 return {bpm:clamp(Math.round(tempo||120),30,240),ts:ts||[4,4],tracks:tracks}}
function pickTrack(tracks){var best=0,bs=-1;tracks.forEach(function(tr,i){var n=tr.notes,c=n.length;if(c<6)return;var avg=n.reduce(function(s,x){return s+x[2]},0)/c;var ov=0;for(var j=1;j<c;j++)if(n[j][0]<n[j-1][0]+n[j-1][1]-.05)ov++;var mono=1-ov/c;var sc=avg/127*.5+mono*.4+Math.min(c,200)/200*.1;if(sc>bs){bs=sc;best=i}});return best}
function monophonize(arr){var res=[];arr.forEach(function(n){var o={t:n[0],d:n[1],m:n[2]};if(res.length&&o.t-res[res.length-1].t<.03)return;if(res.length){var pv=res[res.length-1];pv.d=Math.max(.1,Math.min(pv.d,o.t-pv.t))}res.push(o)});return res}

var BUILTIN=[
 {id:'ex1',name:'練習：音階上行',bpm:72,ts:[4,4],text:"1 2 3 4 | 5 6 7 1' | 1' - - - |"},
 {id:'ex3',name:'練習：音階下行',bpm:72,ts:[4,4],text:"1' 7 6 5 | 4 3 2 1 | 1 - - - |"},
 {id:'twinkle',name:'小星星',bpm:90,ts:[4,4],text:"1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 - | 5 5 4 4 | 3 3 2 - | 5 5 4 4 | 3 3 2 - | 1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 - |"},
 {id:'bee',name:'小蜜蜂',bpm:100,ts:[4,4],text:"5 3 3 - | 4 2 2 - | 1 2 3 4 | 5 5 5 - | 5 3 3 - | 4 2 2 - | 1 3 5 5 | 3 - - - | 2 2 2 2 | 2 3 4 - | 3 3 3 3 | 3 4 5 - | 5 3 3 - | 4 2 2 - | 1 3 5 5 | 1 - - - |"},
 {id:'tigers',name:'兩隻老虎',bpm:100,ts:[4,4],text:"1 2 3 1 | 1 2 3 1 | 3 4 5 - | 3 4 5 - | 5/ 6/ 5/ 4/ 3 1 | 5/ 6/ 5/ 4/ 3 1 | 1 5, 1 - | 1 5, 1 - |"},
 {id:'ode',name:'歡樂頌',bpm:100,ts:[4,4],text:"3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3. 2/ 2 - | 3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2. 1/ 1 - | 2 2 3 1 | 2 3/ 4/ 3 1 | 2 3/ 4/ 3 2 | 1 2 5, - | 3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2. 1/ 1 - |"},
 {id:'jingle',name:'Jingle Bells',bpm:120,ts:[4,4],text:"3 3 3 - | 3 3 3 - | 3 5 1 2 | 3 - - - | 4 4 4 4 | 4 3 3 3 | 3 2 2 3 | 2 - 5 - |"},
 {id:'lamb',name:'瑪莉有隻小綿羊',bpm:100,ts:[4,4],text:"3 2 1 2 | 3 3 3 - | 2 2 2 - | 3 5 5 - | 3 2 1 2 | 3 3 3 3 | 2 2 3 2 | 1 - - - |"},
 {id:'bday',name:'生日歌',bpm:90,ts:[3,4],text:"5/ 5/ 6 5 | 1' 7 - | 5/ 5/ 6 5 | 2' 1' - | 5/ 5/ 5' 3' | 1' 7 6 | 4'/ 4'/ 3' 1' | 2' 1' - |"},
 {id:'farewell',name:'送別',bpm:72,ts:[4,4],text:"5 3/ 5/ 1' - | 6 1' 5 - | 5 1/ 2/ 3 2/ 1/ | 2 - - - | 5 3/ 5/ 1'. 7/ | 6 1' 5 - | 5 2/ 3/ 4. 7,/ | 1 - - - | 6 1' 1' - | 7 6/ 7/ 1' - | 6/ 7/ 1'/ 6/ 6/ 5/ 3/ 1/ | 2 - - - | 5 3/ 5/ 1'. 7/ | 6 1' 5 - | 5 2/ 3/ 4. 7,/ | 1 - - - |"},
 {id:'silent',name:'平安夜',bpm:66,ts:[3,4],text:"5. 6/ 5 | 3 - - | 5. 6/ 5 | 3 - - | 2' - 2' | 7 - - | 1' - 1' | 5 - - | 6 - 6 | 1'. 7/ 6 | 5. 6/ 5 | 3 - - | 6 - 6 | 1'. 7/ 6 | 5. 6/ 5 | 3 - - | 2' - 2' | 4'. 2'/ 7 | 1' - - | 3' - - | 1' 5 3 | 5. 4/ 2 | 1 - - | 1 - - |"}
];
function mkJp(b){var r=parseJianpu(b.text);return {id:b.id,name:b.name,source:'jianpu',bpm:b.bpm||r.bpm,ts:b.ts||r.ts,text:b.text,raw:{notes:r.notes,len:r.len},builtin:true}}
var songs=BUILTIN.map(mkJp);
(store.get('songs',[])||[]).forEach(function(s){try{if(s.source==='jianpu'){var r=parseJianpu(s.text);songs.push({id:s.id,name:s.name,source:'jianpu',bpm:s.bpm,ts:s.ts,text:s.text,raw:{notes:r.notes,len:r.len}})}
 else if(s.source==='midi'){songs.push({id:s.id,name:s.name,source:'midi',bpm:s.bpm,ts:s.ts,raw:{tracks:s.tracks,trackIdx:s.trackIdx||0}})}}catch(e){}});
function saveCustom(){var out=songs.filter(function(s){return !s.builtin}).map(function(s){return s.source==='jianpu'?{id:s.id,name:s.name,source:'jianpu',bpm:s.bpm,ts:s.ts,text:s.text}:{id:s.id,name:s.name,source:'midi',bpm:s.bpm,ts:s.ts,tracks:s.raw.tracks,trackIdx:s.raw.trackIdx}});store.set('songs',out)}
var song=songs.filter(function(s){return s.id===cfg.song})[0]||songs[0];

/* ---------- conversion to the drum ---------- */
function rawNotes(s){if(s.source==='jianpu')return s.raw.notes;return monophonize(s.raw.tracks[s.raw.trackIdx||0].notes)}
function convert(s,Lay,opts){
 var src=rawNotes(s),pcs=Lay.pcs,tot=0;src.forEach(function(n){tot+=Math.min(n.d,1)});
 function score(T){var c=0;src.forEach(function(n){var m=n.m+T,w=Math.min(n.d,1);if(Lay.byMidi.has(m))c+=w;else if(pcs.has(((m%12)+12)%12))c+=w*.6});return tot?c/tot:0}
 var bestT=0,bs=-9,o;
 if(opts.tr!=='auto'){var s0=parseInt(opts.tr,10)||0;for(o=-4;o<=4;o++){var T=s0+12*o,v=score(T)-.015*Math.abs(o);if(v>bs){bs=v;bestT=T}}}
 else{for(var sm=-6;sm<=6;sm++)for(o=-4;o<=4;o++){var T2=sm+12*o,v2=score(T2)-.012*Math.abs(sm)-.02*Math.abs(o);if(v2>bs+1e-9){bs=v2;bestT=T2}}}
 var out=[],rep={total:src.length,direct:0,oct:0,sub:0,skip:0,T:bestT};
 src.forEach(function(n){var m=n.m+bestT,t=Lay.byMidi.get(m),fl=null;
  if(t){rep.direct++}
  else if(pcs.has(((m%12)+12)%12)){var mm=m;while(mm>Lay.max)mm-=12;while(mm<Lay.min)mm+=12;t=Lay.byMidi.get(mm);if(!t){var bd=99;Lay.tongues.forEach(function(x){var dd=Math.abs(x.midi-mm);if(dd<bd){bd=dd;t=x}})}fl='oct';rep.oct++}
  else{if(opts.oos==='skip'){rep.skip++;return}var m3=m;while(m3>Lay.max)m3-=12;while(m3<Lay.min)m3+=12;var b2=99;Lay.tongues.forEach(function(x){var dd=Math.abs(x.midi-m3);if(dd<b2){b2=dd;t=x}});fl='sub';rep.sub++}
  out.push({t:n.t,d:n.d,id:t.id,fl:fl})});
 out.sort(function(a,b){return a.t-b.t});
 var total=s.raw.len||0;out.forEach(function(n){total=Math.max(total,n.t+n.d)});
 return {notes:out,rep:rep,total:total}}

/* ---------- audio engine ----------
   Built-in timbres are rendered once per note with an OfflineAudioContext (modal synthesis: tuned partials with
   beating pairs, a fast "bloom" on the fundamental, inharmonic strike modes and a filtered mallet noise), then
   played back as samples. Imported recordings replace them and are re-pitched from the nearest recorded note. */
/* Timbre model (per tone): parts = [ratio, amp, decayMul, beatHz, pan, beatDepth]; two = [fraction that decays fast, fast decay mul];
   thump = mallet contact (low-passed noise); noise = bright click; body = shell resonance (peaking EQ); hiCut = mallet softness (rolls off high partials). */
var TONES=[
 {id:'ti',name:'鈦金鋼・膠槌',desc:'仿魯儒鈦金鋼鼓：通透明亮、基音飽滿、八度與五度泛音乾淨，餘音長而平順',att:.0035,tau:1.3,texp:.55,lp:8000,hiCut:3200,glide:.0025,
  parts:[[1,1,1,.45,0,.16],[2,.34,.55,.8,.18,.32],[3,.10,.36,.6,-.18,.28],[4,.035,.25,0,.12,0],[5,.012,.18,0,-.1,0]],two:[.32,.18],
  inh:[[5.4,.035,.035],[7.9,.018,.02]],noise:[.03,3000,.006],thump:[.10,420,.012],body:[190,3.5,1.1],sym:.085},
 {id:'tif',name:'鈦金鋼・手指',desc:'同一隻鈦金鋼鼓用指腹敲：起音柔、低頻厚，聲音溫暖圓潤',att:.009,tau:1.1,texp:.55,lp:5000,hiCut:1700,glide:.0015,
  parts:[[1,1,1,.45,0,.16],[2,.20,.5,.8,.15,.3],[3,.05,.32,0,-.15,0]],two:[.24,.2],
  inh:[[5.4,.012,.03]],noise:[.01,1800,.01],thump:[.16,260,.02],body:[190,4,1.1],sym:.07},
 {id:'carbon',name:'碳鋼空靈鼓',desc:'一般碳鋼鼓：起音較硬、泛音較雜，餘音較短',att:.003,tau:.85,texp:.6,lp:7000,hiCut:4000,glide:.006,
  parts:[[1,1,1,.9,0,.4],[2,.30,.45,1.6,.2,.45],[2.97,.12,.3,0,-.2,0],[4.1,.05,.2,0,0,0]],two:[.45,.15],
  inh:[[5.6,.09,.05],[8.6,.06,.03],[12.1,.04,.02]],noise:[.07,3500,.01],thump:[.12,500,.012],body:[220,2.5,1.2],sym:.06},
 {id:'handpan',name:'手碟',desc:'泛音豐富，聲音有搖曳的共鳴',att:.004,tau:1.5,texp:.45,lp:7500,hiCut:3500,glide:.004,
  parts:[[1,1,1,.35,0,.4],[2,.55,.65,.9,.22,.45],[3,.3,.5,.5,-.22,.4],[4,.06,.3,0,0,0],[5.05,.03,.2,0,.12,0]],two:[.3,.2],
  inh:[[6.2,.03,.05]],noise:[.03,2500,.01],thump:[.14,300,.018],body:[150,4,1],sym:.1},
 {id:'bell',name:'水晶鐘',desc:'明亮如鐘，適合高音旋律',att:.002,tau:1.1,texp:.5,lp:11000,hiCut:8000,glide:0,
  parts:[[1,1,1,0,0,0],[2.76,.32,.5,.8,.22,.4],[5.40,.13,.3,0,-.22,0],[8.93,.05,.2,0,0,0]],two:[.2,.2],
  inh:[],noise:[.04,6000,.006],thump:[.03,600,.008],body:null,sym:.05}
];
var ROOMS={room:1.1,hall:2.4,temple:4.2};
var A={ctx:null,bus:null,mbus:null,wet:null,conv:null,noise:null,bank:{},pending:{},voices:{},user:null,live:0,clicks:[]};
function octOf(){var o=cfg.snd.oct||{};return clamp(o[cfg.layout]|0,-1,1)}
function tone(){return TONES.filter(function(t){return t.id===cfg.snd.tone})[0]||TONES[0]}
function hz(m){return cfg.snd.tuning*Math.pow(2,(m-69)/12)}
function soundMidi(m){return m+12*octOf()}
function makeIR(c,sec){var sr=c.sampleRate,pre=Math.floor(sr*.012),len=Math.floor(sr*sec)+pre,ir=c.createBuffer(2,len,sr),R=rng(99);
 for(var ch=0;ch<2;ch++){var d=ir.getChannelData(ch),y=0;for(var i=pre;i<len;i++){var t=(i-pre)/sr,k=.9-.78*Math.min(1,t/sec);y+=k*((R()*2-1)-y);d[i]=y*Math.exp(-t*6.9/sec)}
  for(var e=0;e<7;e++){var at=pre+Math.floor(sr*(.004+R()*.06));d[at]+=(R()*.8+.2)*(R()<.5?-1:1)*.7}}
 return ir}
function ensureAudio(){if(!A.ctx){var C=window.AudioContext||window.webkitAudioContext;if(!C)return null;var c;try{c=new C({latencyHint:'interactive'})}catch(e){c=new C()}A.ctx=c;
  var comp=c.createDynamicsCompressor();comp.threshold.value=-12;comp.knee.value=12;comp.ratio.value=3;comp.attack.value=.004;comp.release.value=.25;comp.connect(c.destination);
  A.bus=c.createGain();A.bus.gain.value=cfg.snd.vol/100;A.mbus=c.createGain();A.mbus.gain.value=cfg.snd.metroVol/100;
  A.conv=c.createConvolver();A.conv.buffer=makeIR(c,ROOMS[cfg.snd.room]||2.4);A.wet=c.createGain();A.wet.gain.value=cfg.snd.rev/100*.6;
  A.bus.connect(comp);A.bus.connect(A.conv);A.conv.connect(A.wet);A.wet.connect(comp);A.mbus.connect(comp);
  var nb=c.createBuffer(1,Math.floor(c.sampleRate*.08),c.sampleRate),nd=nb.getChannelData(0);for(var j=0;j<nd.length;j++)nd[j]=Math.random()*2-1;A.noise=nb;
  loadUserSamples();warmBank()}
 if(A.ctx.state==='suspended')A.ctx.resume();return A.ctx}
function setRoom(){if(A.ctx)A.conv.buffer=makeIR(A.ctx,ROOMS[cfg.snd.room]||2.4)}
function renderTone(tn,f){
 var C=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!C||!A.ctx)return Promise.reject();
 var sr=A.ctx.sampleRate,tau=clamp(tn.tau*Math.pow(262/f,tn.texp),.3,2.6),dur=clamp(tau*7,2.4,9),oc=new C(2,Math.ceil(sr*dur),sr),ny=sr*.45,two=tn.two||[0,1];
 var out=oc.createGain(),lp=oc.createBiquadFilter(),hp=oc.createBiquadFilter(),last=hp;lp.type='lowpass';lp.frequency.value=Math.min(tn.lp,ny);lp.Q.value=.5;hp.type='highpass';hp.frequency.value=65;out.connect(lp);lp.connect(hp);
 if(tn.body){var pk=oc.createBiquadFilter();pk.type='peaking';pk.frequency.value=tn.body[0];pk.gain.value=tn.body[1];pk.Q.value=tn.body[2];hp.connect(pk);last=pk}
 last.connect(oc.destination);
 function pan(v){if(oc.createStereoPanner){var p=oc.createStereoPanner();p.pan.value=v;p.connect(out);return p}return out}
 function soft(fr){return 1/(1+Math.pow(fr/(tn.hiCut||1e5),2))}
 function osc(fr,amp,tt,pv,glide,fast){if(fr>ny||amp<=1e-4)return;var o=oc.createOscillator(),dst=pan(pv);o.type='sine';
  if(glide){o.frequency.setValueAtTime(fr*(1+glide),0);o.frequency.exponentialRampToValueAtTime(fr,.08)}else o.frequency.value=fr;
  [[1-fast[0],tt],[fast[0],tt*fast[1]]].forEach(function(st){if(st[0]<=0)return;var g=oc.createGain();g.gain.setValueAtTime(0,0);g.gain.linearRampToValueAtTime(amp*st[0],tn.att);g.gain.setTargetAtTime(0,tn.att,st[1]);o.connect(g);g.connect(dst)});
  o.start(0);o.stop(dur)}
 tn.parts.forEach(function(p){var fr=f*p[0],tt=tau*p[2],a=p[1]*soft(fr),dp=p[5]||0;
  if(p[3]&&dp>0){osc(fr-p[3]/2,a*(1-dp),tt,p[4],tn.glide,two);osc(fr+p[3]/2,a*dp,tt*.92,-p[4],tn.glide,two)}else osc(fr,a,tt,p[4],tn.glide,two)});
 (tn.inh||[]).forEach(function(q){osc(f*q[0],q[1]*soft(f*q[0]),q[2],(q[0]%2>1?.2:-.2),0,[0,1])});
 function burst(amp,freq,dec,type){if(!amp)return;var ns=oc.createBufferSource(),nb=oc.createBuffer(1,Math.floor(sr*.1),sr),dd=nb.getChannelData(0),R=rng(Math.round(f*7));for(var i=0;i<dd.length;i++)dd[i]=R()*2-1;ns.buffer=nb;
  var bq=oc.createBiquadFilter();bq.type=type;bq.frequency.value=Math.min(freq,ny);bq.Q.value=type==='bandpass'?.8:.7;var ng=oc.createGain();ng.gain.setValueAtTime(amp*3,0);ng.gain.setTargetAtTime(0,.0008,dec);ns.connect(bq);bq.connect(ng);ng.connect(pan(0));ns.start(0)}
 if(tn.noise)burst(tn.noise[0],tn.noise[1],tn.noise[2],'bandpass');
 if(tn.thump)burst(tn.thump[0],tn.thump[1],tn.thump[2],'lowpass');
 var pr=oc.startRendering();
 return (pr&&pr.then?pr:new Promise(function(res){oc.oncomplete=function(e){res(e.renderedBuffer)}})).then(function(buf){
  var pkv=0,e=0,n0=Math.floor(sr*.03),n1=Math.min(buf.length,Math.floor(sr*.4));
  for(var ch=0;ch<buf.numberOfChannels;ch++){var d=buf.getChannelData(ch);for(var i=0;i<d.length;i++){var a=Math.abs(d[i]);if(a>pkv)pkv=a;if(i>=n0&&i<n1)e+=d[i]*d[i]}}
  var rms=Math.sqrt(e/Math.max(1,(n1-n0)*buf.numberOfChannels)),g=rms>0?.2/rms*clamp(Math.pow(262/f,.1),.82,1.1):1;if(pkv*g>.95)g=.95/pkv;
  for(var c2=0;c2<buf.numberOfChannels;c2++){var d2=buf.getChannelData(c2);for(var j=0;j<d2.length;j++)d2[j]*=g}
  return buf})}
function bankKey(tid,m){return tid+'|'+cfg.snd.tuning+'|'+m}
function getBuf(tid,m){var k=bankKey(tid,m);if(A.bank[k])return A.bank[k];if(!A.pending[k]&&A.ctx){var tn=TONES.filter(function(t){return t.id===tid})[0];if(!tn)return null;
  A.pending[k]=renderTone(tn,hz(m)).then(function(b){A.bank[k]=b;delete A.pending[k];return b},function(){delete A.pending[k]})}return null}
function warmBank(tid){if(!A.ctx)return;tid=tid||cfg.snd.tone;if(tid==='user')return;var ms=L().tongues.map(function(t){return soundMidi(t.midi)}),i=0;
 (function next(){if(i>=ms.length)return;var m=ms[i++],k=bankKey(tid,m);getBuf(tid,m);var p=A.pending[k];if(p)p.then(next,next);else next()})()}
function liveVoice(m,vel,when,dest){var c=A.ctx,f=hz(soundMidi(m)),tn=tone(),d=clamp(tn.tau*1.2*Math.pow(262/f,.35),.8,5);var g=c.createGain();g.gain.value=.3*vel;g.connect(dest);
 [[1,1,1],[2,.25,.5],[3,.06,.3]].forEach(function(p){var o=c.createOscillator(),e=c.createGain();o.frequency.value=f*p[0];e.gain.setValueAtTime(0,when);e.gain.linearRampToValueAtTime(p[1],when+.004);e.gain.setTargetAtTime(0,when+.004,d*p[2]/3);o.connect(e);e.connect(g);o.start(when);o.stop(when+d*p[2]*2+.1)})}
function pickUser(m){var list=A.user,best=null,bd=1e9,target=m+12*Math.log2(cfg.snd.tuning/440);if(!list||!list.length)return null;list.forEach(function(s){var d=Math.abs(s.m-target);if(d<bd){bd=d;best=s}});return {buf:best.buf,rate:Math.pow(2,(target-best.m)/12)}}
function srcFor(tid,m){m=soundMidi(m);if(tid==='user'){var u=pickUser(m);if(u)return u;tid='ti'}var b=getBuf(tid,m);return b?{buf:b,rate:1}:null}
function playRaw(id,m,vel,when,pan,attack,tid){var c=A.ctx;if(!c)return null;var s=srcFor(tid||cfg.snd.tone,m),g=c.createGain();
 var pn=c.createStereoPanner?c.createStereoPanner():null;if(pn){pn.pan.value=pan;g.connect(pn);pn.connect(A.bus)}else g.connect(A.bus);
 if(!s){liveVoice(m,vel,when,g);g.gain.value=1;return {g:g,src:null}}
 var src=c.createBufferSource(),lp=c.createBiquadFilter();src.buffer=s.buf;src.playbackRate.value=s.rate*Math.pow(2,(Math.random()-.5)*3/1200);
 lp.type='lowpass';lp.Q.value=.4;lp.frequency.value=2200+vel*vel*11000;src.connect(lp);lp.connect(g);
 if(attack){g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(vel,when+attack)}else g.gain.value=vel;
 src.start(when);A.live++;src.onended=function(){A.live--;try{g.disconnect();lp.disconnect();if(pn)pn.disconnect()}catch(e){}};return {g:g,src:src}}
function playNote(id,vel,when,tid){var c=ensureAudio();if(!c)return;var Lay=L(),t=Lay.byId[id];if(!t)return;when=Math.max(when||0,c.currentTime);
 var pan=clamp(Math.sin((t.angle+cfg.set.rot)*Math.PI/180)*.38,-.4,.4),prev=A.voices[id];
 if(prev){try{prev.g.gain.cancelScheduledValues(when);prev.g.gain.setTargetAtTime(0,when,.035);if(prev.src)prev.src.stop(when+.35)}catch(e){}}
 A.voices[id]=playRaw(id,t.midi,vel,when,pan,0,tid);
 if(cfg.snd.sym&&A.live<48){var tn0=TONES.filter(function(x){return x.id===(tid||cfg.snd.tone)})[0],lvl=tn0?tn0.sym:.05;Lay.tongues.forEach(function(u){if(u.id===id)return;var iv=u.midi-t.midi,w=iv===12?1:iv===19?.6:iv===24?.45:iv===-12?.35:0;
  if(w)playRaw(u.id,u.midi,vel*lvl*w,when+.01,clamp(Math.sin((u.angle+cfg.set.rot)*Math.PI/180)*.38,-.4,.4),.14,tid)})}}
function click(when,accent){var c=A.ctx;if(!c)return;A.clicks.push(when);if(A.clicks.length>8)A.clicks.shift();var o=c.createOscillator(),g=c.createGain();o.frequency.value=accent?1760:1180;g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(accent?.9:.55,when+.002);g.gain.exponentialRampToValueAtTime(.001,when+.05);o.connect(g);g.connect(A.mbus);o.start(when);o.stop(when+.07)}
function preview(tid){var c=ensureAudio();if(!c)return;warmBank(tid);var Lay=L(),seq=['M1','M3','M5','H1'].filter(function(x){return Lay.byId[x]});
 var start=c.currentTime+.08;function go(){seq.forEach(function(id,i){playNote(id,.9,start+i*.32,tid)})}
 var ms=seq.map(function(x){return Lay.byId[x].midi}),waits=tid==='user'?[]:ms.map(function(m){getBuf(tid,m);return A.pending[bankKey(tid,m)]}).filter(Boolean);
 if(waits.length)Promise.all(waits).then(function(){start=c.currentTime+.05;go()},go);else go()}

/* ---------- imported recordings (IndexedDB) ---------- */
var IDB={db:null,open:function(){if(IDB.db)return Promise.resolve(IDB.db);return new Promise(function(res,rej){try{var r=indexedDB.open('tdc-audio',1);r.onupgradeneeded=function(){r.result.createObjectStore('kv')};r.onsuccess=function(){IDB.db=r.result;res(r.result)};r.onerror=function(){rej(r.error)}}catch(e){rej(e)}})},
 op:function(mode,fn){return IDB.open().then(function(db){return new Promise(function(res,rej){try{var st=db.transaction('kv',mode).objectStore('kv'),rq=fn(st);rq.onsuccess=function(){res(rq.result)};rq.onerror=function(){rej(rq.error)}}catch(e){rej(e)}})})},
 get:function(k){return IDB.op('readonly',function(s){return s.get(k)})},set:function(k,v){return IDB.op('readwrite',function(s){return s.put(v,k)})},del:function(k){return IDB.op('readwrite',function(s){return s.delete(k)})}};
var userMeta=store.get('userMeta',null);
function packSamples(list){return list.map(function(s){var chs=[];for(var c=0;c<s.buf.numberOfChannels;c++){var d=s.buf.getChannelData(c),o=new Int16Array(d.length);for(var i=0;i<d.length;i++)o[i]=clamp(d[i],-1,1)*32767;chs.push(o)}return {m:s.m,sr:s.buf.sampleRate,chs:chs}})}
function unpackSamples(arr){var c=A.ctx;return arr.map(function(s){var b=c.createBuffer(s.chs.length,s.chs[0].length,s.sr);s.chs.forEach(function(d,ci){var o=b.getChannelData(ci);for(var i=0;i<d.length;i++)o[i]=d[i]/32767});return {m:s.m,buf:b}})}
function loadUserSamples(){if(!userMeta||A.user)return;IDB.get('user').then(function(v){if(v&&v.length&&A.ctx){A.user=unpackSamples(v);renderSound()}}).catch(function(){})}
function detectPitch(x,sr,start){var tmin=Math.floor(sr/1600),tmax=Math.ceil(sr/70),W=Math.min(2048,x.length-start-tmax-1);if(W<600)return null;
 var d=new Float32Array(tmax+1),cm=new Float32Array(tmax+1),run=0;
 for(var tau=1;tau<=tmax;tau++){var s=0;for(var j=0;j<W;j++){var df=x[start+j]-x[start+j+tau];s+=df*df}d[tau]=s;run+=s;cm[tau]=run?s*tau/run:1}
 var best=-1;for(var t2=tmin;t2<tmax;t2++){if(cm[t2]<.15){while(t2+1<tmax&&cm[t2+1]<cm[t2])t2++;best=t2;break}}
 if(best<0){var mv=1e9;for(var t3=tmin;t3<tmax;t3++)if(cm[t3]<mv){mv=cm[t3];best=t3}if(mv>.45)return null}
 var a=d[best-1],b=d[best],c=d[best+1],den=a-2*b+c,sh=den?.5*(a-c)/den:0;return {f:sr/(best+clamp(sh,-.5,.5)),q:1-cm[best]}}
function analyseRecording(buf){
 var sr=buf.sampleRate,n=buf.length,c0=buf.getChannelData(0),c1=buf.numberOfChannels>1?buf.getChannelData(1):null,mono=new Float32Array(n);
 for(var i=0;i<n;i++)mono[i]=c1?(c0[i]+c1[i])*.5:c0[i];
 var hop=Math.round(sr*.01),nf=Math.floor(n/hop),e=new Float32Array(nf),prev=0,mx=0;
 for(var f=0;f<nf;f++){var s=0;for(var j=f*hop;j<(f+1)*hop;j++){var dd=mono[j]-.97*prev;prev=mono[j];s+=dd*dd}e[f]=s;if(s>mx)mx=s}
 var on=[],last=-99;for(var k=0;k<nf;k++){var base=((k>0?e[k-1]:0)+(k>1?e[k-2]:0)+(k>2?e[k-3]:0))/3+mx*1e-6;if(e[k]>mx*3e-4&&e[k]>base*5&&k-last>=22){on.push(k);last=k}}
 if(!on.length)on=[0];
 var out=[];on.forEach(function(k,ix){var s0=Math.max(0,(k-1)*hop),e0=ix+1<on.length?(on[ix+1]-1)*hop:n;e0=Math.min(e0,s0+Math.floor(sr*6));if(e0-s0<sr*.25)return;
  var p1=detectPitch(mono,sr,s0+Math.floor(sr*.08)),p2=detectPitch(mono,sr,s0+Math.floor(sr*.25)),p=p1&&p2?(p2.q>=p1.q?p2:p1):(p1||p2);if(!p)return;
  var len=e0-s0,nb=A.ctx.createBuffer(Math.min(2,buf.numberOfChannels),len,sr),pk=0;
  for(var ch=0;ch<nb.numberOfChannels;ch++){var src=buf.getChannelData(ch),dst=nb.getChannelData(ch);for(var q=0;q<len;q++){dst[q]=src[s0+q];var a=Math.abs(dst[q]);if(a>pk)pk=a}}
  var fade=Math.min(len,Math.floor(sr*.08)),g=pk>0?.85/pk:1;for(var c2=0;c2<nb.numberOfChannels;c2++){var d2=nb.getChannelData(c2);for(var z=0;z<len;z++){var w=z<64?z/64:1;if(z>len-fade)w*=(len-z)/fade;d2[z]*=g*w}}
  out.push({m:69+12*Math.log2(p.f/440),q:p.q,buf:nb,peak:pk})});
 return out}
function noteName(m){var N=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'],r=Math.round(m);return N[((r%12)+12)%12]+(Math.floor(r/12)-1)}
