// feature values for a single student at a specific time
export type FeatureSnapshotRow = {
  feature_id: number
  student_id?: number
  days_from_start?: number
  total_clicks: number
  avg_clicks: number
  vle_records: number
  avg_score: number
  total_score: number
  assessment_count: number
  avg_weight: number
  at_risk_label?: number | null
}
