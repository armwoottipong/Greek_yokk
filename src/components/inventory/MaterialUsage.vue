<template>
  <div class="material-usage" v-if="groups.length">
    <div class="usage-labels"><StatusBadge v-for="group in groups" :key="group.id" :label="group.label" tone="neutral" /></div>
    <dl v-if="showReferences" class="usage-references">
      <div v-for="group in groups" :key="group.id">
        <dt>{{ group.label }}</dt>
        <dd v-for="source in group.sources" :key="source.sourceId">{{ source.sourceName }} · {{ source.qty }} {{ source.unit }}</dd>
      </div>
    </dl>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import StatusBadge from '../ui/StatusBadge.vue'
import { MATERIAL_ROLE_OPTIONS } from '@/domain/materialClassification'
const props = defineProps({ usage: Object, showReferences: Boolean })
const groups = computed(() => MATERIAL_ROLE_OPTIONS
  .filter(role => props.usage?.[role.id]?.length)
  .map(role => ({ ...role, sources: props.usage[role.id] })))
</script>
<style scoped>
.usage-labels{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.usage-references{display:grid;gap:12px;margin:16px 0;font-size:12px;line-height:1.7}.usage-references dt{font-weight:600;color:var(--text-main)}.usage-references dd{color:var(--text-muted);overflow-wrap:anywhere}
</style>
