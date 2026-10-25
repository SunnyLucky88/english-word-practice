// Shared by the build and the browser. Keep contractions and personal names intact.
function wordFollowTokens(text){
 const names=['John Baker','Wu Binbin','Chen Jie','Sarah Miller','Mike Black','Miss White'];
 const pattern=new RegExp(names.join('|')+"|[ap]\\.m\\.|\\d+(?:,\\d{3})*(?:st|nd|rd|th)?|[A-Za-z]+(?:['’‘-][A-Za-z]+)*",'gi');
 return [...String(text).matchAll(pattern)].map(m=>({text:m[0],start:m.index,end:m.index+m[0].length,key:m[0].replace(/[’‘]/g,"'").toLowerCase()}));
}
if(typeof module!=='undefined')module.exports=wordFollowTokens;
