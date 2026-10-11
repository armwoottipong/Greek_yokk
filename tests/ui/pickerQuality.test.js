import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import colors from 'tailwindcss/colors'
import theme from '../../tailwind.config.js'
import {createTestStore} from '../helpers/createStore'
import Calendar from '../../src/components/ui/DateRangeCalendar.vue'
import Emoji from '../../src/components/modals/EmojiPickerPopover.vue'
function luminance(hex){const c=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function foreground(el){for(let node=el;node;node=node.parentElement){for(const value of node.classList){const m=value.match(/^text-([a-z]+)-(\d+)$/);if(m)return(theme.theme.extend.colors[m[1]]||colors[m[1]])[m[2]]}}throw new Error('No foreground token')}
it('renders the Sunday heading with ordinary-text contrast',()=>{
 const w=mount(Calendar)
 try{const sunday=w.findAll('span').find(e=>e.text()==='อา.');const fg=luminance(foreground(sunday.element)),bg=luminance(theme.theme.extend.colors.white);expect((Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)).toBeGreaterThanOrEqual(4.5)}finally{w.unmount()}
})
it('gives emoji choices a concise descriptive accessible name',()=>{
 const store=createTestStore();store.modals.emojiPicker.isOpen=true
 const w=mount(Emoji)
 try{expect(w.findAll('button').find(b=>b.text()==='🍓').attributes('aria-label')).toContain('สตรอว์เบอร์รี')}finally{w.unmount()}
})
