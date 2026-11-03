import {useEffect,useRef} from 'react';
import type {Lyrics,Settings,LyricLine} from './types';
import type {PlaybackClock} from './engine/clock';
import {phraseDirection,placeNear,rectangle} from './engine/path';
import {entrancePlan,incomingOpacity,outgoingOpacity} from './engine/entrance';
import {cameraStep,cameraBlur} from './engine/camera';
import {lineDecorations} from './engine/typography';
export default function Visualizer({lyrics,clock,settings}:{lyrics:Lyrics|null;clock:PlaybackClock;settings:Readonly<Settings>;level:React.RefObject<number>}){
 const stage=useRef<HTMLDivElement>(null),scene=useRef<HTMLDivElement>(null),hint=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!stage.current||!scene.current)return;
  const viewport=stage.current,world=scene.current,panels=new Map<number,HTMLDivElement>();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf=0,last=-2,current=-1,target={x:0,y:0},camera={x:0,y:0,vx:0,vy:0},initialized=false,at=performance.now();
  function create(line:LyricLine,index:number){
   const panel=document.createElement('div');panel.dataset.line=String(index);
   const content=document.createElement('div');content.className='phrase-content';panel.append(content);
   const decoration=lineDecorations(line);
   line.words.forEach((word,i)=>{
    const el=document.createElement('span'),glyph=document.createElement('span');
    const trailing=word.text.match(/\s+$/u)?.[0]??'';
    glyph.className='lyric-glyph';
    Array.from((trailing?word.text.slice(0,-trailing.length):word.text).normalize('NFC')).forEach(char=>{const letter=document.createElement('span');letter.className='lyric-letter';letter.textContent=char;glyph.append(letter);});
    el.className='lyric-word';el.style.fontSize=decoration.scales[i]+'em';el.append(glyph);
    if(decoration.bold[i])el.classList.add('is-bold');if(decoration.italic[i])el.classList.add('is-italic');
    if(decoration.enlarged[i])el.classList.add('lyric-word--short');
    if(i===decoration.highlightIndex){el.classList.add('is-featured');el.style.setProperty('--featured-color',decoration.highlightColor);}if(i===decoration.underlineIndex)el.classList.add('is-underlined');if(i===decoration.outlineIndex)el.classList.add('is-outlined');
    content.append(el);
    if(trailing){const gap=document.createElement('span');gap.className=decoration.enlarged[i]||decoration.enlarged[i+1]?'lyric-gap--tight':'lyric-gap';gap.textContent=trailing;content.append(gap);}
   });
   world.append(panel);panels.set(index,panel);return panel;
  }
  const positions=new Map<number,{x:number;y:number}>();
  function layout(){
   if(current<0)return;
   const width=Math.min(820,viewport.clientWidth*.64);
   panels.forEach((panel,index)=>{
    panel.style.width=width+'px';
    const content=panel.firstElementChild as HTMLElement;
    const base=parseFloat(getComputedStyle(content).fontSize);
    const words=Array.from(content.querySelectorAll<HTMLElement>('.lyric-word'));
    words.forEach(el=>{el.style.width='';(el.firstElementChild as HTMLElement).style.transform='none';el.classList.remove('is-condensed');});
    const measured=words.map(el=>{const glyph=el.firstElementChild as HTMLElement,css=getComputedStyle(el);return {el,glyph,width:glyph.offsetWidth,extra:parseFloat(css.paddingLeft)+parseFloat(css.paddingRight)+parseFloat(css.borderLeftWidth)+parseFloat(css.borderRightWidth)};});
    measured.forEach(({el,glyph,width:natural,extra})=>{if(natural>base*3.2||natural>width*.85){const ratio=Math.max(.5,Math.min(.8,(width-extra)/natural));el.style.width=natural*ratio+extra+'px';glyph.style.transform='scaleX('+ratio+')';el.classList.add('is-condensed');}});
   });
   const bounds=new Map<number,{left:number;right:number;height:number}>();
   panels.forEach((panel,index)=>{
    const words=Array.from(panel.querySelectorAll<HTMLElement>('.lyric-word'));
    const scale=1;
    bounds.set(index,{left:((words.length?Math.min(...words.map(word=>word.offsetLeft)):width/2)-width/2)*scale,right:((words.length?Math.max(...words.map(word=>word.offsetLeft+word.offsetWidth)):width/2)-width/2)*scale,height:panel.offsetHeight*scale});
   });
   const anchor=positions.get(current)??{x:0,y:0};positions.set(current,anchor);
   const screen={left:anchor.x-viewport.clientWidth/2+12,right:anchor.x+viewport.clientWidth/2-12,top:anchor.y-viewport.clientHeight/2+12,bottom:anchor.y+viewport.clientHeight/2-12};
   const occupied=[rectangle(anchor,bounds.get(current)!)];
   for(let i=current-1;panels.has(i);i--){
    const after=positions.get(i+1)!,box=bounds.get(i)!,point=positions.get(i)??placeNear(after,bounds.get(i+1)!,box,phraseDirection(lyrics?.lines[i+1]?.text??'',i+1),occupied,screen,true);
    positions.set(i,point);occupied.push(rectangle(point,box));
   }
   for(let i=current+1;panels.has(i);i++){
    const before=positions.get(i-1)!,a=bounds.get(i-1)!,b=bounds.get(i)!;
    const point=positions.get(i)??placeNear(before,a,b,phraseDirection(lyrics?.lines[i]?.text??'',i),occupied,screen);
    positions.set(i,point);occupied.push(rectangle(point,b));
   }
   panels.forEach((panel,index)=>{const point=positions.get(index);if(point){panel.style.left=point.x+'px';panel.style.top=point.y+'px';}});
   target={x:-anchor.x,y:-anchor.y};
   if(!initialized||reduced){camera={...target,vx:0,vy:0};initialized=true;}
  }
  const resize=new ResizeObserver(layout);resize.observe(viewport);
  function draw(){
   const t=clock.position()+settings.offset,index=lyrics?.lines.findIndex(line=>t>=line.start&&t<line.end)??-1;
   if(index!==last){
    world.classList.toggle('camera-snap',!initialized||reduced);current=index;
    if(index>=0&&lyrics){
     for(let i=Math.max(0,index-2);i<=Math.min(lyrics.lines.length-1,index+2);i++)if(!panels.has(i))create(lyrics.lines[i],i);
     panels.forEach((panel,i)=>{if(i<index-2||i>index+2){panel.remove();panels.delete(i);return;}panel.className='lyric-panel '+(i===index?'is-current':i<index?'is-past':'is-next');panel.dataset.direction=phraseDirection(lyrics.lines[i].text,i);panel.setAttribute('aria-hidden',String(i!==index));panel.firstElementChild!.className=i===index?'phrase':'phrase-content';});
     world.style.visibility='visible';
    }else world.style.visibility='hidden';
    layout();if(hint.current)hint.current.textContent=index>=0?String(index+1).padStart(2,'0')+' / '+String(lyrics!.lines.length).padStart(2,'0'):'';
    last=index;
   }
   panels.forEach((panel,i)=>{
    const line=lyrics?.lines[i];if(!line)return;
    const plan=entrancePlan(line,i,lyrics?.lines[i-1]);
    const revealed=i===current+1&&t>=line.start-plan.lead;
    panel.classList.toggle('is-revealed',revealed);
    panel.dataset.entrance=plan.instant?'instant':'fade';
    panel.style.opacity=String(i<current?outgoingOpacity(t,line.end):1);
    panel.querySelectorAll<HTMLElement>('.lyric-word').forEach((word,j)=>{
     word.style.opacity=String(i>current?incomingOpacity(t,line,j,plan.instant||reduced,plan.lead):1);
    });
    if(i===current||revealed)panel.dataset.dropped='yes';
   });
   const now=performance.now(),dt=Math.min(50,Math.max(0,now-at));at=now;
   camera=cameraStep(camera,target,dt/1000,reduced);
   const blur=cameraBlur(camera,reduced);
   world.style.setProperty('--camera-blur',blur<.025?'0px':blur.toFixed(3)+'px');
   world.style.transform='translate3d('+camera.x+'px,'+camera.y+'px,0)';
   raf=requestAnimationFrame(draw);
  }
  draw();return()=>{cancelAnimationFrame(raf);resize.disconnect();world.replaceChildren();};
 },[lyrics,clock,settings]);
 return <div className="visual-stage camera-viewport" ref={stage} aria-label="Animated lyrics" style={{fontSize:`clamp(24px, ${settings.size/12}vw, ${settings.size}px)`,fontFamily:settings.font}}><svg className="texture-defs" width="0" height="0" aria-hidden="true"><defs><filter id="wall-wear" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.38 0.42" numOctaves="1" seed="113" result="spray-grain"/><feColorMatrix in="spray-grain" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 22 0 0 0 -13.9" result="specks"/><feTurbulence type="fractalNoise" baseFrequency="0.035 0.045" numOctaves="2" seed="39" result="spray-cloud"/><feColorMatrix in="spray-cloud" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 8 0 0 0 -3" result="density"/><feComposite in="specks" in2="density" operator="in" result="chips"/><feComposite in="chips" in2="SourceGraphic" operator="in" result="ink"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="ink"/></feMerge></filter></defs></svg><div className="lyric-world camera-snap" ref={scene}/><div className="phrase-count" ref={hint}/><div className="sr-only" role="log">{lyrics?'Lyrics follow the playback timeline.':'Waiting for lyrics.'}</div></div>;
}
