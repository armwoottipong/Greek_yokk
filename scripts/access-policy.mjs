// Access is checked against the current root, so revocation also fences writes
// prepared before the email was removed. No extra access-control document exists.
export function accessPolicy(shopId){return `
 function allowedIdentity(root) {
  return request.auth.token.email_verified && request.auth.token.firebase.sign_in_provider=='google.com' && root.allowedEmails[request.auth.token.email.lower()]==true;
 }
 function signedIn() {
  return allowedIdentity(get(/databases/$(database)/documents/shops/${shopId}).data);
 }
 function signedInAfter() {
  return allowedIdentity(getAfter(/databases/$(database)/documents/shops/${shopId}).data);
 }
 function accessRoot() {
  let n=request.resource.data;
  let emails=n.allowedEmails;
  let keys=emails.keys().join('|');
  return signedIn() && emails is map && emails.size()>0 && emails.size()<=50 && emails.values().hasOnly([true]) &&
   keys==keys.lower() && keys.matches('^[^ |@]+@[^ |@]+([|][^ |@]+@[^ |@]+)*$') &&
   emails.get(request.auth.token.email.lower(),false)==true &&
   n.diff(resource.data).affectedKeys().hasOnly(['allowedEmails','revision','lastOpId','lastOpKind']) &&
   n.revision==resource.data.revision+1 && n.revision is int && n.revision<=9007199254740991 &&
   n.lastOpKind=='access' && n.lastOpId is string && n.lastOpId.matches('^[A-Za-z0-9_-]{1,200}$');
 }
 function presenceWrite(uid) {
  let p=request.resource.data;
  return signedIn() && uid==request.auth.uid && p.keys().hasAll(['email','displayName','photoURL','lastSeen']) &&
   p.keys().hasOnly(['email','displayName','photoURL','lastSeen']) && p.email==request.auth.token.email.lower() &&
   p.displayName is string && p.displayName.size()<=120 && p.photoURL is string && p.photoURL.size()<=1000 &&
   (p.photoURL=='' || p.photoURL.matches('^https://[A-Za-z0-9.-]+[.]googleusercontent[.]com/.*$')) && p.lastSeen==request.time;
 }
`}
