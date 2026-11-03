import {useEffect,useRef} from 'react';
import type {AudioSnapshot,Track} from './types';
export default function Vinyl({track,audio,playing}:{track:Track|null;audio:AudioSnapshot|null;playing:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),latest=useRef({audio,playing});latest.current={audio,playing};
 useEffect(()=>{
  const surface=canvas.current;if(!surface)return;const context=surface.getContext('2d');if(!context)return;
  const ratio=Math.min(2,window.devicePixelRatio||1),size=136;surface.width=size*ratio;surface.height=size*ratio;context.scale(ratio,ratio);
  const bars=new Float32Array(64);let raf=0,at=performance.now();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function draw(){const now=performance.now(),dt=Math.min(.06,(now-at)/1000);at=now;const {audio,playing}=latest.current;
   context!.clearRect(0,0,size,size);let peak=0;
   for(let i=0;i<64;i++){
    const band=i<32?i:63-i,target=playing&&audio?.available&&!audio.silent?Math.max(0,Math.min(1,audio.spectrum?.[band]??0)):0;
    bars[i]+=(target-bars[i])*(1-Math.exp(-dt/(target>bars[i]?.055:.18)));
    const value=reduced?target:bars[i];peak=Math.max(peak,value);
    const angle=i/64*Math.PI*2-Math.PI/2,radius=52,length=1.5+value*13;
    context!.beginPath();context!.strokeStyle='rgba(255,224,0,'+(.32+value*.68)+')';context!.lineWidth=2;context!.lineCap='round';
    context!.moveTo(68+Math.cos(angle)*radius,68+Math.sin(angle)*radius);context!.lineTo(68+Math.cos(angle)*(radius+length),68+Math.sin(angle)*(radius+length));context!.stroke();
   }
   surface!.dataset.peak=peak.toFixed(3);raf=requestAnimationFrame(draw);
  }draw();return()=>cancelAnimationFrame(raf);
 },[]);
 return <div className="vinyl-shell" role="img" aria-label={track?'Βινύλιο: '+track.title+' — '+track.artist:'Βινύλιο: αναμονή μουσικής'}>
  <canvas ref={canvas} className="vinyl-spectrum" aria-hidden="true"/>
  <div className={'vinyl-record'+(playing?' is-spinning':'')} aria-hidden="true"/>
  <div className="vinyl-label"><strong>{track?.title??'Sard Style'}</strong><span>{track?.artist??'Lyrics'}</span><i aria-hidden="true"/></div>
 </div>;
}
