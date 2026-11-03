import {useEffect,useRef,useState} from 'react';
import {getCurrentWindow} from '@tauri-apps/api/window';
import {useLiveSession} from './hooks/useLiveSession';
import {native} from './services/native';
import {appearance} from './appearance';
import Visualizer from './Visualizer';
import Vinyl from './Vinyl';
const time=(value:number)=>`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`;
export default function App(){
 const [visible,setVisible]=useState(true),[position,setPosition]=useState(0),[full,setFull]=useState(false);
 const session=useLiveSession(appearance.device),lastActivity=useRef(performance.now());
 const {enabled,setEnabled,status,track,lyrics,timelineUsable,note,clock,level}=session;
 const rendering=!!lyrics&&timelineUsable;
 useEffect(()=>{const timer=setInterval(()=>{setPosition(clock.position());setVisible(!rendering||performance.now()-lastActivity.current<3200);},100);return()=>clearInterval(timer);},[clock,rendering]);
 async function fullscreen(){try{if(native){const win=getCurrentWindow();const value=!(await win.isFullscreen());await win.setFullscreen(value);setFull(value);}else{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();setFull(!!document.fullscreenElement);}}catch{/* Retry from a later fullscreen gesture. */}}
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&full)void fullscreen();if(event.key==='f'&&!(event.target as HTMLElement).matches('input,button'))void fullscreen();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[full]);
 return <main className={visible?'':'immersive'} style={{background:appearance.background,color:appearance.color}} onPointerMove={()=>{lastActivity.current=performance.now();setVisible(true);}} onFocusCapture={()=>{lastActivity.current=performance.now();setVisible(true);}}>
  <header className="chrome"><a className="wordmark" href="#" onClick={event=>event.preventDefault()} aria-label="Sard Style Lyrics"><strong className="brand-bold">Sard</strong><span className="brand-outline">Style</span><span className="brand-box">Lyrics</span></a><div className="top-right"><span className="edition">v{__APP_VERSION__}</span><button className="icon-button" aria-label="Toggle fullscreen" onClick={()=>void fullscreen()}>⛶</button></div></header>
  {rendering?<Visualizer lyrics={lyrics} clock={clock} settings={appearance} level={level}/>:<div className="waiting-stage"><p role="status">{note}</p></div>}
  <footer><div className="track-row"><div className="track-info"><Vinyl track={track} audio={session.audio} playing={enabled&&(clock.playing||!!session.audio?.available&&!session.audio?.silent)}/><div className="chrome"><div className="eyebrow">{track?'NOW PLAYING':'SARD STYLE LYRICS'}</div><strong>{track?.title??'Waiting for your music'}</strong><p>{track?.artist??'Play music in your usual player.'}</p></div></div><div className="track-tools chrome">{track&&enabled&&<button disabled={session.tryingAlternative||status==='Searching lyrics'} onClick={session.tryAlternative}>{session.tryingAlternative?'Δοκιμή άλλης εκδοχής…':'Οι στίχοι δεν συγχρονίζονται'}</button>}<button onClick={()=>setEnabled(!enabled)}>{enabled?'Pause listening':'Resume listening'} <span className="tiny-level" style={{opacity:session.audio?.silent?.3:1}}>▂▅▃</span></button></div></div>
   <div className="timeline-row chrome"><span>{time(position)}</span><input aria-label="Media playback position (read only)" type="range" min="0" max={track?.duration||300} value={Math.min(position,track?.duration||300)} disabled/><span>{time(track?.duration||0)}</span></div>
   {rendering&&note&&<p role="status">{note}</p>}
  </footer>
  <div className="screen-vignette" aria-hidden="true"/><svg className="screen-noise" aria-hidden="true" width="100%" height="100%"><defs><filter id="screen-grain" x="0%" y="0%" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" seed="47"/><feColorMatrix type="saturate" values="0"/></filter></defs><rect width="100%" height="100%" filter="url(#screen-grain)"/></svg>
  <svg className="letter-patina-defs" aria-hidden="true" width="0" height="0"><defs><filter id="letter-patina" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.009 0.012" numOctaves="3" seed="83" result="patches"/><feColorMatrix in="patches" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 6 0 0 0 -2.5" result="shade"/><feTurbulence type="fractalNoise" baseFrequency="0.48" numOctaves="1" seed="137" result="fine-grain"/><feColorMatrix in="fine-grain" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0 0 0 0.4" result="grain-alpha"/><feComposite in="shade" in2="grain-alpha" operator="in" result="patina"/><feComponentTransfer in="patina" result="light-patina"><feFuncA type="linear" slope="0.28"/></feComponentTransfer><feComposite in="light-patina" in2="SourceGraphic" operator="in" result="letter-shade"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="letter-shade"/></feMerge></filter></defs></svg>
 </main>;
}
