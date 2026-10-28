// @vitest-environment node
import {expect,it} from 'vitest'
import {specializeShopRules} from '../../scripts/specialize-shop-rules.mjs'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {compactRules} from '../../scripts/compact-rules.mjs'

it.each([undefined,null,'','../other','two shops'])('rejects an invalid fixed shop: %s',shop=>{
 expect(()=>specializeShopRules('function helper(s) {return s;}',shop)).toThrow('Invalid shop')
})

it('eliminates a proven shop argument through callers and static document paths',()=>{
 const source=`function path(s,id) { return /databases/$(database)/documents/shops/$(s)/s/$(id); }
 function check(s,id) { return exists(path(s,id)) && s=='greek-yogg'; }
 match /shops/greek-yogg/{id} { allow read: if check('greek-yogg',id); }`
 expect(specializeShopRules(source,'greek-yogg')).toBe(`function path(id) { return /databases/$(database)/documents/shops/greek-yogg/s/$(id); }
 function check(id) { return exists(path(id)) && 'greek-yogg'=='greek-yogg'; }
 match /shops/greek-yogg/{id} { allow read: if check(id); }`)
})

it('specializes the generated policy despite unrelated local bindings sharing helper names',()=>{
 const source=buildCorePolicy({compact:false})
 const specialized=specializeShopRules(source,'greek-yogg')
 expect(specialized).toContain('function rootPath()')
 expect(specialized).toContain('/documents/shops/greek-yogg')
 expect(specialized.length).toBeLessThan(source.length-1000)
 expect(specializeShopRules(specialized,'greek-yogg')).toBe(specialized)
})

it('keeps literal text, members, map keys, unrelated locals and static paths exact',()=>{
 const source=`function sample(s,item) { let x=item.s; return [s,item.s,'s',"s",{'s':x},/databases/$(database)/documents/s/$(s),/s/static,s/2]; }
 function other(s) { return s; }
 match /shops/fixed { allow read: if sample('greek-yogg',request.resource.data)==other('elsewhere'); }`
 expect(specializeShopRules(source,'greek-yogg')).toBe(`function sample(item) { let x=item.s; return ['greek-yogg',item.s,'s',"s",{'s':x},/databases/$(database)/documents/s/greek-yogg,/s/static,'greek-yogg'/2]; }
 function other(s) { return s; }
 match /shops/fixed { allow read: if sample(request.resource.data)==other('elsewhere'); }`)
})

it('rejects ambiguous callers to a fixed point while retaining an independent safe branch',()=>{
 const source=`function leaf(s) { return s=='greek-yogg'; }
 function middle(s) { return leaf(s); }
 function outer(s) { return middle(s); }
 function safe(s) { return s=='greek-yogg'; }
 match /shops/{id} { allow read: if outer(id) && safe('greek-yogg'); }`
 expect(specializeShopRules(source,'greek-yogg')).toBe(source.replace('function safe(s)','function safe()').replace("function safe() { return s==", "function safe() { return 'greek-yogg'==").replace("safe('greek-yogg')",'safe()'))
})

it.each([
 `function leaf(s) { return s; } match /x {allow read: if leaf('greek-yogg')==leaf('elsewhere');}`,
 `function leaf(s) { return s; } function unknown(x,s) {return leaf(s);} match /x {allow read: if unknown('greek-yogg',request.auth.uid);}`,
 `function leaf(s) { let s='elsewhere'; return s; } match /x {allow read: if leaf('greek-yogg');}`,
 `function leaf(s) { return s; } function caller(s) { let leaf=request.resource.data; return leaf(s); } match /x {allow read: if caller(request.auth.uid);}`,
 `function leaf(s) { return s; } function leaf(s) { return false; } match /x {allow read: if leaf('greek-yogg');}`,
 `function outer(s) { function nested(s) {return s;} return nested(s); } match /x {allow read: if outer('greek-yogg');}`,
 `function leaf(s) { return s; } match /x {allow read: if leaf('greek-yogg',false);}`,
 `function leaf(s) { return s; } match /x {allow read: if leaf('greek-yogg');} /* unfinished`,
])('preserves unsupported or uncertain source: %s',source=>{
 expect(specializeShopRules(source,'greek-yogg')).toBe(source)
})

it('preserves comments and handles nested call arguments and path interpolation expressions',()=>{
 const source=`function same(s,a,b) { return [s,a,b,/databases/$(database)/documents/shops/$(s + a.s)]; }
 match /x {allow read: if same(/* s */ 'greek-yogg', ['s',nested(1,2)], {'s':[3,4]});}`
 expect(specializeShopRules(source,'greek-yogg')).toBe(`function same(a,b) { return ['greek-yogg',a,b,/databases/$(database)/documents/shops/$('greek-yogg' + a.s)]; }
 match /x {allow read: if same(/* s */  ['s',nested(1,2)], {'s':[3,4]});}`)
})

// An inverse check uses the known generated policy's original signatures. It
// restores omitted arguments rather than repeating the eligibility algorithm.
it('round-trips every generated predicate, path and allow expression after restoring shop arguments',()=>{
 const before=buildCorePolicy({compact:false}),after=specializeShopRules(before,'greek-yogg')
 const lexical=/\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g
 function declarations(source){
  const mask=source.replace(lexical,text=>' '.repeat(text.length)),result=new Map()
  for(const match of mask.matchAll(/function\s+(\w+)\s*\(([^)]*)\)\s*\{/g)){
   const start=match.index+match[0].length
   let end=start,depth=1
   while(depth){if(mask[end]==='{')depth++;if(mask[end]==='}')depth--;end++}
   result.set(match[1],{start:match.index,end,params:match[2].split(',').filter(Boolean).map(p=>p.trim()),body:source.slice(start,end-1)})
  }
  return result
 }
 const originals=declarations(before),specialized=declarations(after)
 const names=[...originals].filter(([,fn])=>fn.params[0]==='s').map(([name])=>name)
 const call=new RegExp('(?<![\\w.])('+names.join('|')+')\\(\\s*','g')
 function restoreCalls(code,argument){return code.replace(call,(text,name,index)=>`${name}(${argument}${code[index+text.length]===')'?'':','}`)}
 function restoreBody(text,hasShop){
  return text.split(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/g).map((part,index)=>{
   if(index%2)return hasShop&&part==="'greek-yogg'"?'s':part
   return restoreCalls(hasShop?part.replaceAll('/shops/greek-yogg','/shops/$(s)'):part,hasShop?'s':"'greek-yogg'")
  }).join('')
 }
 function canonical(text){return text.split(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/g).map((part,index)=>index%2?part.startsWith('/')?'':part:part.replace(/\s/g,'')).join('')}
 expect([...specialized.keys()]).toEqual([...originals.keys()])
 for(const [name,original] of originals){
  const next=specialized.get(name),hasShop=names.includes(name)
  expect(next.params,`${name} parameter order`).toEqual(hasShop?original.params.slice(1):original.params)
  expect(canonical(restoreBody(next.body,hasShop)),`${name} predicates`).toBe(canonical(original.body))
 }
 function surface(source,functions){for(const [name,fn] of [...functions].reverse())source=source.slice(0,fn.start)+`function ${name};`+source.slice(fn.end);return source}
 expect(canonical(restoreBody(surface(after,specialized),false))).toBe(canonical(surface(before,originals)))
})

it('specializes only the compact release and preserves the readable generator interface',()=>{
 const readable=buildCorePolicy({shopId:'other-shop',compact:false})
 expect(readable.includes('function rootPath(s)')).toBe(true)
 const release=buildCorePolicy({shopId:'other-shop'})
 expect(release).toContain('/documents/shops/other-shop')
 expect(release).not.toContain('function rootPath(s)')
 // The release also factors dispatch; its byte representation need not equal
 // the readable surface after shop specialization alone. Predicate preservation
 // is checked by the inverse test above and dispatch's own proof tests.
 expect(release.length).toBeLessThan(compactRules(specializeShopRules(readable,'other-shop')).length)
})
