import { inject } from 'vue'
import { usePosStore } from '@/stores/posStore'

export function useInventoryStore() {
  return inject('cloud-inventory-model', null) || usePosStore()
}
