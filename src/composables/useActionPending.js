import {ref} from 'vue'

// Set synchronously before the first await, so two same-tick clicks share a lock.
export function useActionPending(){
 const pending=ref('')
 async function run(name,action){
  if(pending.value)return
  pending.value=name
  try{return await action()}finally{pending.value=''}
 }
 return {pending,run}
}
