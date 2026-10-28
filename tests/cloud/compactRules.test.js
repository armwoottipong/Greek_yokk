import {it,expect} from 'vitest'
import {compactRules} from '../../scripts/compact-rules.mjs'
it('renames lexical bindings and calls while preserving strings, fields and static path segments',()=>{
 const source=`function helper(material) { let quantity=material.quantity; return quantity; }
 function total(root) { let material=get(/databases/$(database)/documents/root/$(root + helper(root))); return helper(material)+material.root; }
 // A comment ending with a period.
 function valid(input) { return helper(input)>0 && input.helper=="helper(input)"; }`
 const text=compactRules(source)
 expect(text).toContain('function _a(a) { let b=a.quantity; return b; }')
 expect(text).toContain('get(/databases/$(database)/documents/root/$(a + _a(a)))')
 expect(text).toContain('return _a(b)+b.root')
 expect(text).toContain('return _a(a)>0 && a.helper=="helper(input)"')
})
it('keeps strings, division and independent scopes intact',()=>{
 const text=compactRules(`function helper(longName) { let other=longName/2; return other; } function check(longName) { return helper(longName) == 'longName'; }`)
 expect(text).toContain('let b=a/2; return b;')
 expect(text).toContain("return _a(a) == 'longName'")
})
it('gives the most frequently called functions short names and avoids lexical collisions',()=>{
 const source=Array.from({length:100},(_,i)=>`function helper${i}(input) {return input;}`).join('\n')+`\nfunction hot(input) {let _a=input;return _a;} function caller(input){return ${Array(30).fill('hot(input)').join('+')};}`
 const text=compactRules(source)
 expect(text).toContain('return '+Array(30).fill('_b(a)').join('+'))
 expect(text).toContain('function _b(')
 expect(text).not.toContain('function _a(')
 expect(text).toContain('let b=a;')
})
it('shortens the outer database binding while preserving static paths, fields and strings',()=>{
 const text=compactRules(`service cloud.firestore { match /databases/{database}/documents { function valid(input){return get(/databases/$(database)/documents/database/$(input)).data.database == 'database';} match /x/{id} {allow read: if valid(id);} } }`)
 expect(text).toContain('match /databases/{d0}/documents')
 expect(text).toContain('get(/databases/$(d0)/documents/database/$(a)).data.database')
 expect(text).toContain("== 'database'")
})
it('does not rename a shadowed outer database binding',()=>{
 const text=compactRules(`match /databases/{database}/documents {function valid(database){return database;} match /x/{id}{allow read:if valid(id);}}`)
 expect(text).toContain('match /databases/{database}/documents')
})
it('preserves nested static match paths when renaming the database binding',()=>{
 const text=compactRules(`match /databases/{database}/documents {function valid(){return exists(/databases/$(database)/documents/database/x);} match /database/{id}{allow read:if valid();}}`)
 expect(text).toContain('match /database/{id}')
 expect(text).toContain('exists(/databases/$(d0)/documents/database/x)')
})
it('does not rename an outer database binding shadowed by a recursive wildcard',()=>{
 const text=compactRules(`match /databases/{database}/documents {match /x/{database=**} {allow read: if database == 'hello';}}`)
 expect(text).toContain('match /databases/{database}/documents')
 expect(text).toContain("if database == 'hello'")
})
