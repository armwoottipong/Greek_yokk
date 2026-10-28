// Factor repeated dispatch discriminants, never validation predicates. Each
// action's alternatives retain their original order and short-circuit semantics.
export function factorRuleDispatch(body,scopeIndex){
 const groups=new Map()
 for(const m of body.matchAll(/allow (\w+): if ([\s\S]*?);/g)){if(!groups.has(m[1]))groups.set(m[1],[]);groups.get(m[1]).push({start:m.index,end:m.index+m[0].length,expression:m[2]})}
 const edits=[]
 for(const [action,rules] of groups){
  if(rules.length<2)continue
  const field=['lastOpKind','kind'].find(key=>rules.filter(r=>r.expression.includes(`request.resource.data.${key}`)).length>=3)
  const path=field?`request.resource.data.${field}`:null,name=`releaseDispatch${scopeIndex}${action}`
  const expressions=rules.map(r=>path?r.expression.split(path).join('releaseKind'):r.expression)
  // Group index-based proof alternatives too, so their common identity gate is
  // evaluated once for this action rather than once for every proof variant.
  const alternatives=expressions.map(e=>`(${e})`).join(' || ')
  const dispatch=field?`function ${name}() { let releaseKind=request.resource.data.get('${field}',''); return ${alternatives}; }\nallow ${action}: if ${name}();`:`allow ${action}: if ${alternatives};`
  rules.forEach((rule,i)=>edits.push({start:rule.start,end:rule.end,text:i?'':dispatch}))
 }
 for(const edit of edits.sort((a,b)=>b.start-a.start))body=body.slice(0,edit.start)+edit.text+body.slice(edit.end)
 return body
}
