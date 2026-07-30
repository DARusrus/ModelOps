# TEAM_RULES.md

# ModelOps — ML Experiment, Model Card & Readiness Assistant

Version: 1.0

This document defines the engineering workflow and mandatory development rules for every contributor (Human or AI).

---

# Project Vision

ModelOps is an AI-powered assistant that evaluates Machine Learning experiments, generates standardized Model Cards, and assesses deployment readiness.

The project prioritizes:

- Reliability
- Explainability
- Traceability
- Maintainability
- Reproducibility

Every contribution must support these goals.

---

# Team Roles

Every contributor owns only their assigned responsibilities.

Do not modify another engineer's work unless:

- fixing a bug
- requested during review
- improving shared utilities

Large architectural changes require approval.

---

# AI & Backend Engineer Responsibilities

Responsible for:

- AI Providers
- Prompt Engineering
- Backend Services
- API Routes
- Validation
- Business Logic
- Readiness Assessment
- Model Card Generation
- Testing
- Documentation

Not responsible for:

- UI redesign
- Visual styling
- Frontend UX decisions

unless backend integration requires it.

---

# Development Principles

Always follow:

- SOLID
- DRY
- KISS
- Clean Architecture
- Separation of Concerns
- Single Responsibility

Avoid:

- duplicated code
- large functions
- hardcoded values
- magic numbers
- unnecessary abstractions

---

# Repository First Rule

Before writing code:

Search the repository.

If similar functionality exists:

extend it.

Never duplicate it.

---

# Architecture Rule

Never redesign the repository.

Preserve:

Folder structure

Naming conventions

API contracts

Shared utilities

Existing schemas

Existing validation

Only improve where necessary.

---

# Validation Rules

Every request must be validated.

Validate:

- Input
- Output
- Metadata
- Dataset information
- Model information
- AI response

Never trust user input.

Never trust AI output.

---

# AI Rules

AI responses must be:

Deterministic whenever possible.

Structured.

Validated.

Explainable.

Never fabricate:

metrics

dataset statistics

evaluation values

performance numbers

If information is missing,

state that clearly.

---

# Model Card Rules

Every generated Model Card must contain:

- Model Information
- Dataset Information
- Experiment Information
- Input Shape
- Data Types
- Distribution Summary
- Metrics
- Warnings
- Limitations
- Readiness Score
- AI Analysis
- Detected Issues
- Error Reasons
- Suggested Fixes
- Next Steps
- References
- Evidence

Never omit mandatory fields.

---

# Readiness Assessment

Readiness scoring must:

be deterministic whenever possible.

justify every score.

produce actionable recommendations.

support incomplete experiments gracefully.

---

# Prompt Engineering

Prompts should:

be modular

be reusable

avoid hallucination

request structured outputs

support provider independence

Never duplicate prompts.

---

# AI Providers

All providers must expose a unified interface.

Support:

timeouts

retry logic

response normalization

structured output

provider failover

Never expose provider-specific implementation outside providers.

---

# Error Handling

No silent failures.

No swallowed exceptions.

Meaningful error messages only.

Unexpected failures must be logged.

---

# Logging

Every backend operation should be traceable.

Log:

errors

warnings

provider failures

unexpected states

Do not log secrets.

---

# TypeScript

Strict mode only.

Avoid:

any

unsafe casting

Prefer:

interfaces

shared types

type inference

---

# Performance

Avoid:

duplicate AI requests

duplicate parsing

unnecessary computations

Reuse services whenever possible.

---

# Security

Never expose:

API keys

tokens

stack traces

private configuration

Sanitize every external input.

---

# Testing

Every backend change requires:

Unit Tests

Integration Tests (when applicable)

Passing lint

Passing type check

Do not merge broken code.

---

# Documentation

Whenever backend behavior changes:

Update:

README

API documentation

AI documentation

Architecture documentation

Keep documentation synchronized with implementation.

---

# Code Review Checklist

Before submitting code verify:

Architecture consistency

No duplicated code

Validation exists

Tests pass

Documentation updated

No security risks

Readable code

Meaningful naming

Small functions

---

# Work Tracking

Maintain:

WORK_LOG.md

Append only.

Each entry contains:

Timestamp

Engineer

Task

Files Modified

Summary

Status

---

# Error Tracking

Maintain:

ERROR_LOG.md

Append only.

Each entry contains:

Timestamp

Problem

Root Cause

Solution

Reason for Fix

Affected Files

Lessons Learned

---

# Status Reporting

At the end of every task report:

NOT STARTED

IN PROGRESS

BLOCKED

COMPLETED

Always explain blockers.

Always summarize completed work.

---

# Git Rules

Small commits.

Single-purpose commits.

Meaningful commit messages.

Never mix unrelated changes.

---

# Team Communication

If blocked:

Ask another teammate.

Do not stay blocked silently.

Document assumptions.

Document decisions.

---

# Future Features

Features under investigation must NOT be implemented prematurely.

Current example:

Run Side by Side

Backend may prepare extension points only.

No speculative implementation.

---

# Final Engineering Checklist

Before considering any feature complete:

✓ Architecture preserved

✓ Validation complete

✓ AI output validated

✓ Tests passing

✓ Documentation updated

✓ Logs updated

✓ Errors documented

✓ No duplicated code

✓ Security verified

✓ Performance reviewed

Only then mark the task as COMPLETED.