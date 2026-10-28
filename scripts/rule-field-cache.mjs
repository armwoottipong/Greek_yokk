// Cache guaranteed request/catalog object fields inside their existing function.
// No predicate is removed or reordered; functions already at ten locals stay as-is.
const expressions=['request.auth.uid','root.catalog','before.catalog','next.catalog','b.catalog','n.catalog','c.menus','c.addons','c.groups','c.platforms','request.resource.data','resource.data.generation','resource.data','o.materialIds','row.needed','before.inventoryType','row.take']
const mask=source=>source.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g,s=>' '.repeat(s.length))
export function factorRuleFields(source){
 const lexical=mask(source),edits=[]
 for(const match of lexical.matchAll(/function\s+(\w+)\s*\([^)]*\)\s*\{/g)){
  const start=match.index+match[0].length;let end=start,depth=1
  while(depth&&end<lexical.length){if(lexical[end]==='{')depth++;if(lexical[end]==='}')depth--;end++}
  const body=source.slice(start,end-1),clean=lexical.slice(start,end-1),at=clean.search(/\breturn\s/)
  if(at<0)continue
  let free=10-(clean.match(/\blet\s+\w+\s*=/g)||[]).length,predicate=body.slice(at),bindings=[]
  for(let i=0;i<expressions.length&&free>0;i++){
   const expression=expressions[i]
   if(expression.startsWith('resource.data')&&!match[1].endsWith('Root'))continue
   if(['row.needed','before.inventoryType','row.take'].includes(expression)&&match[1]!=='validMaterial')continue
   if(expression==='o.materialIds'&&!(/(Root|Operation)$/.test(match[1])||match[1]==='validOrder'))continue
   const name=`cachedField${i}`
   if(new RegExp(`\\b${name}\\b`).test(clean))continue
   const pattern=new RegExp('(?<![\\w.])'+expression.replaceAll('.','\\.')+'(?![\\w])','g'),positions=[...mask(predicate).matchAll(pattern)].map(m=>m.index)
   if(positions.length<(['before.inventoryType','row.take'].includes(expression)?2:3))continue
   for(const position of positions.reverse())predicate=predicate.slice(0,position)+name+predicate.slice(position+expression.length)
   bindings.push(`let ${name}=${expression};`);free--
  }
  if(bindings.length)edits.push({start:start+at,end:end-1,text:bindings.join('\n')+'\n'+predicate})
 }
 for(const edit of edits.reverse())source=source.slice(0,edit.start)+edit.text+source.slice(edit.end)
 return source
}
