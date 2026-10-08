
/* ---------- theme ---------- */
var isLight=false;
function bgColor(){if(cfg.bg.id==='custom')return cfg.bg.custom||'#101218';var b=BGS.filter(function(x){return x[0]===cfg.bg.id})[0];return b?b[2]:BGS[0][2]}
function applyTheme(){var b=bgColor(),dark=lum(b)<.28,st=document.documentElement.style,v;isLight=!dark;
 if(dark){var fg=mix('#F3F4F7',b,.05);v={bg:b,panel:mix(b,'#ffffff',.045),panel2:mix(b,'#ffffff',.085),line:mix(b,'#ffffff',.11),line2:mix(b,'#ffffff',.19),fg:fg,mute:mix(fg,b,.38),gold:'#E9B949',goldt:'#F0C75E',ink:'#17130A',glow:'rgba(233,185,73,.10)',shadow:'rgba(0,0,0,.5)'}}
 else{var fg2=mix('#1C1A17',b,.03);v={bg:b,panel:mix(b,'#ffffff',.5),panel2:mix(b,'#000000',.04),line:mix(b,'#000000',.09),line2:mix(b,'#000000',.17),fg:fg2,mute:mix(fg2,b,.42),gold:'#D9A43A',goldt:'#8A610E',ink:'#1E1606',glow:'rgba(255,255,255,.6)',shadow:'rgba(60,45,20,.22)'}}
 Object.keys(v).forEach(function(k){st.setProperty('--'+k,v[k])});st.colorScheme=dark?'dark':'light';
 $('#dbox').classList.toggle('noglow',!cfg.bg.glow)}

/* ---------- drum on screen ---------- */
var refs={},drumSvg=$('#drum');
function renderDrum(){var Lay=L(),sk=skin();drumSvg.innerHTML=drumHTML(Lay,sk,'m',false);refs={};
 Lay.tongues.forEach(function(t){var g=drumSvg.querySelector('.tg[data-id="'+t.id+'"]'),lb=drumSvg.querySelector('.lb[data-id="'+t.id+'"]');refs[t.id]={tf:g.querySelector('.tf'),tl:g.querySelector('.tl'),nx:g.querySelector('.nx'),lt:lb.querySelector('.lt'),key:null}})}
var rq=false;function renderSoon(){if(rq)return;rq=true;requestAnimationFrame(function(){rq=false;renderDrum()})}
function resetKeys(){Object.keys(refs).forEach(function(k){refs[k].key=null})}
function applyVis(st){var sk=skin(),cut=sk.style==='cut',base=sk.style==='metal'?'url(#mgm)':cut?'transparent':sk.tongue,fo=sk.style==='metal'?'.97':cut?'1':'.93';
 L().tongues.forEach(function(t){var r=refs[t.id];if(!r)return;var a=st.act.get(t.id),nx=st.next.get(t.id),w=st.wrong===t.id,key=(a||'')+'|'+(nx||'')+'|'+(w?1:0);
  if(r.key===key)return;r.key=key;
  if(a){r.tf.setAttribute('fill',a);r.tf.setAttribute('fill-opacity','1');r.tl.setAttribute('stroke',mix(a,'#000000',.32));r.lt.setAttribute('fill',textOn(a));if(cut)r.lt.setAttribute('stroke',a)}
  else{r.tf.setAttribute('fill',base);r.tf.setAttribute('fill-opacity',fo);r.tl.setAttribute('stroke',sk.line);r.lt.setAttribute('fill',sk.num);if(cut)r.lt.setAttribute('stroke',sk.face)}
  if(w){r.nx.setAttribute('stroke','#FF5A5A');r.nx.setAttribute('opacity','1')}else if(nx&&!a){r.nx.setAttribute('stroke',nx);r.nx.setAttribute('opacity','.95')}else r.nx.setAttribute('opacity','0')})}

/* ---------- runtime state ---------- */
var conv=null,bpm=90,bpb=4,pos=0,loopOn=!!cfg.loop,lf=1,lt=1,prevUntil=0,previewAll=false,flash={},wrongUntil=0,wrongId=null,dragging=false,doneMsg='',doneUntil=0;
var T={on:false,kind:null,clock:false,wait:false,anchorT:0,anchorB:0,ni:0,ci:0,playB:0,endB:0,loopStart:0,timer:null,finishAt:0,passes:0,wi:0,hit:{},miss:0};
var lightEls=[],lastLight=-2,lastMsg='';
function nBars(){var tot=conv?conv.total:0;return Math.max(1,Math.ceil(tot/bpb-1e-6))}
function totalB(){return nBars()*bpb}
function regionStart(){return loopOn?(lf-1)*bpb:0}
function regionEnd(){return loopOn?Math.min(lt,nBars())*bpb:totalB()}
function firstIdx(b){var N=conv.notes,lo=0,hi=N.length;while(lo<hi){var m=(lo+hi)>>1;if(N[m].t>=b-1e-6)hi=m;else lo=m+1}return lo}
function upper(b){var N=conv.notes,lo=0,hi=N.length;while(lo<hi){var m=(lo+hi)>>1;if(N[m].t>b)hi=m;else lo=m+1}return lo}
function beatAt(time){return T.anchorB+(time-T.anchorT)*bpm/60}
function timeAt(b){return T.anchorT+(b-T.anchorB)*60/bpm}
function reconvert(){conv=convert(song,L(),{tr:cfg.set.tr,oos:cfg.set.oos});
 lf=1;lt=nBars();var a=$('#loopFrom'),b=$('#loopTo');a.max=b.max=lt;a.value=lf;b.value=lt;pos=clamp(pos,0,totalB());
 buildScore();buildRep();buildLights();$('#keyTxt').textContent='1=D　'+bpb+'/'+(song.ts&&song.ts[1]||4)}

/* ---------- transport ---------- */
function hush(){var c=A.ctx;if(!c||!A.bus)return;var g=A.bus.gain,n=c.currentTime;try{g.cancelScheduledValues(n);g.setValueAtTime(g.value,n);g.linearRampToValueAtTime(0,n+.05);g.setValueAtTime(0,n+.3);g.linearRampToValueAtTime(cfg.snd.vol/100,n+.34)}catch(e){}A.voices={}}
function halt(){clearInterval(T.timer);T.timer=null;T.on=false;T.clock=false;T.wait=false;T.kind=null;T.finishAt=0;hush();syncPlayBtn()}
function stopAll(){var was=T.on&&T.clock&&T.kind==='song';halt();if(was)scoreFinish(false);pos=regionStart();lastLight=-2}
function pauseSong(){if(!T.on)return;if(T.clock&&T.kind==='song')pos=clamp(beatAt(A.ctx.currentTime),regionStart(),T.endB);else if(T.wait)pos=conv.notes[T.wi]?conv.notes[T.wi].t:0;halt()}
function startClock(fromB,count){var c=ensureAudio();if(!c)return;clearInterval(T.timer);var cnt=count?cfg.tempo.count*bpb:0;
 T.on=true;T.kind='song';T.clock=true;T.wait=false;T.playB=fromB;T.loopStart=regionStart();T.endB=regionEnd();T.anchorB=fromB-cnt;T.anchorT=c.currentTime+.1;
 T.ni=firstIdx(fromB);T.ci=Math.ceil(T.anchorB-1e-6);T.finishAt=0;T.timer=setInterval(tick,25);tick();syncPlayBtn()}
function startWait(fromB){ensureAudio();clearInterval(T.timer);T.on=true;T.kind='song';T.clock=false;T.wait=true;T.wi=firstIdx(fromB);if(T.wi>=conv.notes.length)T.wi=0;T.hit={};T.miss=0;syncPlayBtn()}
function tick(){var c=A.ctx;if(!c||!T.on||!T.clock)return;var hz2=c.currentTime+.15,N=conv.notes,g=0,isSong=T.kind==='song';
 while(g++<400){var nt=(isSong&&T.ni<N.length&&N[T.ni].t<T.endB)?N[T.ni].t:Infinity,cb=T.ci,eb=T.endB,nb=Math.min(nt,cb,eb);if(timeAt(nb)>hz2)break;
  if(nt<=cb&&nt<eb){var n=N[T.ni++];if(cfg.mode==='demo'&&cfg.snd.demo)playNote(n.id,.84+Math.random()*.1,timeAt(nt))}
  else if(cb<eb){var cbn=T.ci++,cin=isSong&&cbn<T.playB-1e-6;if(!isSong||cin||cfg.tempo.metro)click(Math.max(timeAt(cbn),c.currentTime),(((cbn%bpb)+bpb)%bpb)===0)}
  else{var wt=timeAt(eb);
   if(loopOn&&isSong){T.anchorT=wt;T.anchorB=T.loopStart;T.playB=T.loopStart;T.ni=firstIdx(T.loopStart);T.ci=Math.ceil(T.loopStart-1e-6);T.passes++;if(cfg.tempo.ramp&&bpm<240){bpm=Math.min(240,bpm+cfg.tempo.rStep);cfg.bpmBySong[song.id]=bpm;syncTempo()}}
   else{T.finishAt=wt;clearInterval(T.timer);T.timer=null;return}}}}
function playPressed(){
 if(T.on&&T.kind==='song'){pauseSong();return}
 if(G.on)gameStop();
 if(T.on)stopAll();
 if(!conv.notes.length){setMsg('這首曲沒有可用的音符');return}
 var fresh=pos<=regionStart()+1e-6;T.passes=0;doneUntil=0;
 if(fresh&&cfg.tempo.ramp&&loopOn&&cfg.mode!=='wait')setBpm(cfg.tempo.rFrom);
 if(fresh||!SCORE.start&&!SCORE.total)scoreReset(fresh?regionStart():pos);
 if(cfg.mode==='wait')startWait(pos);else startClock(pos,fresh)}
function toggleMetro(){if(T.on&&T.kind==='metro'){stopAll();return}if(T.on)stopAll();var c=ensureAudio();if(!c)return;
 T.on=true;T.kind='metro';T.clock=true;T.playB=0;T.endB=Infinity;T.loopStart=0;T.anchorB=0;T.anchorT=c.currentTime+.08;T.ni=0;T.ci=0;T.timer=setInterval(tick,25);tick();syncPlayBtn()}
function seekTo(b){b=clamp(b,0,totalB());if(T.on&&T.kind==='song'){if(T.clock){startClock(b,false);scoreReset(b)}else{T.wi=Math.min(firstIdx(b),Math.max(0,conv.notes.length-1));T.hit={}}}else pos=b}
function setBpm(v){v=clamp(Math.round(v),30,240);if(v===bpm)return;if(T.on&&T.clock&&A.ctx){var now=A.ctx.currentTime;T.anchorB=beatAt(now);T.anchorT=now}bpm=v;cfg.bpmBySong[song.id]=v;syncTempo();save()}
function syncPlayBtn(){var pl=T.on&&T.kind==='song';$('#btnPlay').textContent=pl?'❚❚ 暫停':'▶ 播放';var pv=$('#btnPrev');if(pv){pv.setAttribute('aria-pressed',String(T.on&&T.kind==='metro'));pv.textContent=(T.on&&T.kind==='metro')?'停止試聽':'試聽'}}

/* ---------- what lights up ---------- */
function vBeat(){if(T.on){if(T.clock){var c=A.ctx;return beatAt(c.currentTime-(c.outputLatency||c.baseLatency||0)-cfg.set.latency/1000)}if(T.wait){var n=conv.notes[T.wi];return n?n.t:totalB()}}return pos}
function holdOf(n){return Math.max(.2,Math.min(n.d,1)*.85)}
function derive(vb){var N=conv.notes,Ls=L(),now=performance.now(),st={act:new Map(),next:new Map(),wrong:now<wrongUntil?wrongId:null};
 var col=function(id){return hintColor(Ls.byId[id])},s,showNext=cfg.hint.next;
 if(G.on){for(var gid in flash){if(flash[gid]>now)st.act.set(gid,col(gid))}return st}
 if(T.kind==='metro'||!N.length)return st;
 if(!T.on&&(previewAll||now<prevUntil)){Ls.tongues.forEach(function(t){st.act.set(t.id,col(t.id))});return st}
 if(T.on&&T.wait){s=T.wi;if(s<N.length){var t0=N[s].t;for(;s<N.length&&N[s].t-t0<1e-3;s++){if(!T.hit[N[s].id])st.act.set(N[s].id,col(N[s].id))}}}
 else if(T.on){var j=upper(vb);for(var a=j-1;a>=0&&N[a].t>vb-2;a--){if(vb<N[a].t+holdOf(N[a]))st.act.set(N[a].id,col(N[a].id))}s=j}
 else{s=firstIdx(vb);showNext=true}
 if(showNext&&s<N.length){var t1=N[s].t;for(var k=s;k<N.length&&N[k].t-t1<1e-3;k++)if(!st.act.has(N[k].id))st.next.set(N[k].id,col(N[k].id))}
 for(var fid in flash){if(flash[fid]>now)st.act.set(fid,col(fid));else delete flash[fid]}
 return st}
function setMsg(h){if(h===lastMsg)return;lastMsg=h;$('#msg').innerHTML=h}
function msgFor(vb){
 var nowm=performance.now();if(nowm<doneUntil)return doneMsg;
 if(G.on)return G.msg;
 if(MIC.on&&nowm<MIC.until)return '聽到 <b>'+MIC.heard+'</b>';
 if(!conv.notes.length)return '這首曲沒有可用的音符';
 if(T.kind==='metro')return '節拍器試聽中';
 if(T.on&&T.wait)return '敲中亮起的音舌就會繼續'+(T.miss?'・錯 <b>'+T.miss+'</b> 次':'');
 if(T.on){if(vb<-1e-6)return '預備拍 <b>'+((((Math.floor(vb+1e-6))%bpb)+bpb)%bpb+1)+'</b>';if(cfg.mode==='follow'&&(SCORE.hit||SCORE.wrong))return '命中 <b>'+SCORE.hit+'</b> / '+SCORE.total+(SCORE.wrong?'・錯 '+SCORE.wrong:'');return {demo:'示範中',follow:MIC.on?'用真鼓跟住亮燈敲':'跟住亮燈敲（撳畫面音舌都會計分）',wait:''}[cfg.mode]}
 return pos>regionStart()+1e-6?'已暫停，有外框的音舌是下一個音':'按「播放」開始，有外框的音舌是第一個音'}
function buildLights(){var el=$('#lights');if(!el)return;var h='';for(var i=0;i<bpb;i++)h+='<span class="lt'+(i===0?' ac':'')+'"></span>';el.innerHTML=h;lightEls=$$('.lt',el);lastLight=-2}

/* ---------- jianpu score ---------- */
var SC={evs:[],evEls:[],noteEv:[],beatEls:[],barEls:[],cur:-1,beat:-1,bar:-2};
function digitColor(t){if(!cfg.score.color)return 'var(--fg)';var c=hintColor(t);return isLight?mix(c,'#000000',.42):mix(c,'#ffffff',.08)}
function buildScore(){var el=$('#score');if(!el)return;el.className='score '+(cfg.score.size||'m');
 SC={evs:[],evEls:[],noteEv:[],beatEls:[],barEls:[],cur:-1,beat:-1,bar:-2};
 if(!cfg.panels.score||!conv){el.innerHTML='';return}
 var N=conv.notes,Ls=L(),q=function(x){return Math.round(x*4)/4},groups=[],tb=totalB();
 N.forEach(function(n,i){var t=q(n.t),g=groups[groups.length-1];if(g&&Math.abs(g.t-t)<1e-6){g.idx.push(i);g.d=Math.max(g.d,n.d)}else groups.push({t:t,idx:[i],d:n.d})});
 var legato=song.source!=='jianpu',evs=[],cur=0;
 groups.forEach(function(g,k){var nx=k+1<groups.length?groups[k+1].t:tb,end=q(g.t+g.d);if(legato&&nx-end<1-1e-6)end=nx;end=Math.min(end,nx);if(end<=g.t)end=Math.min(nx,g.t+.25);if(end<=g.t)return;
  if(g.t>cur+1e-6)evs.push({rest:true,s:cur,e:g.t});evs.push({rest:false,s:g.t,e:end,idx:g.idx});cur=end});
 if(cur<tb-1e-6)evs.push({rest:true,s:cur,e:tb});
 var beats=[];for(var b=0;b<tb;b++)beats.push([]);
 evs.forEach(function(ev,ei){var s=ev.s,first=true,list=[];while(s<ev.e-1e-6){var bb=Math.floor(s+1e-6),be=Math.min(ev.e,bb+1),pc={ei:ei,s:s,len:be-s,first:first};list.push(pc);if(beats[bb])beats[bb].push(pc);first=false;s=be}
  if(list.length===2&&Math.abs(list[0].len-1)<1e-6&&Math.abs(list[1].len-.5)<1e-6){list[0].dot=true;list[1].skip=true}
  if(!ev.rest)ev.idx.forEach(function(i){SC.noteEv[i]=ei})});
 function ulv(p){return p.len>=1-1e-6?0:p.len>=.5-1e-6?1:2}
 function item(p,u){var ev=evs[p.ei],cls='n',inner='',dot=(p.first&&Math.abs(p.len-.75)<1e-6)||p.dot,hc='var(--line2)',hk='var(--fg)',lo=-(6+u*7);
  if(ev.rest){cls+=' rest';inner='<span class="dg">0</span>'}
  else{var ts=[],seen={};ev.idx.forEach(function(i){var t=Ls.byId[N[i].id];if(!seen[t.id]){seen[t.id]=1;ts.push(t)}if(N[i].fl==='sub')cls=cls.indexOf('sub')<0?cls+' sub':cls});ts.sort(function(a,b){return b.midi-a.midi});
   hc=hintColor(ts[0]);hk=textOn(hc);
   if(!p.first&&p.len>=1-1e-6){cls+=' dash';inner='<span class="dg"></span>'}
   else{if(!p.first)cls+=' tie';inner=ts.map(function(t){return '<span class="dg" style="--dc:'+digitColor(t)+'">'+t.deg+(t.oct>0?'<i class="hi"></i>':'')+(t.oct<0?'<i class="lo" style="bottom:'+lo+'px"></i>':'')+'</span>'}).join('')}}
  if(dot){inner+='<i class="dt"></i>';cls+=' dotd'}
  return '<span class="'+cls+'" data-e="'+p.ei+'" style="--hc:'+hc+';--hk:'+hk+'">'+inner+'</span>'}
 function beatHTML(bb,k){var ps=beats[bb].filter(function(p){return !p.skip}),h='',i=0;
  while(i<ps.length){if(ulv(ps[i])===0){h+=item(ps[i],0);i++;continue}
   var grp='';while(i<ps.length&&ulv(ps[i])>=1){if(ulv(ps[i])>=2){var g2='';while(i<ps.length&&ulv(ps[i])>=2){g2+=item(ps[i],2);i++}grp+='<span class="u2">'+g2+'</span>'}else{grp+=item(ps[i],1);i++}}
   h+='<span class="u1">'+grp+'</span>'}
  return '<div class="bt"><div class="ns">'+h+'</div><div class="ct">'+(k+1)+'</div></div>'}
 var nb=nBars(),h='';for(var bi=0;bi<nb;bi++){h+='<div class="bar"><span class="bn">'+(bi+1)+'</span>';for(var k=0;k<bpb;k++)h+=beatHTML(bi*bpb+k,k);h+='</div>'}
 el.innerHTML=h;SC.evs=evs;SC.evEls=evs.map(function(){return []});$$('.n',el).forEach(function(e){SC.evEls[+e.getAttribute('data-e')].push(e)});SC.beatEls=$$('.bt',el);SC.barEls=$$('.bar',el)}
function evAt(x){var E=SC.evs,lo=0,hi=E.length;while(lo<hi){var m=(lo+hi)>>1;if(E[m].s<=x+1e-6)lo=m+1;else hi=m}return lo-1}
function updScore(vb){if(!cfg.panels.score||!SC.evs.length)return;
 var ei=-1;if(T.on&&T.wait)ei=SC.noteEv[T.wi]!==undefined?SC.noteEv[T.wi]:-1;else if(vb>=-1e-6)ei=evAt(vb);
 if(ei!==SC.cur){(SC.evEls[SC.cur]||[]).forEach(function(e){e.classList.remove('on')});SC.cur=ei;(SC.evEls[ei]||[]).forEach(function(e){e.classList.add('on')})}
 var b=(T.on&&T.clock&&vb>=0)?Math.floor(vb+1e-6):-1;if(b!==SC.beat){if(SC.beatEls[SC.beat])SC.beatEls[SC.beat].classList.remove('now');SC.beat=b;if(SC.beatEls[b])SC.beatEls[b].classList.add('now')}
 var bar=ei>=0?Math.floor(SC.evs[ei].s/bpb+1e-6):(vb<0?0:Math.floor(vb/bpb));if(bar!==SC.bar){SC.bar=bar;var past=T.on;SC.barEls.forEach(function(e,i){e.classList.toggle('cur',i===bar);e.classList.toggle('past',past&&i<bar)});
  var be=SC.barEls[bar],sc=$('#score');if(be&&sc){var top=be.offsetTop,hgt=be.offsetHeight;if(top<sc.scrollTop+2||top+hgt>sc.scrollTop+sc.clientHeight-2)sc.scrollTop=Math.max(0,top-8)}}}
$('#score').addEventListener('click',function(e){var n=e.target.closest('.n');if(!n)return;var ev=SC.evs[+n.getAttribute('data-e')];if(ev)seekTo(ev.s)});

/* ---------- frame loop ---------- */
function frame(){requestAnimationFrame(frame);if(!conv)return;
 if(T.on&&T.finishAt&&A.ctx&&A.ctx.currentTime>=T.finishAt){halt();pos=regionStart();doneMsg='完成！再來一次？';doneUntil=performance.now()+4000;scoreFinish(true)}
 var vb=vBeat();practiceTick();micTick();if(T.on&&T.clock&&T.kind==='song')scoreTick(vb);applyVis(derive(vb));
 var li=(T.on&&T.clock)?((Math.floor(vb+1e-6)%bpb)+bpb)%bpb:-1;if(li!==lastLight){lastLight=li;lightEls.forEach(function(e,i){e.classList.toggle('on',i===li)})}
 var tb=totalB();if(!dragging)$('#prog').value=Math.round(clamp(vb,0,tb)/tb*1000);
 $('#progTxt').textContent='小節 '+(Math.min(nBars(),Math.floor(Math.max(vb,0)/bpb+1e-6)+1))+' / '+nBars()+(T.on&&T.passes?'・第 '+(T.passes+1)+' 遍':'');
 updScore(vb);setMsg(msgFor(vb))}

/* ---------- tongue input ---------- */
function judgeWait(ids){var N=conv.notes,now=performance.now();if(T.wi>=N.length)return;var t0=N[T.wi].t,grp=[];for(var k=T.wi;k<N.length&&N[k].t-t0<1e-3;k++)grp.push(N[k].id);
 var id=ids.filter(function(x){return grp.indexOf(x)>=0})[0];
 if(id){T.hit[id]=true;if(grp.every(function(x){return T.hit[x]})){T.wi+=grp.length;T.hit={};if(T.wi>=N.length){var pc=Math.round(100*N.length/(N.length+T.miss));halt();pos=regionStart();recordResult(pc,T.miss?'錯了 '+T.miss+' 次':'一次都沒錯')}}}
 else{wrongId=ids[0];wrongUntil=now+400;T.miss++}}
function judgeFollow(ids){var N=conv.notes,vb=vBeat(),win=Math.max(.4,.18*bpm/60),best=-1,bd=9,near=false;
 for(var k=Math.max(0,firstIdx(vb-win));k<N.length&&N[k].t<=vb+win;k++){var key=SCORE.pass+'|'+k;if(SCORE.keys[key])continue;near=true;if(ids.indexOf(N[k].id)>=0){var d=Math.abs(N[k].t-vb);if(d<bd){bd=d;best=k}}}
 if(best>=0){SCORE.keys[SCORE.pass+'|'+best]=1;SCORE.hit++}else{SCORE.wrong++;if(near){wrongId=ids[0];wrongUntil=performance.now()+400}}}
function routeHit(ids){if(G.on){gameAnswer(ids);return}if(!T.on||T.kind!=='song')return;if(T.wait)judgeWait(ids);else if(T.clock&&cfg.mode==='follow')judgeFollow(ids)}
function hitTongue(id){var c=ensureAudio(),t=L().byId[id];if(!t||!c)return;playNote(id,.95,c.currentTime+.005);flash[id]=performance.now()+180;routeHit([id])}
drumSvg.addEventListener('pointerdown',function(e){var g=e.target.closest&&e.target.closest('.tg');if(!g)return;e.preventDefault();hitTongue(g.getAttribute('data-id'))});

/* ---------- report under the score ---------- */
function buildRep(){var r=conv.rep,sm=((r.T+6)%12+12)%12-6,oc=(r.T-sm)/12,h='';
 h+='<span>共 <b>'+r.total+'</b> 個音</span>';
 if(r.oct)h+='<span>轉八度 <b>'+r.oct+'</b></span>';
 if(r.sub)h+='<span>近似代替 <b>'+r.sub+'</b>（樂譜上有虛線底）</span>';
 if(r.skip)h+='<span>略過 <b>'+r.skip+'</b></span>';
 if(sm||oc){var tp=[];if(sm)tp.push((sm>0?'升 ':'降 ')+'<b>'+Math.abs(sm)+'</b> 個半音');if(oc)tp.push((oc>0?'升高 ':'降低 ')+'<b>'+Math.abs(oc)+'</b> 個八度');h+='<span>已自動移調：'+tp.join('、')+'</span>'}
 if(song.source==='midi'&&song.raw.tracks.length>1)h+='<label>音軌 <select id="trackSel">'+song.raw.tracks.map(function(t,i){return '<option value="'+i+'"'+(i===(song.raw.trackIdx||0)?' selected':'')+'>'+esc(t.name)+'（'+t.notes.length+'）</option>'}).join('')+'</select></label>';
 if(!song.builtin)h+='<button type="button" class="btn sm ghost" id="delSong">刪除此樂曲</button>';
 $('#rep').innerHTML=h;
 var ts=$('#trackSel');if(ts)ts.addEventListener('change',function(){stopAll();song.raw.trackIdx=+ts.value;saveCustom();reconvert()});
 var ds=$('#delSong');if(ds)ds.addEventListener('click',function(){if(ds.getAttribute('data-arm')!=='1'){ds.setAttribute('data-arm','1');ds.textContent='再按一次確認刪除';setTimeout(function(){if(ds.parentNode){ds.setAttribute('data-arm','0');ds.textContent='刪除此樂曲'}},3000);return}
  songs=songs.filter(function(s){return s!==song});saveCustom();setSong(songs[0].id)})}

/* ---------- header ---------- */
function refreshSongSel(){$('#songSel').innerHTML=songs.map(function(s){return '<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>'}).join('');$('#songSel').value=song.id}
function setSong(id){stopAll();song=songs.filter(function(s){return s.id===id})[0]||songs[0];cfg.song=song.id;bpm=cfg.bpmBySong[song.id]||song.bpm;bpb=(song.ts&&song.ts[0])||4;pos=0;reconvert();refreshSongSel();syncTempo();save()}
$('#songSel').addEventListener('change',function(){setSong(this.value)});
function segSync(el,val){if(!el)return;$$('button',el).forEach(function(b){b.classList.toggle('on',b.getAttribute('data-v')===String(val))})}
function segBind(el,fn){el.addEventListener('click',function(e){var b=e.target.closest('button[data-v]');if(!b||!el.contains(b))return;fn(b.getAttribute('data-v'),b)})}
segBind($('#drumSeg'),function(v){if(cfg.layout===v)return;stopAll();gameStop();cfg.layout=v;segSync($('#drumSeg'),v);renderDrum();reconvert();lookDirty();warmBank();renderSound();save()});

/* ---------- transport controls ---------- */
$('#btnPlay').addEventListener('click',playPressed);
$('#btnStop').addEventListener('click',function(){stopAll()});
$('#btnLoop').addEventListener('click',function(){loopOn=!loopOn;cfg.loop=loopOn;this.setAttribute('aria-pressed',String(loopOn));$('#loopRow').hidden=!loopOn;if(T.on&&T.clock){T.loopStart=regionStart();T.endB=regionEnd()}if(!T.on)pos=regionStart();syncTempo();save()});
segBind($('#modeSeg'),function(v){if(cfg.mode===v)return;stopAll();cfg.mode=v;segSync($('#modeSeg'),v);save()});
var prog=$('#prog');prog.addEventListener('input',function(){dragging=true;seekTo(+prog.value/1000*totalB())});prog.addEventListener('change',function(){dragging=false});
function loopChange(){lf=clamp(parseInt($('#loopFrom').value,10)||1,1,nBars());lt=clamp(parseInt($('#loopTo').value,10)||nBars(),lf,nBars());$('#loopFrom').value=lf;$('#loopTo').value=lt;if(T.on&&T.clock){T.loopStart=regionStart();T.endB=regionEnd()}if(!T.on)pos=regionStart()}
$('#loopFrom').addEventListener('change',loopChange);$('#loopTo').addEventListener('change',loopChange);
$('#bpmChip').addEventListener('click',function(){openPanel('tempo')});
segBind($('#sizeSeg'),function(v){cfg.score.size=v;segSync($('#sizeSeg'),v);$('#score').className='score '+v;SC.bar=-2;save()});

/* ---------- side panels ---------- */
var XSVG='<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
var PANELS=[['tempo','速度・拍子機'],['hint','提示顏色'],['look','鼓面外觀'],['bg','背景'],['sound','音色'],['play','挑戰・紀錄'],['set','設定']];
function seg(id,arr,cls){return '<div class="seg sm'+(cls?' '+cls:'')+'" id="'+id+'" role="group">'+arr.map(function(a){return '<button type="button" data-v="'+a[0]+'">'+a[1]+'</button>'}).join('')+'</div>'}
var BODY={
 tempo:'<div class="bpm"><button class="rbtn" id="bpmDn" type="button" aria-label="減慢">−</button><div class="bigbpm"><div class="n" id="bpmN">90</div><div class="t" id="bpmT"></div></div><button class="rbtn" id="bpmUp" type="button" aria-label="加快">+</button></div>'
  +'<input type="range" id="bpmR" min="30" max="240" value="90" aria-label="速度"><div class="pres" id="pres"></div><div class="lights" id="lights" aria-hidden="true"></div>'
  +'<div class="row" style="justify-content:space-between"><button class="btn sm" id="btnTap" type="button">TAP 按拍測速</button>'+seg('tsSeg',[['2','2/4'],['3','3/4'],['4','4/4'],['6','6/8']])+'</div><div class="hr"></div>'
  +'<div class="crow"><span>節拍聲</span><div class="row"><button class="tgl" id="btnMetro" type="button" aria-pressed="true">播放時開</button><button class="tgl" id="btnPrev" type="button" aria-pressed="false">試聽</button></div></div>'
  +'<div class="crow"><span>節拍音量</span><input type="range" id="metroVol" min="0" max="100" aria-label="節拍音量"></div>'
  +'<div class="crow"><span>預備拍</span>'+seg('cntSeg',[['0','無'],['1','1 小節'],['2','2 小節']])+'</div><div class="hr"></div>'
  +'<label class="chk"><input type="checkbox" id="rampOn">漸進加速</label><div class="row mute">由 <input type="number" id="rFrom" min="30" max="240" aria-label="起點 BPM"> BPM 開始，每遍 + <input type="number" id="rStep" min="1" max="20" aria-label="每遍加多少"></div><div class="note" id="rampNote"></div>',
 hint:'<div id="hintRoot"></div>',
 look:seg('lookTabs',[['tpl','推薦款式'],['color','顏色'],['pat','花紋']])+'<div id="lookTpl"></div><div id="lookColor" hidden></div><div id="lookPat" hidden></div>',
 bg:'<div class="bgs" id="bgs"></div><div class="crow"><span>自訂顏色</span><input type="color" id="bgCustom" aria-label="自訂背景顏色"></div><label class="chk"><input type="checkbox" id="glowOn">鼓後面加柔光</label>',
 sound:'<div class="tones" id="tones"></div>'
  +'<div class="crow"><span id="octLab">鼓聲音高</span>'+seg('octSeg',[['-1','低八度'],['0','標準'],['1','高八度']])+'</div><p class="note" id="octNote" style="margin:-8px 0 0"></p><div class="hr"></div>'
  +'<div class="crow"><span>鼓聲音量</span><input type="range" id="vol" min="0" max="100" aria-label="鼓聲音量"></div>'
  +'<div class="crow"><span>殘響</span><input type="range" id="rev" min="0" max="100" aria-label="殘響"></div>'
  +'<div class="crow"><span>空間</span>'+seg('roomSeg',[['room','小室'],['hall','廳堂'],['temple','寺院']])+'</div>'
  +'<label class="chk"><input type="checkbox" id="symOn">共鳴泛音：八度、五度的音舌會輕輕跟住響，好像真鼓</label>'
  +'<label class="chk"><input type="checkbox" id="demoOn">示範模式播放鼓聲</label>'
  +'<div class="crow"><span>調音</span>'+seg('tuneSeg',[['440','A = 440'],['432','A = 432']])+'</div><div class="hr"></div>'
  +'<p class="lab">真實錄音</p><p class="note" style="margin:0">用手機錄低你自己的鼓：由低至高逐個音舌敲一下，每個音之間停兩秒，一個檔錄晒全部也可以。上載後程式會自動分段、認出音高，再調準到鼓上每個音。</p>'
  +'<div class="file"><input type="file" id="userFile" accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac" multiple aria-label="上載錄音"></div><div class="note" id="userStat"></div><div class="samps" id="userList"></div>'
  +'<div class="row"><button class="btn sm" id="userClear" type="button">清除錄音</button></div>'
  +'<p class="note" style="margin:0">未有錄音？Freesound 上有 hollandm 錄製的 11 音空靈鼓（CC0，可自由使用），<a href="https://freesound.org/people/hollandm/packs/38732/" target="_blank" rel="noopener">在這裏下載</a>後一次過揀晒 11 個檔上載即可。</p>',
 play:'<p class="lab">聽音認舌</p><p class="note" style="margin:0">程式播一個音，你喺鼓上撳返你覺得係邊個音舌（開咗「真鼓聽音」就可以直接敲真鼓）。</p>'
  +'<div class="crow"><span>難度</span>'+seg('gLevel',[['easy','入門 1・3・5'],['mid','中音 1–7'],['all','全鼓']])+'</div>'
  +'<label class="chk"><input type="checkbox" id="gHide">遊戲時隱藏音舌數字（考耳仔）</label>'
  +'<div class="gbox"><div class="gstat"><b id="gScore">0</b><span>答啱</span></div><div class="gstat"><b id="gStreak">0</b><span>連續</span></div><div class="gstat"><b id="gBest">0</b><span>最佳（10 題）</span></div></div>'
  +'<div class="gmsg" id="gMsg"></div><div class="row"><button class="btn gold" id="gStart" type="button">開始（10 題）</button><button class="btn" id="gAgain" type="button" disabled>再聽一次</button></div><div class="hr"></div>'
  +'<p class="lab">練習紀錄</p><div class="gbox"><div class="gstat"><b id="rToday">0</b><span>今日（分鐘）</span></div><div class="gstat"><b id="rWeek">0</b><span>近 7 日（分鐘）</span></div><div class="gstat"><b id="rDays">0</b><span>連續練習日</span></div></div>'
  +'<div class="rsongs" id="rSongs"></div><p class="note" style="margin:0">用「跟敲」或「等待」模式完成一首歌就會評星：跟敲時撳畫面音舌、或者開「真鼓聽音」敲真鼓都會計分。紀錄只會儲存喺呢部裝置。</p>'
  +'<div><button class="btn sm" id="rReset" type="button">清除紀錄</button></div>',
 set:'<div class="crow"><span>音舌標示</span>'+seg('labSeg',[['jianpu','簡譜'],['solfege','唱名'],['note','音名'],['hidden','隱藏']])+'</div>'
  +'<label class="chk"><input type="checkbox" id="nextOn">播放時用外框預告下一個音</label>'
  +'<div class="crow"><span>鼓面轉向</span>'+seg('rotSeg',[['0','0°'],['90','90°'],['180','180°'],['270','270°']])+'</div>'
  +'<div class="crow"><span>移調</span><select id="trSel"></select></div>'
  +'<div class="crow"><span>鼓上沒有的音</span>'+seg('oosSeg',[['sub','用相近音'],['skip','略過']])+'</div>'
  +'<div class="crow"><span>畫面延遲補償 <span class="mute" id="latTxt"></span></span><input type="range" id="lat" min="0" max="400" step="10" aria-label="畫面延遲補償"></div>'
  +'<p class="note" style="margin:0">用藍牙耳機時聲音會慢少少，拉大補償令亮燈配合聲音。快捷鍵：空白鍵＝播放／暫停。</p>'
  +'<div><button class="btn sm" id="resetAll" type="button">全部還原預設</button></div>'
};
$('#side').innerHTML=PANELS.map(function(p){return '<section class="panel" data-panel="'+p[0]+'" id="p-'+p[0]+'" hidden><div class="ph"><h2>'+p[1]+'</h2><button class="x" type="button" data-close="'+p[0]+'" aria-label="收起">'+XSVG+'</button></div><div class="pb">'+BODY[p[0]]+'</div></section>'}).join('');
var mq=window.matchMedia('(max-width: 959px)'),mob=null,focusSaved=null;
function isMobile(){return mq.matches}
function applyPanels(){var m=isMobile(),any=false;
 PANELS.forEach(function(p){var id=p[0],el=$('#p-'+id),on=m?mob===id:!!cfg.panels[id];el.hidden=!on;if(on){any=true;if(id==='look')buildGallery()}});
 $('#pScore').hidden=!cfg.panels.score;$('#stage').classList.toggle('has-side',!m&&any);$('#stage').classList.toggle('with-score',!!cfg.panels.score);$('#side').classList.toggle('none',!any);
 $$('#dock button[data-p]').forEach(function(b){var id=b.getAttribute('data-p');b.setAttribute('aria-pressed',String(id==='score'?!!cfg.panels.score:(m?mob===id:!!cfg.panels[id])))})}
function togglePanel(id){focusSaved=null;if(id==='score'){cfg.panels.score=!cfg.panels.score;if(cfg.panels.score)buildScore()}else if(isMobile())mob=mob===id?null:id;else cfg.panels[id]=!cfg.panels[id];applyPanels();save()}
function openPanel(id){if(isMobile())mob=id;else cfg.panels[id]=true;applyPanels();save();var el=$('#p-'+id);if(el&&!isMobile())el.scrollIntoView({block:'nearest',behavior:'smooth'})}
$('#dock').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;if(b.id==='btnFocus'){
  if(focusSaved){cfg.panels=focusSaved;focusSaved=null}else{focusSaved=JSON.parse(JSON.stringify(cfg.panels));Object.keys(cfg.panels).forEach(function(k){cfg.panels[k]=false})}mob=null;applyPanels();save();return}
 var p=b.getAttribute('data-p');if(p)togglePanel(p)});
document.addEventListener('click',function(e){var x=e.target.closest('[data-close]');if(!x)return;var id=x.getAttribute('data-close');if(id==='score')cfg.panels.score=false;else if(isMobile())mob=null;else cfg.panels[id]=false;applyPanels();save()});
(mq.addEventListener?mq.addEventListener('change',applyPanels):mq.addListener(applyPanels));

/* tempo panel */
function tempoWord(b){return b<60?'廣板 Largo':b<76?'慢板 Adagio':b<108?'行板 Andante':b<120?'中板 Moderato':b<156?'快板 Allegro':'急板 Presto'}
function buildPres(){var h='';[60,72,90,108,120].forEach(function(b){h+='<button type="button" data-b="'+b+'">'+b+'</button>'});h+='<button type="button" data-b="'+song.bpm+'">原曲 '+song.bpm+'</button>';$('#pres').innerHTML=h}
$('#pres').addEventListener('click',function(e){var b=e.target.closest('button[data-b]');if(b)setBpm(+b.getAttribute('data-b'))});
function syncTempo(){$('#bpmN').textContent=bpm;$('#bpmMini').textContent=bpm;$('#bpmR').value=bpm;$('#bpmT').textContent=tempoWord(bpm);buildPres();
 $$('#pres button').forEach(function(b){b.classList.toggle('on',+b.getAttribute('data-b')===bpm)});
 segSync($('#tsSeg'),bpb);if(lightEls.length!==bpb)buildLights();
 $('#btnMetro').setAttribute('aria-pressed',String(!!cfg.tempo.metro));$('#btnMetro').textContent=cfg.tempo.metro?'播放時開':'播放時關';segSync($('#cntSeg'),cfg.tempo.count);$('#metroVol').value=cfg.snd.metroVol;
 $('#rampOn').checked=!!cfg.tempo.ramp;if(document.activeElement!==$('#rFrom'))$('#rFrom').value=cfg.tempo.rFrom;if(document.activeElement!==$('#rStep'))$('#rStep').value=cfg.tempo.rStep;
 $('#rampNote').textContent=cfg.tempo.ramp?(loopOn?'每次循環完成後加快 '+cfg.tempo.rStep+' BPM，最高 240。':'要先開「循環」，漸進加速才會生效。'):''}
function holdBtn(el,dir){var to=null,iv=null;function stop(){clearTimeout(to);clearInterval(iv);to=iv=null}
 el.addEventListener('pointerdown',function(e){e.preventDefault();stop();setBpm(bpm+dir);to=setTimeout(function(){iv=setInterval(function(){setBpm(bpm+dir*5)},120)},450)});
 ['pointerup','pointerleave','pointercancel'].forEach(function(n){el.addEventListener(n,stop)});el.addEventListener('click',function(e){if(e.detail===0)setBpm(bpm+dir)})}
holdBtn($('#bpmDn'),-1);holdBtn($('#bpmUp'),1);
$('#bpmR').addEventListener('input',function(){setBpm(+this.value)});
var taps=[];$('#btnTap').addEventListener('click',function(){var n=performance.now();if(taps.length&&n-taps[taps.length-1]>2000)taps=[];taps.push(n);if(taps.length>6)taps.shift();if(taps.length>=2){var s=0;for(var i=1;i<taps.length;i++)s+=taps[i]-taps[i-1];setBpm(60000/(s/(taps.length-1)))}});
segBind($('#tsSeg'),function(v){bpb=+v;lt=Math.min(lt,nBars());lf=Math.min(lf,lt);$('#loopFrom').max=$('#loopTo').max=nBars();$('#loopTo').value=lt;$('#loopFrom').value=lf;if(T.on&&T.clock)T.endB=regionEnd();buildLights();buildScore();$('#keyTxt').textContent='1=D　'+bpb+'/'+(v==='6'?8:4);syncTempo()});
$('#btnMetro').addEventListener('click',function(){cfg.tempo.metro=!cfg.tempo.metro;syncTempo();save()});
$('#btnPrev').addEventListener('click',toggleMetro);
$('#metroVol').addEventListener('input',function(){cfg.snd.metroVol=+this.value;if(A.mbus)A.mbus.gain.value=cfg.snd.metroVol/100;save()});
segBind($('#cntSeg'),function(v){cfg.tempo.count=+v;syncTempo();save()});
$('#rampOn').addEventListener('change',function(){cfg.tempo.ramp=this.checked;syncTempo();save()});
$('#rFrom').addEventListener('change',function(){cfg.tempo.rFrom=clamp(+this.value||60,30,240);syncTempo();save()});
$('#rStep').addEventListener('change',function(){cfg.tempo.rStep=clamp(+this.value||4,1,20);syncTempo();save()});

/* hint panel */
function hintChanged(){prevUntil=performance.now()+2200;buildScore();resetKeys();syncHint();save()}
(function(){var r=$('#hintRoot'),h=seg('hMode',[['single','單色'],['degree','按音階'],['hands','左右手']]);
 h+='<div id="hSingle" class="sw" style="margin-top:14px">'+SINGLES.map(function(c){return '<button type="button" class="swb" data-c="'+c+'" style="--c:'+c+'" aria-label="'+c+'"></button>'}).join('')+'<input type="color" data-hc="1" aria-label="自訂顏色"></div>';
 h+='<div id="hDegree" style="margin-top:14px;display:flex;flex-direction:column;gap:14px">'+seg('hPal',['rainbow','bold','sticker','soft','custom'].map(function(k){return [k,PALNAME[k]]}))
  +'<div class="cgrid">'+[1,2,3,4,5,6,7].map(function(d){return '<label class="cg"><input type="color" data-hd="'+d+'" aria-label="'+d+' 的顏色"><span>'+d+'　'+SOL[d-1]+'</span></label>'}).join('')+'</div></div>';
 h+='<div id="hHands" style="margin-top:14px"><div class="cgrid">'+[['l','左手'],['r','右手'],['a','中央／雙手']].map(function(x){return '<label class="cg"><input type="color" data-hh="'+x[0]+'" aria-label="'+x[1]+'"><span>'+x[1]+'</span></label>'}).join('')+'</div><p class="note" style="margin:10px 0 0">按音舌位置分：左邊用左手、右邊用右手，中間兩隻手都可以。</p></div>';
 h+='<label class="chk" style="margin-top:12px"><input type="checkbox" id="pvAll">在鼓上顯示全部顏色</label>';
 r.innerHTML=h;
 r.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var sg=b.closest('.seg');
  if(sg&&sg.id==='hMode'){cfg.hint.mode=b.getAttribute('data-v');hintChanged()}else if(sg&&sg.id==='hPal'){cfg.hint.palette=b.getAttribute('data-v');hintChanged()}else if(b.classList.contains('swb')){cfg.hint.single=b.getAttribute('data-c');hintChanged()}});
 r.addEventListener('input',function(e){var i=e.target;if(i.id==='pvAll'){previewAll=i.checked;resetKeys();return}if(i.type!=='color')return;
  if(i.hasAttribute('data-hc'))cfg.hint.single=i.value;
  else if(i.hasAttribute('data-hd')){if(cfg.hint.palette!=='custom'){cfg.hint.custom=JSON.parse(JSON.stringify(PAL[cfg.hint.palette]||PAL.rainbow));cfg.hint.palette='custom'}cfg.hint.custom[i.getAttribute('data-hd')]=i.value}
  else if(i.hasAttribute('data-hh'))cfg.hint.hands[i.getAttribute('data-hh')]=i.value;
  hintChanged()})})();
function syncHint(){var m=cfg.hint.mode;segSync($('#hMode'),m);segSync($('#hPal'),cfg.hint.palette);$('#hSingle').hidden=m!=='single';$('#hDegree').hidden=m!=='degree';$('#hHands').hidden=m!=='hands';
 $$('#hintRoot .swb').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-c').toLowerCase()===String(cfg.hint.single).toLowerCase())});
 var pal=cfg.hint.palette==='custom'?cfg.hint.custom:(PAL[cfg.hint.palette]||PAL.rainbow);
 $$('#hintRoot input[type=color]').forEach(function(i){var v=i.hasAttribute('data-hc')?cfg.hint.single:i.hasAttribute('data-hd')?pal[i.getAttribute('data-hd')]:cfg.hint.hands[i.getAttribute('data-hh')];if(v&&i.value.toLowerCase()!==String(v).toLowerCase())i.value=v});
 $('#pvAll').checked=previewAll}

/* look panel: recommended styles, fixed colour finishes and patterns (no free colour picking) */
var galDirty=true,colDirty=true,patDirty=true,lookTab='tpl';
function lookDirty(){galDirty=colDirty=patDirty=true;if(!$('#p-look').hidden)buildGallery()}
function swatchBg(c){if(c.fin==='grad'&&c.grad)return 'linear-gradient(135deg,'+c.grad.join(',')+')';if(c.fin==='galaxy')return 'radial-gradient(circle at 35% 30%,'+c.face2+','+c.face+' 75%)';if(c.fin==='linear')return 'linear-gradient(135deg,'+mix(c.face,'#ffffff',.18)+','+c.face+' 50%,'+c.face2+')';return 'radial-gradient(circle at 40% 35%,'+mix(c.face,'#ffffff',.12)+','+c.face+' 55%,'+(c.face2||c.face)+')'}
function buildGallery(){
 if(lookTab==='tpl'&&galDirty){galDirty=false;var h='';
  CATS.forEach(function(cat){h+='<p class="cat">'+cat+'</p><div class="gal">';TPL.forEach(function(t,i){if(t.cat!==cat)return;h+='<button type="button" class="tp" data-t="'+t.id+'"><svg viewBox="0 0 600 600" aria-hidden="true">'+drumHTML(L(),skinOf(t),'t'+i,true)+'</svg><span>'+esc(t.name)+'</span></button>'});h+='</div>'});
  $('#lookTpl').innerHTML=h}
 if(lookTab==='color'&&colDirty){colDirty=false;var t0=skinOf(tplById(cfg.tid));
  var h2='<p class="note" style="margin:0 0 12px">揀一個顏色套用喺目前款式；花紋會自動配色。</p><div class="csws"><button type="button" class="csw" data-c=""><i style="--c:'+swatchBg(t0)+';--r:'+t0.rim+'"></i><span>款式原色</span></button>';
  COLORS.forEach(function(c){h2+='<button type="button" class="csw" data-c="'+c.id+'"><i style="--c:'+swatchBg(c)+';--r:'+c.rim+'"></i><span>'+c.name+'</span></button>'});
  $('#lookColor').innerHTML=h2+'</div>'}
 if(lookTab==='pat'&&patDirty){patDirty=false;var h3='<div class="gal">',base=tplById(cfg.tid);
  PATNAMES.forEach(function(pn,i){h3+='<button type="button" class="tp" data-pat="'+pn[0]+'"><svg viewBox="0 0 600 600" aria-hidden="true">'+drumHTML(L(),skinOf(base,Object.assign({},cfg.ov,{pattern:pn[0]})),'p'+i,true)+'</svg><span>'+pn[1]+'</span></button>'});
  $('#lookPat').innerHTML=h3+'</div><div class="crow" style="margin-top:14px"><span>音舌樣式</span>'+seg('styleSeg',[['cut','刻線'],['flat','實色'],['metal','金屬']])+'</div><div style="margin-top:6px"><button type="button" class="btn sm" id="ovReset">還原款式原本的顏色與花紋</button></div>'}
 syncLook()}
segSync($('#lookTabs'),'tpl');
segBind($('#lookTabs'),function(v){lookTab=v;segSync($('#lookTabs'),v);$('#lookTpl').hidden=v!=='tpl';$('#lookColor').hidden=v!=='color';$('#lookPat').hidden=v!=='pat';buildGallery()});
function syncLook(){var sk=skin();$$('#lookTpl .tp').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-t')===cfg.tid)});
 $$('#lookColor .csw').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-c')===(cfg.ov.color||''))});
 $$('#lookPat .tp').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-pat')===sk.pattern)});segSync($('#styleSeg'),sk.style)}
$('#p-look').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-t')){cfg.tid=b.getAttribute('data-t');cfg.ov={};colDirty=patDirty=true}
 else if(b.hasAttribute('data-c')){var c=b.getAttribute('data-c');if(c)cfg.ov.color=c;else delete cfg.ov.color;patDirty=true}
 else if(b.hasAttribute('data-pat'))cfg.ov.pattern=b.getAttribute('data-pat');
 else if(b.id==='ovReset'){cfg.ov={};patDirty=true}
 else if(b.closest('#styleSeg')){cfg.ov.style=b.getAttribute('data-v');patDirty=true}
 else return;
 renderDrum();buildGallery();save()});

/* background panel */
$('#bgs').innerHTML=BGS.map(function(b){return '<button type="button" class="bgt" data-bg="'+b[0]+'" style="--c:'+b[2]+';--k:'+(lum(b[2])<.28?'#E9EAEE':'#2A2620')+'">'+b[1]+'</button>'}).join('');
function syncBg(){$$('#bgs .bgt').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-bg')===cfg.bg.id)});$('#bgCustom').value=bgColor();$('#glowOn').checked=!!cfg.bg.glow}
$('#bgs').addEventListener('click',function(e){var b=e.target.closest('.bgt');if(!b)return;cfg.bg.id=b.getAttribute('data-bg');applyTheme();syncBg();buildScore();save()});
$('#bgCustom').addEventListener('input',function(){cfg.bg.id='custom';cfg.bg.custom=this.value;applyTheme();syncBg();save()});
$('#bgCustom').addEventListener('change',function(){buildScore()});
$('#glowOn').addEventListener('change',function(){cfg.bg.glow=this.checked;applyTheme();save()});

/* sound panel */
function renderSound(){var h='';TONES.forEach(function(t){h+='<div class="tone'+(cfg.snd.tone===t.id?' on':'')+'" data-tone="'+t.id+'" role="button" tabindex="0"><div class="tt"><b>'+t.name+'</b><small>'+t.desc+'</small></div><button type="button" class="pv" data-pv="'+t.id+'" aria-label="試聽 '+t.name+'"><svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M1 1l10 6-10 6z" fill="currentColor"/></svg></button></div>'});
 var has=!!(A.user&&A.user.length)||!!userMeta;
 h+='<div class="tone'+(cfg.snd.tone==='user'?' on':'')+(has?'':' dis')+'" data-tone="user" role="button" tabindex="0"><div class="tt"><b>真實錄音</b><small>'+(has?'你上載的空靈鼓錄音（'+(userMeta?userMeta.n:A.user.length)+' 個音），自動調準到鼓上每個音':'在下面上載你自己鼓的錄音後就可以用')+'</small></div>'+(has?'<button type="button" class="pv" data-pv="user" aria-label="試聽真實錄音"><svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M1 1l10 6-10 6z" fill="currentColor"/></svg></button>':'')+'</div>';
 $('#tones').innerHTML=h;
 var st='',list=A.user;
 if(list&&list.length){var Lay=L(),direct=0,near=0,far=0;Lay.tongues.forEach(function(t){var tg=soundMidi(t.midi)+12*Math.log2(cfg.snd.tuning/440),bd=99;list.forEach(function(s){bd=Math.min(bd,Math.abs(s.m-tg))});if(bd<=.5)direct++;else if(bd<=3.5)near++;else far++});
  st='已載入 '+list.length+' 個音。鼓上 '+Lay.tongues.length+' 個音舌之中：'+direct+' 個用原音'+(near?'、'+near+' 個由相鄰錄音變調':'')+(far?'、'+far+' 個距離較遠（聲音可能會失真）':'')+'。';
  $('#userList').innerHTML=list.map(function(s,i){return '<button type="button" data-us="'+i+'" title="試聽">'+noteName(s.m)+(Math.abs(s.m-Math.round(s.m))>.08?' '+(s.m>Math.round(s.m)?'+':'−')+Math.round(Math.abs(s.m-Math.round(s.m))*100)+'¢':'')+'</button>'}).join('')}
 else{$('#userList').innerHTML='';st=userMeta?'已儲存 '+userMeta.n+' 個音（'+userMeta.names.join('、')+'），按任何播放鍵後載入。':''}
 if(!$('#userStat').getAttribute('data-busy'))$('#userStat').textContent=st;
 $('#userClear').hidden=!has;$('#vol').value=cfg.snd.vol;$('#rev').value=cfg.snd.rev;segSync($('#roomSeg'),cfg.snd.room);$('#symOn').checked=!!cfg.snd.sym;$('#demoOn').checked=!!cfg.snd.demo;segSync($('#tuneSeg'),cfg.snd.tuning);
 segSync($('#octSeg'),octOf());$('#octLab').textContent=(cfg.layout==='d11'?'11 音鼓':'15 音鼓')+'音高';
 var ms=L().tongues.map(function(t){return soundMidi(t.midi)});$('#octNote').textContent='而家最低 '+noteName(Math.min.apply(null,ms))+'、最高 '+noteName(Math.max.apply(null,ms))+'。細尺寸的鼓（例如 6–10 吋 11 音鼓）通常高一個八度。'}
segBind($('#octSeg'),function(v){cfg.snd.oct=cfg.snd.oct||{};cfg.snd.oct[cfg.layout]=+v;save();warmBank();renderSound();preview(cfg.snd.tone)});
$('#tones').addEventListener('click',function(e){var p=e.target.closest('[data-pv]');if(p){preview(p.getAttribute('data-pv'));return}var t=e.target.closest('.tone');if(!t||t.classList.contains('dis'))return;cfg.snd.tone=t.getAttribute('data-tone');ensureAudio();warmBank();renderSound();save();preview(cfg.snd.tone)});
$('#tones').addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){var t=e.target.closest('.tone');if(t){e.preventDefault();t.click()}}});
$('#vol').addEventListener('input',function(){cfg.snd.vol=+this.value;if(A.bus)A.bus.gain.value=cfg.snd.vol/100;save()});
$('#rev').addEventListener('input',function(){cfg.snd.rev=+this.value;if(A.wet)A.wet.gain.value=cfg.snd.rev/100*.6;save()});
segBind($('#roomSeg'),function(v){cfg.snd.room=v;setRoom();renderSound();save();preview(cfg.snd.tone)});
$('#symOn').addEventListener('change',function(){cfg.snd.sym=this.checked;save()});
$('#demoOn').addEventListener('change',function(){cfg.snd.demo=this.checked;save()});
segBind($('#tuneSeg'),function(v){cfg.snd.tuning=+v;renderSound();warmBank();save()});
function readAB(f){if(f.arrayBuffer)return f.arrayBuffer();return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result)};r.onerror=rej;r.readAsArrayBuffer(f)})}
function decode(c,ab){return new Promise(function(res,rej){var p=c.decodeAudioData(ab,res,rej);if(p&&p.then)p.then(res,rej)})}
$('#userFile').addEventListener('change',function(){var inp=this,files=Array.prototype.slice.call(inp.files||[]),c=ensureAudio(),stat=$('#userStat');if(!files.length||!c)return;
 stat.setAttribute('data-busy','1');stat.textContent='分析緊 '+files.length+' 個檔…';
 Promise.all(files.map(function(f){return readAB(f).then(function(ab){return decode(c,ab)}).then(analyseRecording).catch(function(){return []})})).then(function(lists){
  stat.removeAttribute('data-busy');var all=[].concat.apply([],lists),by={};
  all.forEach(function(s){var k=Math.round(s.m);if(!by[k]||s.q*s.peak>by[k].q*by[k].peak)by[k]=s});
  var list=Object.keys(by).map(function(k){return by[k]}).sort(function(a,b){return a.m-b.m});inp.value='';
  if(!list.length){stat.textContent='認不到音高：請確認錄音清楚、每個音之間有停頓。';return}
  A.user=list;userMeta={n:list.length,names:list.map(function(s){return noteName(s.m)})};store.set('userMeta',userMeta);cfg.snd.tone='user';save();renderSound();preview('user');
  IDB.set('user',packSamples(list)).catch(function(){stat.textContent+=' （瀏覽器未能儲存錄音，重新整理後需要再上載。）'})})});
$('#userList').addEventListener('click',function(e){var b=e.target.closest('[data-us]');if(!b||!A.user)return;var s=A.user[+b.getAttribute('data-us')],c=ensureAudio(),src=c.createBufferSource();src.buffer=s.buf;src.connect(A.bus);src.start()});
$('#userClear').addEventListener('click',function(){A.user=null;userMeta=null;store.set('userMeta',null);IDB.del('user').catch(function(){});if(cfg.snd.tone==='user')cfg.snd.tone='ti';save();renderSound()});

/* settings panel */
(function(){var h='<option value="auto">自動（建議）</option>';for(var s=-6;s<=6;s++)h+='<option value="'+s+'">'+(s===0?'不移調':(s>0?'+':'')+s+' 半音')+'</option>';$('#trSel').innerHTML=h})();
function syncSet(){segSync($('#labSeg'),cfg.hint.labels);$('#nextOn').checked=!!cfg.hint.next;segSync($('#rotSeg'),cfg.set.rot);$('#trSel').value=String(cfg.set.tr);segSync($('#oosSeg'),cfg.set.oos);$('#lat').value=cfg.set.latency;$('#latTxt').textContent=cfg.set.latency+' ms'}
segBind($('#labSeg'),function(v){cfg.hint.labels=v;renderDrum();syncSet();save()});
$('#nextOn').addEventListener('change',function(){cfg.hint.next=this.checked;resetKeys();save()});
segBind($('#rotSeg'),function(v){cfg.set.rot=+v;renderDrum();lookDirty();syncSet();save()});
$('#trSel').addEventListener('change',function(){stopAll();cfg.set.tr=this.value;reconvert();save()});
segBind($('#oosSeg'),function(v){stopAll();cfg.set.oos=v;reconvert();syncSet();save()});
$('#lat').addEventListener('input',function(){cfg.set.latency=+this.value;$('#latTxt').textContent=cfg.set.latency+' ms';save()});
var resetArm=false;$('#resetAll').addEventListener('click',function(){var b=this;if(!resetArm){resetArm=true;b.textContent='再按一次確認還原';setTimeout(function(){resetArm=false;b.textContent='全部還原預設'},3000);return}
 resetArm=false;stopAll();gameStop();var keep=cfg.panels;Object.keys(cfg).forEach(function(k){delete cfg[k]});Object.assign(cfg,JSON.parse(JSON.stringify(DEF)));cfg.panels=keep;loopOn=false;b.textContent='全部還原預設';save();initAll()});

/* ---------- scoring & practice records ---------- */
var SCORE={total:0,hit:0,wrong:0,keys:{},pass:0,ptr:0,lastVb:0,start:0};
function scoreReset(from){SCORE={total:0,hit:0,wrong:0,keys:{},pass:0,ptr:firstIdx(from),lastVb:from,start:from}}
function scoreTick(vb){if(cfg.mode!=='follow')return;var N=conv.notes,win=Math.max(.4,.18*bpm/60);
 if(vb<SCORE.lastVb-.5){SCORE.pass++;SCORE.ptr=firstIdx(T.loopStart)}SCORE.lastVb=vb;
 while(SCORE.ptr<N.length&&N[SCORE.ptr].t<T.endB-1e-6&&N[SCORE.ptr].t+win<vb){SCORE.total++;SCORE.ptr++}}
function starsOf(pc){return pc>=95?3:pc>=80?2:pc>=60?1:0}
function starTxt(n){return '★★★'.slice(0,n)+'☆☆☆'.slice(0,3-n)}
var REC=store.get('rec',null)||{songs:{},days:{}};
function dayKey(d){d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function recordResult(pc,extra){var st=starsOf(pc),r=REC.songs[song.id]||{best:0,stars:0,plays:0};r.best=Math.max(r.best,pc);r.stars=Math.max(r.stars,st);r.plays++;r.last=Date.now();REC.songs[song.id]=r;store.set('rec',REC);
 doneMsg='完成！<b>'+starTxt(st)+'</b>　準確 '+pc+'%'+(extra?'・'+extra:'');doneUntil=performance.now()+7000;renderRecords()}
function scoreFinish(natural){if(cfg.mode!=='follow')return;var N=conv.notes;if(natural){while(SCORE.ptr<N.length&&N[SCORE.ptr].t<T.endB-1e-6){SCORE.total++;SCORE.ptr++}}
 if(SCORE.hit+SCORE.wrong<3||SCORE.total<4)return;recordResult(Math.round(100*SCORE.hit/(SCORE.total+SCORE.wrong*.5)),'命中 '+SCORE.hit+' / '+SCORE.total)}
var pracLast=0,pracSave=0;
function practiceTick(){var now=performance.now(),dt=pracLast?Math.min(.5,(now-pracLast)/1000):0;pracLast=now;if(!((T.on&&T.kind==='song')||G.on))return;var k=dayKey();REC.days[k]=(REC.days[k]||0)+dt;
 if(now-pracSave>15000){pracSave=now;store.set('rec',REC);renderRecords()}}
function renderRecords(){var el=$('#rSongs');if(!el)return;var today=REC.days[dayKey()]||0,week=0,streak=0,d=new Date();
 for(var i=0;i<7;i++){var dd=new Date(d.getFullYear(),d.getMonth(),d.getDate()-i);week+=REC.days[dayKey(dd)]||0}
 for(var j=0;j<400;j++){var d2=new Date(d.getFullYear(),d.getMonth(),d.getDate()-j),v=REC.days[dayKey(d2)]||0;if(v>=60)streak++;else if(j>0)break}
 $('#rToday').textContent=Math.floor(today/60);$('#rWeek').textContent=Math.floor(week/60);$('#rDays').textContent=streak;
 var rows=songs.filter(function(s){return REC.songs[s.id]}).map(function(s){var r=REC.songs[s.id];return '<div class="rs"><span class="nm">'+esc(s.name)+'</span><span class="st" aria-label="'+r.stars+' 粒星">'+starTxt(r.stars)+'</span><span class="pc">最佳 '+r.best+'%</span></div>'});
 el.innerHTML=rows.length?rows.join(''):'<p class="note" style="margin:0">未有紀錄，揀首歌用「跟敲」或「等待」模式試下。</p>'}
var recArm=false;$('#rReset').addEventListener('click',function(){var b=this;if(!recArm){recArm=true;b.textContent='再按一次確認清除';setTimeout(function(){recArm=false;b.textContent='清除紀錄'},3000);return}
 recArm=false;b.textContent='清除紀錄';REC={songs:{},days:{}};store.set('rec',REC);renderRecords()});

/* ---------- ear-training game ---------- */
var G={on:false,round:0,total:10,score:0,streak:0,target:null,lock:false,prev:null,msg:''};
var gameBest=store.get('gameBest',{});
function gamePool(){var Ls=L().tongues;if(cfg.game.level==='easy')return Ls.filter(function(t){return t.oct===0&&[1,3,5].indexOf(t.deg)>=0});if(cfg.game.level==='mid')return Ls.filter(function(t){return t.oct===0});return Ls.slice()}
function syncGame(){segSync($('#gLevel'),cfg.game.level);$('#gHide').checked=!!cfg.game.hide;$('#gScore').textContent=G.score+(G.round?' / '+G.round:'');$('#gStreak').textContent=G.streak;$('#gBest').textContent=gameBest[cfg.game.level]||0;
 $('#gMsg').innerHTML=G.msg;$('#gStart').textContent=G.on?'停止':'開始（10 題）';$('#gAgain').disabled=!G.on}
function gameStart(){if(T.on)stopAll();ensureAudio();warmBank();G={on:true,round:0,total:10,score:0,streak:0,target:null,lock:false,prev:null,msg:''};if(cfg.game.hide)renderDrum();gameNext()}
function gameStop(){if(!G.on)return;G.on=false;G.msg='';if(cfg.game.hide)renderDrum();syncGame()}
function gameSay(h){G.msg=h;syncGame()}
function gameNext(){if(!G.on)return;if(G.round>=G.total){gameEnd();return}var pool=gamePool(),t;do{t=pool[Math.floor(Math.random()*pool.length)]}while(pool.length>1&&t.id===G.prev);
 G.target=t.id;G.prev=t.id;G.round++;G.lock=false;gameSay('第 '+G.round+' / '+G.total+' 題：聽清楚，再敲返呢個音');setTimeout(function(){if(G.on&&A.ctx)playNote(G.target,.92,A.ctx.currentTime+.03)},350)}
function gameAnswer(ids){if(!G.on||G.lock||!G.target)return;G.lock=true;var now=performance.now(),tg=L().byId[G.target],ok=ids.indexOf(G.target)>=0;
 if(ok){G.score++;G.streak++;flash[G.target]=now+650;gameSay('答啱！'+(G.streak>=3?'連續 <b>'+G.streak+'</b> 題 ✓':''));setTimeout(gameNext,1000)}
 else{G.streak=0;wrongId=ids[0];wrongUntil=now+700;gameSay('唔係呢個，正確答案係 <b>'+tg.deg+(tg.oct>0?'（高音）':tg.oct<0?'（低音）':'')+'</b>');
  setTimeout(function(){if(!G.on)return;flash[G.target]=performance.now()+900;playNote(G.target,.9,A.ctx.currentTime+.02)},750);setTimeout(gameNext,2600)}}
function gameEnd(){var lv=cfg.game.level,sc=G.score;if(sc>(gameBest[lv]||0)){gameBest[lv]=sc;store.set('gameBest',gameBest)}G.on=false;if(cfg.game.hide)renderDrum();
 G.msg='完成！答啱 <b>'+sc+' / '+G.total+'</b>　'+starTxt(sc>=10?3:sc>=8?2:sc>=6?1:0);syncGame()}
segBind($('#gLevel'),function(v){cfg.game.level=v;save();syncGame()});
$('#gHide').addEventListener('change',function(){cfg.game.hide=this.checked;save();if(G.on)renderDrum()});
$('#gStart').addEventListener('click',function(){if(G.on)gameStop();else gameStart()});
$('#gAgain').addEventListener('click',function(){if(G.on&&G.target&&A.ctx)playNote(G.target,.92,A.ctx.currentTime+.03)});

/* ---------- listen to the real drum (microphone) ---------- */
var MIC={on:false,stream:null,src:null,an:null,buf:null,floor:.003,prev:0,last:0,pend:0,heard:'',until:0};
function syncMic(){var b=$('#btnMic');b.setAttribute('aria-pressed',String(MIC.on))}
function micFail(){micStop();doneMsg='開唔到咪高峰：請允許瀏覽器用咪高峰；喺 Claude 預覽入面唔支援，請用 GitHub 網頁版';doneUntil=performance.now()+7000}
function micStart(){var c=ensureAudio();if(!c)return;if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)){micFail();return}
 navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}).then(function(st){
  MIC.stream=st;MIC.src=c.createMediaStreamSource(st);MIC.an=c.createAnalyser();MIC.an.fftSize=4096;MIC.src.connect(MIC.an);MIC.buf=new Float32Array(MIC.an.fftSize);MIC.on=true;MIC.floor=.003;syncMic();
  doneMsg='真鼓聽音已開：喺鼓上敲一下試試（建議戴耳機，避免聽到示範聲）';doneUntil=performance.now()+5000},micFail)}
function micStop(){MIC.on=false;if(MIC.stream)MIC.stream.getTracks().forEach(function(t){t.stop()});try{if(MIC.src)MIC.src.disconnect()}catch(e){}MIC.stream=MIC.src=MIC.an=null;syncMic()}
$('#btnMic').addEventListener('click',function(){if(MIC.on)micStop();else micStart()});
function micTick(){if(!MIC.on||!MIC.an)return;var b=MIC.buf,n=b.length,s=0,now=performance.now();MIC.an.getFloatTimeDomainData(b);for(var i=n-1024;i<n;i++)s+=b[i]*b[i];var rms=Math.sqrt(s/1024);
 MIC.floor=rms<MIC.floor?rms:MIC.floor*.995+rms*.005;
 if(!MIC.pend&&rms>Math.max(.01,MIC.floor*4)&&rms>MIC.prev*1.6&&now-MIC.last>150){MIC.pend=now+75;MIC.last=now}
 MIC.prev=rms;
 if(MIC.pend&&now>=MIC.pend){MIC.pend=0;var c=A.ctx,ct=c.currentTime;
  if(cfg.mode==='demo'&&T.on&&T.kind==='song'&&cfg.snd.demo)return;
  if(A.clicks.some(function(t){return Math.abs(ct-t)<.12}))return;
  var sr=c.sampleRate,tmax=Math.ceil(sr/70),p=detectPitch(b,sr,Math.max(0,n-2048-tmax-2));if(p&&p.q>.5)micNote(p.f)}}
function micNote(f){var m=69+12*Math.log2(f/cfg.snd.tuning)-12*octOf(),Ls=L().tongues,cand=[];
 Ls.forEach(function(t){var d=Math.abs(t.midi-m);if(d<=.6)cand.push([d,t])});
 if(!cand.length)Ls.forEach(function(t){var d=Math.min(Math.abs(t.midi-m-12),Math.abs(t.midi-m+12));if(d<=.6)cand.push([d+.5,t])});
 if(!cand.length)return;cand.sort(function(a,b){return a[0]-b[0]});var t=cand[0][1],now=performance.now();
 MIC.heard=t.deg+(t.oct>0?'（高音）':t.oct<0?'（低音）':'');MIC.until=now+900;flash[t.id]=now+220;routeHit(cand.map(function(c){return c[1].id}))}

/* ---------- fullscreen (for projecting in class) ---------- */
(function(){var b=$('#btnFull'),d=document,el=d.documentElement;if(!(el.requestFullscreen||el.webkitRequestFullscreen)){b.hidden=true;return}
 b.addEventListener('click',function(){try{if(d.fullscreenElement||d.webkitFullscreenElement){(d.exitFullscreen||d.webkitExitFullscreen).call(d)}else{var r=(el.requestFullscreen||el.webkitRequestFullscreen).call(el);if(r&&r.catch)r.catch(function(){b.hidden=true})}}catch(e){b.hidden=true}})})();

/* ---------- import modal ---------- */
function openImp(){$('#imp').hidden=false;$('#impErr').textContent=''}
function closeImp(){$('#imp').hidden=true}
$('#btnImport').addEventListener('click',openImp);$('#impClose').addEventListener('click',closeImp);
$('#imp').addEventListener('pointerdown',function(e){if(e.target===this)closeImp()});
function addSong(s){songs.push(s);saveCustom();closeImp();setSong(s.id)}
$('#midiFile').addEventListener('change',function(){var f=this.files&&this.files[0],inp=this;if(!f)return;readAB(f).then(function(ab){
  try{var m=parseMidi(ab),tracks=m.tracks.map(function(tr){return {name:tr.name,notes:tr.notes.slice(0,4000).map(function(n){return [Math.round(n[0]*1000)/1000,Math.round(n[1]*1000)/1000,n[2]]})}});
   addSong({id:'m'+Date.now(),name:f.name.replace(/\.[^.]+$/,''),source:'midi',bpm:m.bpm,ts:m.ts,raw:{tracks:tracks,trackIdx:pickTrack(tracks)}});inp.value=''}
  catch(err){$('#impErr').textContent='匯入失敗：'+(err&&err.message||err)}},function(){$('#impErr').textContent='讀取檔案失敗'})});
$('#jpAdd').addEventListener('click',function(){var text=$('#jpText').value,r=parseJianpu(text);
 if(r.errors.length){$('#impErr').textContent=r.errors.slice(0,5).join('；')+(r.errors.length>5?'…':'');return}
 if(!r.notes.length){$('#impErr').textContent='沒有讀到任何音符';return}
 addSong({id:'j'+Date.now(),name:r.name||'我的樂曲',source:'jianpu',bpm:r.bpm,ts:r.ts,text:text,raw:{notes:r.notes,len:r.len}})});

/* ---------- keys & visibility ---------- */
document.addEventListener('keydown',function(e){
 if(e.key==='Escape'){if(!$('#imp').hidden)closeImp();else if(isMobile()&&mob){mob=null;applyPanels()}return}
 var tg=e.target.tagName;if(e.key===' '&&tg!=='INPUT'&&tg!=='SELECT'&&tg!=='TEXTAREA'&&tg!=='BUTTON'&&!(e.target.closest&&e.target.closest('[role=button]'))){e.preventDefault();playPressed()}});
document.addEventListener('visibilitychange',function(){if(document.hidden&&T.on&&T.clock&&T.kind==='song')pauseSong();else if(document.hidden&&T.on&&T.kind==='metro')stopAll()});

/* ---------- init ---------- */
function initAll(){
 if(!LAY[cfg.layout])cfg.layout='d15';
 song=songs.filter(function(s){return s.id===cfg.song})[0]||songs[0];bpm=cfg.bpmBySong[song.id]||song.bpm;bpb=(song.ts&&song.ts[0])||4;pos=0;
 applyTheme();refreshSongSel();segSync($('#drumSeg'),cfg.layout);segSync($('#modeSeg'),cfg.mode);segSync($('#sizeSeg'),cfg.score.size);
 $('#btnLoop').setAttribute('aria-pressed',String(loopOn));$('#loopRow').hidden=!loopOn;
 renderDrum();galDirty=colDirty=patDirty=true;applyPanels();reconvert();syncTempo();syncHint();syncLook();syncBg();renderSound();syncSet();syncPlayBtn();syncGame();syncMic();renderRecords()}
initAll();
window.__tdc={parseJianpu:parseJianpu,parseMidi:parseMidi,convert:convert,analyseRecording:analyseRecording,detectPitch:detectPitch,cfg:cfg,A:A,get conv(){return conv},get T(){return T},get SC(){return SC},songs:songs,playNote:playNote,get G(){return G},get vb(){return vBeat()},get SCORE(){return SCORE},REC:REC,micNote:micNote,routeHit:routeHit,renderTone:renderTone,TONES:TONES,makeIR:makeIR,hz:hz,L:L,soundMidi:soundMidi,ensureAudio:ensureAudio};
requestAnimationFrame(frame);
})();
