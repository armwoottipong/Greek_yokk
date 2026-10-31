// These immutable commands all require the exact shop revision in their payload.
// Advancing that revision fences every late retry of the same command.
export const REVISION_COMMAND_KINDS=['platform_gp','menu','addon','group','inventory','receive','produce','history_clear','stock_count','switch_lot','material_create','material_archive','material_delete','material_metadata','material_measure','material_details','material_type','production_recipe']
