# API Contracts

---

## 1. `POST /api/modelops`

Validates experiment metadata, generates a standardized Model Card via AI provider layer (Groq primary / Gemini fallback), and calculates a deterministic readiness score.

### Request Headers
`Content-Type: application/json`

### Request Body (`ExperimentMetadata`)
```json
{
  "model_name": "FraudDetector-X",
  "version": "1.2.0",
  "dataset": "Financial-Transactions-2026",
  "intended_use": "Real-time financial transaction fraud classification",
  "framework": "PyTorch 2.2",
  "task_type": "Binary Classification",
  "input_shape": "(batch_size, 64)",
  "data_types": ["float32", "int64"],
  "metrics": {
    "accuracy": 0.985,
    "f1_score": 0.972,
    "precision": 0.968,
    "recall": 0.976
  },
  "hyperparameters": {
    "learning_rate": 0.001,
    "batch_size": 256
  },
  "limitations": ["Requires sub-50ms inference latency"],
  "risks": ["Potential false positives during holiday traffic spikes"],
  "tests": ["Unit test suite passed", "Fairness evaluation passed"],
  "reproducibility": "MLflow run ID 849302"
}
```

### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "model_name": "FraudDetector-X",
    "version": "1.2.0",
    "dataset": "Financial-Transactions-2026",
    "experiment_info": "Model Evaluation for FraudDetector-X (v1.2.0) using PyTorch 2.2 for Binary Classification.",
    "input_shape": "(batch_size, 64)",
    "data_types": ["float32", "int64"],
    "distribution_summary": "Analyzed tabular transaction feature distributions.",
    "metrics": {
      "accuracy": 0.985,
      "f1_score": 0.972,
      "precision": 0.968,
      "recall": 0.976
    },
    "intended_use": "Real-time financial transaction fraud classification",
    "warnings": [],
    "limitations": ["Requires sub-50ms inference latency"],
    "risks": ["Potential false positives during holiday traffic spikes"],
    "tests": ["Unit test suite passed", "Fairness evaluation passed"],
    "reproducibility": "MLflow run ID 849302",
    "readiness_score": 90,
    "ai_analysis": "The model demonstrates strong evaluation metrics exceeding 95% threshold across precision and recall.",
    "detected_issues": [],
    "error_reasons": [],
    "suggested_fixes": ["Perform sub-50ms latency load test"],
    "next_steps": ["Submit for human review sign-off"],
    "references": [],
    "evidence": ["Model name: FraudDetector-X", "Dataset: Financial-Transactions-2026"],
    "decision": "pending_human_review"
  }
}
```

### Error Responses

#### `400 Bad Request` (Validation Error)
```json
{
  "success": false,
  "error": "Input validation failed",
  "details": [
    {
      "path": "model_name",
      "message": "Model name is required"
    }
  ]
}
```

#### `500 Internal Server Error`
```json
{
  "success": false,
  "error": "An internal server error occurred while processing model evaluation."
}
```

---

## 2. `POST /api/modelops/compare`

Deterministically compares two experiment runs, computing metric-by-metric diffs and readiness score deltas.

### Request Body
```json
{
  "run1": {
    "model_name": "FraudDetector-X",
    "version": "1.0.0",
    "metrics": {
      "accuracy": 0.94,
      "loss": 0.25
    }
  },
  "run2": {
    "model_name": "FraudDetector-X",
    "version": "1.2.0",
    "metrics": {
      "accuracy": 0.985,
      "loss": 0.12
    },
    "tests": ["Unit tests passed"]
  }
}
```

### Success Response (`200 OK`)
```json
{
  "success": true,
  "comparison": {
    "model_name_1": "FraudDetector-X",
    "version_1": "1.0.0",
    "model_name_2": "FraudDetector-X",
    "version_2": "1.2.0",
    "metrics_diff": [
      {
        "metric_name": "accuracy",
        "run1_value": 0.94,
        "run2_value": 0.985,
        "delta": 0.045,
        "direction": "improved"
      },
      {
        "metric_name": "loss",
        "run1_value": 0.25,
        "run2_value": 0.12,
        "delta": -0.13,
        "direction": "improved"
      }
    ],
    "readiness_score_1": 45,
    "readiness_score_2": 70,
    "readiness_delta": 25,
    "summary": [
      "FraudDetector-X (v1.2.0) has a higher readiness score (+25 points) than FraudDetector-X (v1.0.0).",
      "Improved metrics in FraudDetector-X: accuracy, loss."
    ]
  }
}
```

