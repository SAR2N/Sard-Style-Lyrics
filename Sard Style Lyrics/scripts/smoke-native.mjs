import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const app=spawn(resolve(process.env.KINETIC_TEST_EXE||'src-tauri/target/debug/kinetic-live.exe'),[],{windowsHide:true,env:{...process.env,WEBVIEW2_USER_DATA_FOLDER:resolve('../../work/native-automatic-profile'),WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=9223'},stdio:'ignore'});
let browser;
try{
 let ready=false;for(let i=0;i<150;i++){try{if((await fetch('http://127.0.0.1:9223/json/version')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}assert(ready,'Native WebView2 startup');
 browser=await chromium.connectOverCDP('http://127.0.0.1:9223');const page=browser.contexts()[0].pages()[0];
 await page.getByText(`AUTOMATIC / v${version}`,{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:/demo|find a song|start listening/i}).count(),0);
 // No start_capture call here: the application's launch must start real capture itself.
 await page.waitForTimeout(1500);
 const audio=await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('audio_snapshot'));
 assert(audio.available,`Automatic WASAPI startup failed: ${audio.error}`);
 await page.mouse.move(100,50);await page.getByRole('button',{name:'Toggle fullscreen'}).click();
 await page.waitForFunction(async()=>window.__TAURI_INTERNALS__.invoke('plugin:window|is_fullscreen',{label:'main'}),{},{timeout:5000});
 await page.getByRole('button',{name:'Toggle fullscreen'}).click();
 await page.waitForFunction(async()=>!(await window.__TAURI_INTERNALS__.invoke('plugin:window|is_fullscreen',{label:'main'})),{},{timeout:5000});
 let media=null,mediaError=null;try{media=await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('media_snapshot'));}catch(error){mediaError=String(error);}
 const report={nativeLaunch:true,version,automaticCapture:true,noDemo:true,fullscreen:true,audio,media,mediaError};
 await writeFile('native-smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{try{if(browser)await browser.close();}finally{app.kill();}}
