// Test-only operands for Rules. The receipt validator must prove exact equality
// with the actual lines, including all padding, before any cached value is used.
export function lineOperands(lines){
  const padded=lines.concat(Array.from({length:6-lines.length},()=>({menuId:'_',qty:0,optionQuantities:{_:0}})))
  return {lineMenuIds:padded.map(l=>l.menuId),lineQtys:padded.map(l=>l.qty),lineOptionQuantities:Object.fromEntries(padded.map((l,i)=>[`L${i}`,{...l.optionQuantities}]))}
}
