// A request's authenticated UID is immutable throughout Rules evaluation.
// Share its repeated field path without changing any authorization predicate.
export function factorRequestUid(source){
 const expression='request.auth.uid'
 const replaced=source.split(expression).join('requestUid()')
 return replaced.replace('match /databases/{database}/documents {','match /databases/{database}/documents {\nfunction requestUid() { return request.auth.uid; }')
}
