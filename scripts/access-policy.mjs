// Access is checked against the current root, so revocation also fences writes
// prepared before the email was removed. Admin writes maintain equal keys in
// allowedEmails/userRoles; revocation removes both atomically. userRoles is the
// canonical write grant, avoiding a redundant second membership check per row.
export function accessPolicy(shopId){return `
 function allowedIdentity(root) {
  let token=request.auth.token;
  return token.email_verified && token.firebase.sign_in_provider=='google.com' && root.allowedEmails[token.email.lower()]==true;
 }
 function accountRole(root) {
  return root.userRoles[request.auth.token.email.lower()];
 }
 function operatorIdentity(root) {
  let token=request.auth.token;
  let email=token.email.lower();
  let role=root.userRoles[email];
  return token.email_verified && token.firebase.sign_in_provider=='google.com' && role.matches('^(admin|manager)$');
 }
 function adminIdentity(root) {
  return allowedIdentity(root) && accountRole(root)=='admin';
 }
 function signedIn() {
  return allowedIdentity(get(/databases/$(database)/documents/shops/${shopId}).data);
 }
 function signedInAfter() {
  let root=getAfter(/databases/$(database)/documents/shops/${shopId}).data;
  let token=request.auth.token;
  let email=token.email.lower();
  let role=root.userRoles[email];
  return token.email_verified && token.firebase.sign_in_provider=='google.com' && role.matches('^(admin|manager)$');
 }
 function adminAfter() {
  return adminIdentity(getAfter(/databases/$(database)/documents/shops/${shopId}).data);
 }
 function accessRoot() {
  let n=request.resource.data;
  let emails=n.allowedEmails;
  let keys=emails.keys().join('|');
  let roles=n.userRoles;
  return adminIdentity(resource.data) && emails is map && emails.size()>0 && emails.size()<=50 && emails.values().hasOnly([true]) &&
   keys==keys.lower() && keys.matches('^[^ |@]+@[^ |@]+([|][^ |@]+@[^ |@]+)*$') &&
   roles is map && roles.keys().toSet()==emails.keys().toSet() && roles.values().hasOnly(['viewer','manager','admin']) &&
   roles.get('armwoottipong@gmail.com','')=='admin' && roles.get(request.auth.token.email.lower(),'')=='admin' &&
   n.diff(resource.data).affectedKeys().hasOnly(['allowedEmails','userRoles','revision','lastOpId','lastOpKind']) &&
   n.revision==resource.data.revision+1 && n.revision is int && n.revision<=9007199254740991 &&
   n.lastOpKind=='access' && n.lastOpId is string && n.lastOpId.matches('^[A-Za-z0-9_-]{1,200}$');
 }
 function invitationWrite() {
  let n=request.resource.data;
  let root=getAfter(/databases/$(database)/documents/shops/${shopId}).data;
  return adminIdentity(root) && n.keys().hasOnly(['email','role','createdBy','createdAt','status']) &&
   n.email is string && n.email.size()<=254 && root.allowedEmails.get(n.email,false)==true &&
   root.userRoles.get(n.email,'')==n.role && n.createdBy==request.auth.uid && n.createdAt==request.time && n.status=='pending';
 }
 function presenceWrite(uid) {
  let p=request.resource.data;
  return signedIn() && uid==request.auth.uid && p.keys().hasAll(['email','displayName','photoURL','lastSeen']) &&
   p.keys().hasOnly(['email','displayName','photoURL','lastSeen']) && p.email==request.auth.token.email.lower() &&
   p.displayName is string && p.displayName.size()<=120 && p.photoURL is string && p.photoURL.size()<=1000 &&
   (p.photoURL=='' || p.photoURL.matches('^https://[A-Za-z0-9.-]+[.]googleusercontent[.]com/.*$')) && p.lastSeen==request.time;
 }
`}
