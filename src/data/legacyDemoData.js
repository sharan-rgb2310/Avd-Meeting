import { KEYS, getData, setData, withoutRemotePersistence } from '../services/storageService'

const DEMO_IDS = {
  [KEYS.users]: new Set(['usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_5', 'usr_6', 'usr_7']),
  [KEYS.teams]: new Set(['tm_1', 'tm_2', 'tm_3', 'tm_4', 'tm_5', 'tm_6', 'tm_7']),
  [KEYS.companies]: new Set(['cmp_1', 'cmp_2', 'cmp_3', 'cmp_4', 'cmp_5', 'cmp_6', 'cmp_7']),
  [KEYS.meetings]: new Set(['mtg_1', 'mtg_2', 'mtg_3', 'mtg_4', 'mtg_5', 'mtg_6', 'mtg_7', 'mtg_8']),
  [KEYS.actionItems]: new Set(['act_1', 'act_2', 'act_3', 'act_4', 'act_5', 'act_6', 'act_7', 'act_8', 'act_9', 'act_10']),
  [KEYS.documents]: new Set(['doc_1', 'doc_2', 'doc_3', 'doc_4', 'doc_5', 'doc_6', 'doc_7', 'doc_8']),
  [KEYS.notifications]: new Set(['ntf_1', 'ntf_2', 'ntf_3', 'ntf_4', 'ntf_5']),
  [KEYS.activity]: new Set(['atv_1', 'atv_2', 'atv_3', 'atv_4']),
}

export const withoutLegacyDemoRecords = (key, records) =>
  (records || []).filter((record) => !DEMO_IDS[key]?.has(String(record.id)))

export const withoutLegacyDemoSettings = (settings) => {
  if (!settings || typeof settings !== 'object') return settings
  return {
    ...settings,
    auth: settings.auth
      ? {
          ...settings.auth,
          defaultTeamId: settings.auth.defaultTeamId === 'tm_1' ? '' : settings.auth.defaultTeamId,
        }
      : settings.auth,
  }
}

export const removeLegacyDemoData = () => {
  withoutRemotePersistence(() => {
    Object.keys(DEMO_IDS).forEach((key) => {
      const records = getData(key, null)
      if (!Array.isArray(records)) return
      const filtered = withoutLegacyDemoRecords(key, records)
      if (filtered.length !== records.length) setData(key, filtered)
    })

    const settings = getData(KEYS.settings, null)
    if (settings) {
      const cleaned = withoutLegacyDemoSettings(settings)
      if (JSON.stringify(cleaned) !== JSON.stringify(settings)) setData(KEYS.settings, cleaned)
    }

    const remoteMeetingIds = getData(KEYS.remoteMeetingIds, [])
    if (!Array.isArray(remoteMeetingIds)) return
    const cleanRemoteIds = withoutLegacyDemoRecords(KEYS.meetings, remoteMeetingIds.map((id) => ({ id })))
      .map((meeting) => meeting.id)
    if (cleanRemoteIds.length !== remoteMeetingIds.length) setData(KEYS.remoteMeetingIds, cleanRemoteIds)
  })
}
