import type {LyricLine} from '../types';
const smooth=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
export function entrancePlan(line:LyricLine,index:number,previous?:LyricLine){
 const available=previous?line.start-previous.start:line.end-line.start;
 const instant=available<1.8||line.end-line.start<1.4||index%7===5;
 return {instant,lead:instant?Math.min(.18,available*.25):Math.min(.65,available*.4)};
}
export function incomingOpacity(time:number,line:LyricLine,word:number,instant:boolean,lead:number){
 const start=line.start-lead;
 if(instant)return time>=start?1:0;
 const duration=Math.min(.16,lead*.35),stagger=(lead-duration)/Math.max(1,line.words.length-1);
 return smooth((time-start-word*stagger)/duration);
}
export function outgoingOpacity(time:number,end:number){return 1-smooth((time-end)/2.2);}
