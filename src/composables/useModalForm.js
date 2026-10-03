import { ref } from 'vue'
import { usePosStore } from '@/stores/posStore'

/**
 * Composable for standardized modal form management:
 * - Detects unsaved changes via snapshot comparison
 * - Intercepts backdrop clicks, X button, and Cancel button to prevent accidental data loss
 * - Standardizes save confirmation dialogs
 */
export function useModalForm(getCurrentState) {
  const store = usePosStore()
  const initialSnapshot = ref('')

  function saveSnapshot(customState = null) {
    const target = customState !== null ? customState : (typeof getCurrentState === 'function' ? getCurrentState() : null)
    try {
      initialSnapshot.value = JSON.stringify(target || {})
    } catch {
      initialSnapshot.value = ''
    }
  }

  function isDirty(customState = null) {
    if (!initialSnapshot.value) return false
    const target = customState !== null ? customState : (typeof getCurrentState === 'function' ? getCurrentState() : null)
    try {
      return JSON.stringify(target || {}) !== initialSnapshot.value
    } catch {
      return false
    }
  }

  async function requestClose(closeFn, options = {}) {
    const dirty = isDirty(options.currentState)
    if (!dirty) {
      if (typeof closeFn === 'function') closeFn()
      return true
    }

    const title = options.title || 'มีการแก้ไขที่ยังไม่ได้บันทึก'
    const message = options.message || 'คุณมีข้อมูลที่แก้ไขค้างอยู่ หากปิดตอนนี้ข้อมูลที่กรอกไว้จะไม่ถูกบันทึก\n\nต้องการปิดหน้าต่างและยกเลิกการแก้ไขหรือไม่?'
    const confirmText = options.confirmText || 'ปิดโดยไม่บันทึก'
    const cancelText = options.cancelText || 'กลับไปแก้ไขต่อ'

    const discard = await store.confirmDialog({
      title,
      message,
      confirmText,
      cancelText,
      type: 'danger'
    })

    if (discard) {
      initialSnapshot.value = ''
      if (typeof closeFn === 'function') closeFn()
      return true
    }

    return false
  }

  async function confirmSave(itemName = '', customMessage = null) {
    const message = customMessage || (itemName
      ? `คุณต้องการบันทึกข้อมูล "${itemName}" ลงในระบบหรือไม่?`
      : 'คุณต้องการบันทึกข้อมูลนี้ลงในระบบหรือไม่?')

    return await store.confirmDialog({
      title: 'ยืนยันการบันทึกข้อมูล',
      message,
      confirmText: 'ยืนยันบันทึก',
      cancelText: 'ตรวจสอบอีกครั้ง',
      type: 'save'
    })
  }

  return {
    initialSnapshot,
    saveSnapshot,
    isDirty,
    requestClose,
    confirmSave
  }
}
