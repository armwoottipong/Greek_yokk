import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
export default [
  { ignores: ['node_modules/**','dist/**','docs/assets/**','app.js','app_legacy.js','.superpowers/**'] },
  js.configs.recommended,
  ...vue.configs['flat/essential'],
  { files:['src/**/*.{js,vue}','tests/**/*.js','*.config.js'],languageOptions:{globals:{...globals.browser,...globals.node}},rules:{'no-unused-vars':'off','no-empty':['error',{allowEmptyCatch:true}],'vue/multi-word-component-names':'off'} }
]
