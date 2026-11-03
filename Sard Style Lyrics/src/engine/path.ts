export type Direction='right'|'down'|'diagonal';
export const directions:Direction[]=['right','down','diagonal'];
export function phraseDirection(text:string,index:number):Direction {let hash=2166136261;for(const char of text+'|'+index)hash=Math.imul(hash^char.charCodeAt(0),16777619);hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;return directions[(hash>>>0)%directions.length];}
export type Box={left:number;right:number;height:number};
export type Point={x:number;y:number};
export type Rect={left:number;right:number;top:number;bottom:number};
export function rectangle(point:Point,box:Box):Rect{return {left:point.x+box.left,right:point.x+box.right,top:point.y-box.height/2,bottom:point.y+box.height/2};}
export function overlaps(a:Rect,b:Rect){return a.left<b.right+2&&a.right>b.left-2&&a.top<b.bottom+2&&a.bottom>b.top-2;}
/** Prefer available screen space, rejecting every overlap before considering direction. */
export function placeNear(origin:Point,a:Box,b:Box,preferred:Direction,occupied:Rect[],screen:Rect,reverse=false):Point{
 const modes=[preferred,...directions.filter(mode=>mode!==preferred)];let best:Point={x:0,y:0},score=Infinity;
 for(let radius=0;radius<8;radius++)for(let j=0;j<modes.length;j++){
  const mode=modes[j],gap=4+radius*24;
  let dx=mode==='down'?0:a.right+gap-b.left;
  let dy=mode==='right'?0:mode==='down'?(a.height+b.height)/2+gap:(a.height+b.height)*.3;
  if(reverse){dx=-dx;dy=-dy;}
  const point={x:origin.x+dx,y:origin.y+dy},rect=rectangle(point,b);
  if(occupied.some(other=>overlaps(rect,other)))continue;
  const overflow=Math.max(0,screen.left-rect.left)+Math.max(0,rect.right-screen.right)+Math.max(0,screen.top-rect.top)+Math.max(0,rect.bottom-screen.bottom);
  const value=overflow*20+radius*10+j;
  if(value<score){best=point;score=value;}
 }
 return best;
}
