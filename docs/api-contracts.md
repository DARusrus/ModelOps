# API Contracts

## 1. `POST /api/modelops`

Validates experiment metadata, generates a model card draft, computes deterministic readiness and risk outputs, and returns them in a single structured response.

### Request headers

`Content-Type: application/json`

### Request body

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
  "limitations": ["Requires sub-50ms inference latency"],
  "risks": ["Potential false positives during holiday traffic spikes"],
  "tests": ["Unit test suite passed", "Fairness evaluation passed"],
  "reproducibility": "MLflow run ID 849302",
  "training": {
    "epochs": 12,
    "optimizer": "AdamW"
  },
  "deployment": {
    "platform": "Azure Container Apps",
    "environment": "production"
  },
  "risk_assessment": {
    "ethics": "No material ethics concerns identified.",
    "bias": "Fairness evaluation completed."
  }
}
```

### Success response (`200 OK`)

```json
{
  "success": true,
  "provider": "groq",
  "processing_time": "184ms",
  "request_id": "uuid",
  "timestamp": "2026-07-29T00:00:00.000Z",
  "data": {
    "model_name": "FraudDetector-X",
    "version": "1.2.0",
    "dataset": "Financial-Transactions-2026",
    "intended_use": "Real-time financial transaction fraud classification",
    "metrics": {
      "accuracy": 0.985,
      "f1_score": 0.972
    },
    "limitations": ["Requires sub-50ms inference latency"],
    "risks": ["Potential false positives during holiday traffic spikes"],
    "tests": ["Unit test suite passed", "Fairness evaluation passed"],
    "reproducibility": "MLflow run ID 849302",
    "overview": "...",
    "executive_summary": "...",
    "architecture": "...",
    "deployment_readiness": "...",
    "production_readiness": "...",
    "detected_issues": [],
    "suggested_fixes": [],
    "recommendations": [],
    "next_steps": [],
    "references": [],
    "evidence": [],
    "confidence_notes": [],
    "assumptions": []
  },
  "readiness": {
    "score": 85,
    "decision": "APPROVED",
    "justification": [],
    "breakdown": {},
    "reasons": []
  },
  "risk": {
    "level": "Medium",
    "explanation": "...",
    "reasons": []
  },
  "recommendations": ["Submit for human review sign-off"],
  "metadata": {
    "model_name": "FraudDetector-X",
    "version": "1.2.0",
    "dataset": "Financial-Transactions-2026"
  }
}
```

### Error responses

- `400 Bad Request`: invalid JSON or failed Zod validation.
- `429 Too Many Requests`: rate-limited request.
- `500 Internal Server Error`: unexpected server failure.

## 2. `POST /api/modelops/compare`

Compares two experiment runs deterministically and returns metric diffs plus readiness deltas.

### Request body

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

### Success response (`200 OK`)

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
      }
    ],
    "readiness_score_1": 45,
    "readiness_score_2": 70,
    "readiness_delta": 25,
    "summary": [
      "FraudDetector-X (v1.2.0) has a higher readiness score (+25 points) than FraudDetector-X (v1.0.0)."
    ]
  }
}
```

