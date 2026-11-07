export type DashboardTabId =
  | 'overview'
  | 'forecast'
  | 'performance'
  | 'data-health'
  | 'scenario'
  | 'grid-risk';

export interface ScadaObservation {
  timestamp: string;
  window_id: '2025_Q3' | '2026_Q1' | '2026_Q3';
  demand_met_mw: number;
  total_gen_mw: number;
  demand_lag_1h_mw: number;
  demand_lag_4h_mw: number;
  demand_lag_24h_mw: number;
  demand_roll_mean_1h_mw: number;
  hour_sin: number;
  hour_cos: number;
  dow_sin: number;
  dow_cos: number;
  target_timestamp_4h: string;
  actual_demand_4h_ahead_mw: number | null;
  seasonal_naive_pred_mw: number;
  historical_backtest_pred_mw: number;
  prediction_error_mw: number | null;
}

export interface ArtifactCompatibilityCheck {
  compatible: boolean;
  active_artifact_id: string;
  expected_candidate_id: string;
  frozen_config_path: string;
  mismatch_reasons: string[];
  remediation_steps: string[];
}

export interface OverviewResponse {
  kpis: {
    latest_recorded_demand_mw: number;
    latest_scheduled_gen_proxy_mw: number;
    latest_timestamp: string;
    forecast_horizon_hours: number;
    forecast_horizon_intervals: number;
    dataset_observation_count: number;
    dataset_column_count: number;
    candidate_pooled_mae_mw: number;
    seasonal_naive_mae_mw: number;
    mae_improvement_pct: number;
    candidate_pooled_r2: number;
    model_evaluation_status: string;
  };
  latest_verified_backtest: {
    issue_timestamp: string;
    target_timestamp: string;
    predicted_mw: number;
    actual_mw: number | null;
    seasonal_naive_mw: number;
    error_mw: number | null;
  };
  system_intelligence: {
    dataset_status: string;
    artifact_compatibility: ArtifactCompatibilityCheck;
    latest_evaluation_period: string;
    data_freshness_watermark: string;
    prospective_status: string;
    known_limitations: string[];
  };
  system_events: Array<{
    id: string;
    timestamp: string;
    category: string;
    title: string;
    detail: string;
    status: string;
  }>;
  timeline: ScadaObservation[];
}

export interface ForecastMetadataResponse {
  frozen_config: {
    config_id: string;
    config_path: string;
    version: string;
    frozen_at: string;
    status: string;
    candidate_model_id: string;
    model_family: string;
    target: {
      column: string;
      unit: string;
      description: string;
      horizon_intervals: number;
      horizon_hours: number;
      cadence_minutes: number;
      excluded_supply_proxy: {
        column: string;
        reason: string;
      };
    };
    required_features: Array<{
      name: string;
      label: string;
      unit: string;
      description: string;
    }>;
    config_sha256: string;
  };
  compatibility: ArtifactCompatibilityCheck;
  available_artifacts: Array<{
    artifact_id: string;
    artifact_file: string;
    model_family: string;
    config_id_bound: string;
    source_hour_shrinkage: boolean;
    feature_names: string[];
    artifact_sha256: string;
    compatibility_notes: string;
  }>;
  available_timestamps: Array<{
    timestamp: string;
    window_id: '2025_Q3' | '2026_Q1' | '2026_Q3';
    has_ground_truth_4h: boolean;
    demand_met_mw: number;
  }>;
}

export interface ForecastInferenceResponse {
  ok: boolean;
  status: string;
  message?: string;
  prediction_mode_label?: string;
  issue_timestamp?: string;
  target_timestamp?: string;
  horizon_hours?: number;
  horizon_intervals?: number;
  latest_observed_demand_mw?: number;
  scheduled_generation_proxy_mw?: number;
  predicted_demand_mw?: number;
  seasonal_naive_baseline_mw?: number;
  actual_target_demand_mw?: number | null;
  delta_vs_issue_mw?: number;
  delta_vs_seasonal_naive_mw?: number;
  prediction_error_mw?: number | null;
  model_id?: string;
  config_id?: string;
  shrinkage_window?: string;
  shrinkage_alpha?: number;
  compatibility: ArtifactCompatibilityCheck;
  feature_vector?: Array<{
    name: string;
    label: string;
    value: number | string;
    unit: string;
    role: string;
  }>;
  explanation_disclaimer?: string;
}

export interface ModelPerformanceResponse {
  report_id: string;
  generated_at: string;
  dataset_coverage: {
    start_timestamp: string;
    end_timestamp: string;
    total_observations: number;
    total_columns: number;
    cadence_minutes: number;
    target_column: string;
    horizon_intervals: number;
    horizon_hours: number;
  };
  pooled_summary: {
    evaluation_protocol: string;
    total_pooled_test_samples: number;
    seasonal_naive_mae_mw: number;
    candidate_hgb_mae_mw: number;
    mae_improvement_pct: number;
    seasonal_naive_rmse_mw: number;
    candidate_hgb_rmse_mw: number;
    rmse_improvement_pct: number;
    candidate_pooled_r2: number;
    seasonal_naive_pooled_r2: number;
    candidate_pooled_mean_bias_mw: number;
  };
  model_comparison_pooled: Array<{
    model_id: string;
    model_name: string;
    family: string;
    mae_mw: number;
    rmse_mw: number;
    r2: number;
    mean_bias_mw: number;
    sample_count: number;
    status: string;
    notes: string;
  }>;
  frozen_config: ForecastMetadataResponse['frozen_config'];
  compatibility: ArtifactCompatibilityCheck;
}

export interface RollingOriginWindow {
  window_id: string;
  label: string;
  train_period: string;
  eval_period: string;
  sample_count: number;
  seasonal_naive_mae_mw: number;
  candidate_hgb_mae_mw: number;
  seasonal_naive_rmse_mw: number;
  candidate_hgb_rmse_mw: number;
  candidate_r2: number;
  seasonal_naive_mean_bias_mw: number;
  candidate_mean_bias_mw: number;
  underforecast_rate_pct: number;
  overforecast_rate_pct: number;
  regime_summary: string;
}

export interface BiasAnalysisResponse {
  headline_finding: string;
  hourly_bias_profile: Array<{
    hour: string;
    q3_2025_bias_mw: number;
    q1_2026_bias_mw: number;
    q3_2026_bias_mw: number;
  }>;
  robustness_experiments: Array<{
    experiment: string;
    pooled_mae_mw: number;
    q3_2026_mae_mw: number;
    q3_2026_bias_mw: number;
    finding: string;
  }>;
}

export interface DataProvenanceResponse {
  dataset_name: string;
  source_repository: string;
  local_snapshot_path: string;
  dataset_size_mb: number;
  observation_count: number;
  column_count: number;
  sampling_frequency: string;
  time_coverage_start: string;
  time_coverage_end: string;
  local_dataset_watermark: string;
  sha256_hash: string;
  license_provenance: string;
  prospective_validation_status: string;
  quality_audit: {
    total_expected_15m_slots: number;
    recorded_observations: number;
    missing_interval_slots: number;
    missing_target_values_count: number;
    duplicate_timestamps_count: number;
    timestamp_parsing_failures: number;
    cadence_irregularities_count: number;
    schema_mismatches_count: number;
    flagged_outliers_count: number;
    complete_feature_window_rows: number;
    missing_feature_coverage_rows: number;
  };
  data_dictionary: Array<{
    column: string;
    type: string;
    category: string;
    status: string;
    description: string;
  }>;
}

export interface ScenarioSimulationResponse {
  simulation_badge: string;
  window_id: string;
  assumptions: {
    demand_adjustment_pct: number;
    demand_offset_mw: number;
    hypothetical_solar_delta_mw: number;
    hypothetical_wind_delta_mw: number;
    battery_capacity_mwh: number;
    battery_initial_soc_pct: number;
    battery_max_discharge_mw: number;
    battery_roundtrip_efficiency_pct: number;
  };
  summary: {
    baseline_mean_demand_mw: number;
    scenario_mean_demand_mw: number;
    mean_absolute_change_mw: number;
    mean_percentage_change_pct: number;
    baseline_peak_demand_mw: number;
    scenario_peak_demand_mw: number;
    scenario_net_peak_after_hypothetical_mitigation_mw: number;
  };
  supply_accounting_safeguard: {
    physical_imbalance_calculated: boolean;
    reason: string;
  };
  series: Array<{
    timestamp: string;
    baseline_demand_mw: number;
    baseline_forecast_4h_mw: number;
    simulated_demand_mw: number;
    simulated_forecast_4h_mw: number;
    simulated_battery_discharge_mw: number;
    simulated_renewable_offset_mw: number;
    simulated_net_load_reference_mw: number;
    simulated_battery_soc_remaining_mwh: number;
  }>;
}

export interface SavedScenarioItem {
  id: string;
  name: string;
  createdAt: string;
  data: ScenarioSimulationResponse;
}

export interface RiskStatusResponse {
  operational_mode: string;
  limited_mode_explanation: string;
  overall_classification: 'Normal' | 'Watch' | 'Elevated' | 'Critical';
  dimensions: Array<{
    id: string;
    name: string;
    classification: 'Normal' | 'Watch' | 'Elevated' | 'Critical';
    data_mode: string;
    measured_value: string;
    estimated_value: string;
    assumptions_used: string;
    missing_data: string;
    classification_rationale: string;
  }>;
}

export interface RecommendationsResponse {
  generated_from: string;
  physical_dispatch_disclaimer: string;
  recommendations: Array<{
    id: string;
    title: string;
    reason: string;
    supporting_metric: string;
    severity: 'Normal' | 'Watch' | 'Elevated' | 'Critical';
    suggested_action: string;
    confidence_qualification: string;
  }>;
}
