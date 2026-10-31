// Resource objects are fixed for the current document evaluation. Share only
// their lookup expressions; preserve every predicate, literal and path segment.
export function factorRequestData(source){
 const lexical=source.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g,s=>' '.repeat(s.length))
 const pattern=/(?<![\w.])(?:request\.resource\.data|resource\.data)(?![\w])/g
 let result=source
 for(const match of [...lexical.matchAll(pattern)].reverse())result=result.slice(0,match.index)+(match[0].startsWith('request.')?'requestData()':'existingData()')+result.slice(match.index+match[0].length)
 return result.replace('match /databases/{database}/documents {','match /databases/{database}/documents {\nfunction requestData() { return request.resource.data; }\nfunction existingData() { return resource.data; }')
}
