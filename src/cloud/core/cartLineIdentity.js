const choiceKey = line => Array.isArray(line.selections)
  ? JSON.stringify(line.selections.map(choice => [choice.groupId,choice.id,choice.selectionQty??1]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))))
  : JSON.stringify([...(line.optionIds||[])].sort())

export function sameCartPreparation(a,b) {
  return a.menuId===b.menuId
    && String(a.note||'').trim()===String(b.note||'').trim()
    && Array.isArray(a.selections)===Array.isArray(b.selections)
    && choiceKey(a)===choiceKey(b)
}
