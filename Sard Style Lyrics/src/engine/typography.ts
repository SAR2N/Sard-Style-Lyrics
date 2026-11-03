import type {LyricLine} from '../types';

export function wordLetterCount(text:string){return Array.from(text.normalize('NFC').replace(/[^\p{L}\p{N}]/gu,'')).length;}
export function isEnlargedWord(text:string){const length=wordLetterCount(text);return length>=2&&length<=3;}
function hashText(text:string){let hash=2166136261;for(const character of text){hash^=character.codePointAt(0)!;hash=Math.imul(hash,16777619);}return hash>>>0;}
/** Decorative choices belong to the phrase, never to the moving playback cursor. */
export function lineDecorations(line:LyricLine){
 const counts=line.words.map(word=>wordLetterCount(word.text));
 const readable=counts.map((length,index)=>({length,index})).filter(word=>word.length>=2);
 const eligible=readable.length?readable:counts.map((length,index)=>({length,index})).filter(word=>word.length>0);
 const seed=hashText(line.start.toFixed(3)+'|'+line.text.normalize('NFC'));
 const colorPick=(seed>>>16)%10;
 const highlightColor=colorPick<7?'#ffe000':colorPick<9?'#b5ff3b':'#ff5757';
 const highlightIndex=eligible.length?eligible[seed%eligible.length].index:-1;
 const others=eligible.filter(word=>word.index!==highlightIndex);
 const underlineIndex=others.length&&((seed>>>8)%5===0)?others[(seed>>>16)%others.length].index:-1;
 const outlineCandidates=eligible.filter(word=>word.length>=4&&word.index!==highlightIndex&&word.index!==underlineIndex);
 const outlineIndex=outlineCandidates.length&&(seed>>>12)%3===0?outlineCandidates[(seed>>>20)%outlineCandidates.length].index:-1;
 const firstShort=counts.findIndex(length=>length>=2&&length<=3);
 const largeParity=firstShort>=0?firstShort%2:seed%2;
 const enlarged=counts.map((length,i)=>length>=2&&length<=3&&i%2===largeParity);
 const scales:number[]=[],bold:boolean[]=[],italic:boolean[]=[];
 line.words.forEach((word,i)=>{
  const wordSeed=hashText(seed+'|'+i+'|'+word.text.normalize('NFC'));
  const large=i%2===largeParity;
  const choices=counts[i]===1?(large?[1]:[.72,.78]):large?(enlarged[i]?[1.8,1.95]:[1.25,1.35]):[.72,.78];
  scales.push(choices[wordSeed%choices.length]);
  const strong=counts[i]>=2&&i!==highlightIndex&&wordSeed%4===0;
  bold.push(strong);
  italic.push(counts[i]>=2&&i!==highlightIndex&&!strong&&(wordSeed>>>8)%5===0);
 });
 return {highlightColor,highlightIndex,underlineIndex,outlineIndex,enlarged,scales,bold,italic};
}
