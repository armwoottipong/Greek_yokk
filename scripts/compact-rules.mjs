// Keep reviewed Rules readable; compact only lexical identifiers in the emitted
// artifact. Strings, member names and static path segments must remain exact.
export function compactRules(source){
 const token=/\/\/[^\n]*|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|[A-Za-z_][A-Za-z0-9_]*/g
 function rewrite(text,names){
  const code=text.replace(/\/\/[^\n]*|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g,s=>' '.repeat(s.length))
  let result='',position=0
  for(const match of text.matchAll(token)){
   if(match.index<position)continue
   result+=text.slice(position,match.index)
   const value=match[0]
   if(text.startsWith('/databases/',match.index-1)){
    const start=match.index-1;result=result.slice(0,-1);let i=start
    while(i<text.length){
     if(text.startsWith('$(',i)){
      let end=i+2,depth=1,quote=''
      while(depth&&end<text.length){const ch=text[end];if(quote){if(ch==='\\')end++;else if(ch===quote)quote=''}else if(ch==="'"||ch==='"')quote=ch;else if(ch==='(')depth++;else if(ch===')')depth--;end++}
      result+='$('+rewrite(text.slice(i+2,end-1),names)+')';i=end
     }else if(/[A-Za-z0-9_/*{}.-]/.test(text[i]))result+=text[i++]
     else break
    }
    position=i;continue
   }
   const member=code.slice(0,match.index).trimEnd().endsWith('.')
   result+=!member&&names.has(value)?names.get(value):value;position=match.index+value.length
  }
  return result+text.slice(position)
 }
 const mask=source.replace(/\/\/[^\n]*|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g,s=>' '.repeat(s.length))
 const spans=[]
 for(const match of mask.matchAll(/function\s+(\w+)\s*\(([^)]*)\)\s*\{/g)){
  let end=match.index+match[0].length,depth=1
  while(depth&&end<mask.length){if(mask[end]==='{')depth++;if(mask[end]==='}')depth--;end++}
  spans.push({start:match.index,end,name:match[1],params:match[2],headEnd:match.index+match[0].length})
 }
 const functions=new Map([...new Set(spans.map(s=>s.name))].map((name,i)=>[name,'f'+i]))
 for(const alias of functions.values())if(new RegExp('\\b'+alias+'\\b').test(mask))throw new Error('Compact function collision')
 let result=source
 for(const span of spans.reverse()){
  const body=source.slice(span.headEnd,span.end-1),bodyMask=mask.slice(span.headEnd,span.end-1)
  const bindings=[...new Set([...span.params.split(',').map(p=>p.trim()).filter(Boolean),...Array.from(bodyMask.matchAll(/\blet\s+(\w+)/g),m=>m[1])])]
  const used=new Set(bindings.filter(b=>b.length===1)),letters=[...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter(c=>!used.has(c)),names=new Map()
  for(const binding of bindings)if(binding.length>1){if(!letters.length)throw new Error('Too many compact bindings');names.set(binding,letters.shift())}
  const next='function '+span.name+'('+rewrite(span.params,names)+') {'+rewrite(body,names)+'}'
  result=result.slice(0,span.start)+next+result.slice(span.end)
 }
 return rewrite(result,functions)
}
