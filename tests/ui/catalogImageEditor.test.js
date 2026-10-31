import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import CatalogImageEditor from '../../src/components/images/CatalogImageEditor.vue'
const jpg='data:image/jpeg;base64,/9j/2Q=='
it('keeps a removed image as a draft until the form explicitly saves',async()=>{
 const save=vi.fn().mockRejectedValue(new Error('offline'))
 const service={watch:vi.fn((_kind,_id,value)=>{value({dataURL:jpg,revision:2});return vi.fn()}),save}
 const wrapper=mount(CatalogImageEditor,{props:{kind:'menus',entityId:'MENU',modelValue:jpg},global:{provide:{'catalog-images':service}}})
 await wrapper.get('[data-remove-image]').trigger('click')
 expect(save).not.toHaveBeenCalled();expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([''])
 await expect(wrapper.vm.save('MENU')).rejects.toThrow('offline')
 expect(save).toHaveBeenCalledWith('menus','MENU','',2)
 save.mockResolvedValue({dataURL:'',revision:3})
 await wrapper.vm.save('MENU');expect(save).toHaveBeenCalledTimes(2)
 wrapper.unmount()
})
it('does not silently overwrite a dirty draft when another user changes the picture',async()=>{
 let receive;const service={watch:(_k,_id,cb)=>{receive=cb;cb({dataURL:jpg,revision:1});return vi.fn()},save:vi.fn().mockResolvedValue({dataURL:'',revision:3})}
 const wrapper=mount(CatalogImageEditor,{props:{kind:'materials',entityId:'M',modelValue:jpg},global:{provide:{'catalog-images':service}}})
 await wrapper.get('[data-remove-image]').trigger('click');receive({dataURL:jpg,revision:2});await flushPromises()
 await wrapper.vm.save('M');expect(service.save).toHaveBeenCalledWith('materials','M','',1)
 wrapper.unmount()
})
