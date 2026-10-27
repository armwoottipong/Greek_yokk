import {it,expect} from 'vitest'
import {compactRules} from '../../scripts/compact-rules.mjs'
it('renames lexical bindings and calls while preserving strings, fields and static path segments',()=>{
 const source=`function helper(material) { let quantity=material.quantity; return quantity; }
 function total(root) { let material=get(/databases/$(database)/documents/root/$(root + helper(root))); return helper(material)+material.root; }
 // A comment ending with a period.
 function valid(input) { return helper(input)>0 && input.helper=="helper(input)"; }`
 const text=compactRules(source)
 expect(text).toContain('function f0(a) { let b=a.quantity; return b; }')
 expect(text).toContain('get(/databases/$(database)/documents/root/$(a + f0(a)))')
 expect(text).toContain('return f0(b)+b.root')
 expect(text).toContain('return f0(a)>0 && a.helper=="helper(input)"')
})
it('keeps strings, division and independent scopes intact',()=>{
 const text=compactRules(`function helper(longName) { let other=longName/2; return other; } function check(longName) { return helper(longName) == 'longName'; }`)
 expect(text).toContain('let b=a/2; return b;')
 expect(text).toContain("return f0(a) == 'longName'")
})
