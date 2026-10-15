delete from public.workspace_records
where (collection = 'users' and record_id in ('usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_5', 'usr_6', 'usr_7'))
   or (collection = 'teams' and record_id in ('tm_1', 'tm_2', 'tm_3', 'tm_4', 'tm_5', 'tm_6', 'tm_7'))
   or (collection = 'companies' and record_id in ('cmp_1', 'cmp_2', 'cmp_3', 'cmp_4', 'cmp_5', 'cmp_6', 'cmp_7'))
   or (collection = 'meetings' and record_id in ('mtg_1', 'mtg_2', 'mtg_3', 'mtg_4', 'mtg_5', 'mtg_6', 'mtg_7', 'mtg_8'))
   or (collection = 'actionItems' and record_id in ('act_1', 'act_2', 'act_3', 'act_4', 'act_5', 'act_6', 'act_7', 'act_8', 'act_9', 'act_10'))
   or (collection = 'documents' and record_id in ('doc_1', 'doc_2', 'doc_3', 'doc_4', 'doc_5', 'doc_6', 'doc_7', 'doc_8'))
   or (collection = 'notifications' and record_id in ('ntf_1', 'ntf_2', 'ntf_3', 'ntf_4', 'ntf_5'))
   or (collection = 'activity' and record_id in ('atv_1', 'atv_2', 'atv_3', 'atv_4'));
update public.workspace_records
set data = jsonb_set(data, '{auth,defaultTeamId}', '""'::jsonb, false),
    updated_at = now()
where collection = 'settings'
  and data #>> '{auth,defaultTeamId}' = 'tm_1';
