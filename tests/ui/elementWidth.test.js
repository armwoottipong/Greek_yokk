import {it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
import {ref,nextTick} from 'vue'
import {useElementWidth} from '../../src/composables/useElementWidth.js'
it('measures and observes a workspace that appears after its server data arrives',async()=>{
 const observe=vi.fn(),disconnect=vi.fn()
 vi.stubGlobal('ResizeObserver',class{observe=observe;disconnect=disconnect})
 const rect=vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({width:900,height:600})
 const w=mount({template:'<div v-if="ready" ref="element"></div>',setup(){const element=ref(null),ready=ref(false),width=useElementWidth(element);return {element,ready,width}}})
 expect(w.vm.width).toBe(0)
 w.vm.ready=true;await nextTick();await nextTick()
 expect(w.vm.width).toBe(900)
 expect(observe).toHaveBeenCalledWith(w.element)
 w.vm.ready=false;await nextTick();await nextTick();expect(w.vm.width).toBe(0)
 w.unmount();expect(disconnect).toHaveBeenCalled();rect.mockRestore();vi.unstubAllGlobals()
})
