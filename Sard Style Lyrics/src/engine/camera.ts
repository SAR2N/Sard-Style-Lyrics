export type CameraState={x:number;y:number;vx:number;vy:number};
/** Exact critically damped integration: smooth acceleration, preserved velocity on retarget. */
export function cameraStep(state:CameraState,target:{x:number;y:number},seconds:number,reduced=false):CameraState{
 if(reduced)return {...target,vx:0,vy:0};
 const dt=Math.max(0,Math.min(.05,seconds)),omega=8.5,decay=Math.exp(-omega*dt);
 function axis(position:number,velocity:number,destination:number){const error=position-destination,j=velocity+omega*error;return {position:destination+(error+j*dt)*decay,velocity:(velocity-omega*j*dt)*decay};}
 const x=axis(state.x,state.vx,target.x),y=axis(state.y,state.vy,target.y);
 return {x:x.position,y:y.position,vx:x.velocity,vy:y.velocity};
}
export function cameraBlur(state:CameraState,reduced=false){return reduced?0:Math.min(1.25,Math.hypot(state.vx,state.vy)*.0017);}
