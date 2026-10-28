// Partial evaluation only: keep every predicate, specializing the first `s`
// formal only when every call supplies the fixed shop or another proven formal.
// Unsupported lexical structure leaves the source unchanged.
export function specializeShopRules(source,shopId){
 if(typeof shopId!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(shopId))throw new Error('Invalid shop')
 const tokens=[]
 let position=0,valid=true
 const add=(start,end,type='punct')=>tokens.push({start,end,type,value:source.slice(start,end)})
 function scan(untilClose=false){
  let depth=0
  while(position<source.length){
   const start=position,ch=source[position]
   if(/\s/.test(ch)){position++;continue}
   if(source.startsWith('//',position)){while(position<source.length&&source[position]!='\n')position++;continue}
   if(source.startsWith('/*',position)){
    const end=source.indexOf('*/',position+2)
    if(end<0){valid=false;return}
    position=end+2;continue
   }
   if(ch==="'"||ch==='"'){
    position++;let closed=false
    while(position<source.length){const next=source[position++];if(next==='\\')position++;else if(next===ch){closed=true;break}}
    if(!closed){valid=false;return}
    add(start,position,'string');continue
   }
   if(ch==='`'){valid=false;return}
   const previous=tokens.at(-1)?.value
   if(ch==='/'&&(source.startsWith('/databases/',position)||previous==='match'||(['return','(', '[','=',':','?',','].includes(previous)&&/[A-Za-z_]/.test(source[position+1]||'')))){
    while(position<source.length){
     if(source.startsWith('$(',position)){
      add(position,position+2,'interpolation');position+=2;scan(true)
      if(!valid)return
     }else if(/[A-Za-z0-9_/*{}.=-]/.test(source[position])){
      const pathStart=position
      while(position<source.length&&/[A-Za-z0-9_/*{}.=-]/.test(source[position]))position++
      add(pathStart,position,'path')
     }else break
    }
    continue
   }
   if(/[A-Za-z_]/.test(ch)){
    while(position<source.length&&/[A-Za-z0-9_]/.test(source[position]))position++
    add(start,position,'identifier');continue
   }
   position++;add(start,position)
   if(ch==='(')depth++
   if(ch===')'){
    if(untilClose&&depth===0)return
    depth--
   }
  }
  if(untilClose)valid=false
 }
 scan()
 if(!valid)return source
 const pairs=new Map(),stack=[]
 for(let i=0;i<tokens.length;i++){
  const value=tokens[i].value
  if(tokens[i].type==='path'||tokens[i].type==='string')continue
  if(['(','[','{','$('].includes(value))stack.push(i)
  else if([')',']','}'].includes(value)){
   const open=stack.pop(),expected={')':['(','$('],']':['['],'}':['{']}[value]
   if(open===undefined||!expected.includes(tokens[open].value))return source
   pairs.set(open,i)
  }
 }
 if(stack.length)return source
 const functions=new Map(),declarations=new Set()
 for(let i=0;i<tokens.length;i++)if(tokens[i].value==='function'){
  const name=tokens[i+1],open=i+2,close=pairs.get(open),body=close+1,end=pairs.get(body)
  if(name?.type!=='identifier'||tokens[open]?.value!=='('||tokens[body]?.value!=='{'||end===undefined||functions.has(name.value))return source
  const params=tokens.slice(open+1,close)
  if(params.some((p,j)=>j%2===0?p.type!=='identifier':p.value!==',')||params.length%2===0&&params.length>0)return source
  functions.set(name.value,{name:name.value,open,close,body,end,params:params.filter((p,j)=>j%2===0),calls:[]})
  declarations.add(i+1)
  for(let j=open+1;j<close;j+=2)declarations.add(j)
 }
 const list=[...functions.values()]
 if(list.some(fn=>list.some(other=>other!==fn&&other.body>fn.body&&other.end<fn.end)))return source
 for(const fn of list)fn.bindings=new Set([...fn.params.map(p=>p.value),...tokens.slice(fn.body+1,fn.end).flatMap((t,i,body)=>t.value==='let'?[body[i+1]?.value]:[])])
 const candidates=new Set(list.filter(fn=>fn.params[0]?.value==='s'&&!tokens.slice(fn.body+1,fn.end).some((t,i,body)=>t.value==='function'||t.value==='let'&&body[i+1]?.value==='s'||t.value==='s'&&body[i+1]?.value===':')).map(fn=>fn.name))
 for(let i=0;i<tokens.length;i++){
  const token=tokens[i],fn=functions.get(token.value)
  if(!fn||token.type!=='identifier'||declarations.has(i)||tokens[i-1]?.value==='.')continue
  const owner=list.find(parent=>i>parent.body&&i<parent.end)
  if(tokens[i+1]?.value!=='('){if(!owner?.bindings.has(fn.name))candidates.delete(fn.name);continue}
  const close=pairs.get(i+1),args=[],commas=[]
  if(close===undefined)return source
  let start=i+2
  for(let j=start;j<close;j++){
   if(pairs.has(j)){j=pairs.get(j);continue}
   if(tokens[j].value===','){args.push([start,j]);commas.push(j);start=j+1}
  }
  if(start<close)args.push([start,close])
  // A same-named local makes this call's resolution uncertain. Preserve the
  // helper and every call rather than interpreting the local as a function.
  if(owner?.bindings.has(fn.name))candidates.delete(fn.name)
  fn.calls.push({args,commas,owner,close})
 }
 let changed=true
 while(changed){
  changed=false
  for(const name of candidates){
   const fn=functions.get(name)
   const proven=fn.calls.length>0&&fn.calls.every(call=>{
    if(call.args.length!==fn.params.length)return false
    const [start,end]=call.args[0],arg=tokens[start]
    return end===start+1&&(arg.type==='string'&&(arg.value===`'${shopId}'`||arg.value===`"${shopId}"`)||arg.value==='s'&&candidates.has(call.owner?.name))
   })
   if(!proven){candidates.delete(name);changed=true}
  }
 }
 const edits=[]
 for(const name of candidates){
  const fn=functions.get(name),first=fn.params[0]
  edits.push({start:first.start,end:tokens[fn.open+(fn.params.length>1?2:1)].end,text:''})
  for(const call of fn.calls){
   const [start,end]=call.args[0]
   edits.push({start:tokens[start].start,end:call.commas.length?tokens[call.commas[0]].end:tokens[end-1].end,text:''})
  }
 }
 for(const name of candidates){
  const fn=functions.get(name)
  for(let i=fn.body+1;i<fn.end;i++){
   const token=tokens[i]
   if(token.type!=='identifier'||token.value!=='s'||tokens[i-1]?.value==='.'||edits.some(edit=>token.start>=edit.start&&token.end<=edit.end))continue
   const directPath=tokens[i-1]?.type==='interpolation'&&tokens[i+1]?.value===')'
   edits.push({start:directPath?tokens[i-1].start:token.start,end:directPath?tokens[i+1].end:token.end,text:directPath?shopId:`'${shopId}'`})
  }
 }
 edits.sort((a,b)=>a.start-b.start)
 if(edits.some((edit,i)=>i>0&&edit.start<edits[i-1].end))return source
 let result=source
 for(const edit of edits.reverse())result=result.slice(0,edit.start)+edit.text+result.slice(edit.end)
 return result
}
