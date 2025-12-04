# Project Suggestions for Research Insight

## 1. Conversational Planning Phase (Before Research)

The current system jumps straight into decomposition without understanding the topic first. Add a discovery and planning phase.

### New Flow

```
1. LEARN      → What IS this thing? Fundamentals.
2. UNDERSTAND → What's been tried? What's the state of the art?
3. SCOPE      → Given all that, what should WE research?
4. APPROVE    → User reviews and approves before expensive research
5. RESEARCH   → Run the multi-agent pipeline (existing)
```

### Discovery Sources (No Wikipedia)

| Use | Don't Use |
|-----|-----------|
| arXiv, PubMed, Google Scholar | Wikipedia |
| Conference papers (NeurIPS, ICML, CVPR) | Generic encyclopedias |
| Research lab blogs (Google AI, DeepMind) | Summary sites |
| Official docs, whitepapers | Quora, Reddit |
| Seminal papers, citations | Blog spam |

### Example Conversation Flow

```
USER: "I want to build a recommendation system for my e-commerce site"

SYSTEM: [Learns first]
"Before I propose what to research, let me understand:

 What are recommendation systems?
 • Collaborative filtering - users who bought X also bought Y
 • Content-based - match item features to user preferences
 • Hybrid approaches

 What scale are you at?
 • 1k users vs 1M users = different approaches
 • Real-time vs batch = different architectures

 What's your stack? What data do you have?

 Tell me more about your situation."

USER: "We have 50k products, 100k users, Python/PostgreSQL stack"

SYSTEM: [Understands state of the art]
"Let me research what approaches work for your scale...

 For your scale (100k users, 50k products):
 • Matrix factorization (ALS, SVD) works well
 • Neural approaches possible but may be overkill
 • Key papers: 'Factorization Machines' (Rendle), 'NCF' (He et al.)

 Your Python/PostgreSQL stack:
 • LightFM, Surprise libraries are good fits
 • Can start simple, no need for distributed systems yet

 Should I propose research components?"

USER: "Yes"

SYSTEM: [Proposes scope]
"Based on what I learned, here's what I recommend researching:

 1. Data Pipeline & Feature Engineering
 2. Algorithm Selection (Collaborative vs Hybrid)
 3. Cold Start Problem (new users/products)
 4. Real-time vs Batch Architecture
 5. Evaluation Metrics & A/B Testing

 Adjust anything? Or start deep research?"
```

### UI Design

The RunOrchestrator page becomes a chat interface:

```
┌──────────────────────────────────────────────────────────────────┐
│  Research Planner                                                │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ [Chat history - scrollable]                                │  │
│  │                                                            │  │
│  │ You: Research recommendation systems                       │  │
│  │                                                            │  │
│  │ System: I've researched this topic...                      │  │
│  │         [Discovery summary]                                │  │
│  │         [Proposed components]                              │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐   │
│  │ CURRENT PLAN               │  │ Type message...        │   │
│  │                            │  │                         │   │
│  │ ▼ Data Pipeline            │  │ [Send]                  │   │
│  │ ▼ Algorithm Selection      │  └─────────────────────────┘   │
│  │   ├─ Collaborative         │                                 │
│  │   └─ Hybrid                │  ┌─────────────────────────┐   │
│  │ ▼ Cold Start               │  │ [Start Research]        │   │
│  └─────────────────────────────┘  └─────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Backend Endpoints Needed

| Endpoint | Purpose |
|----------|---------|
| `POST /plan/start` | Begin planning - does discovery, returns initial proposal |
| `POST /plan/chat` | Continue conversation - user message → refined plan |
| `POST /plan/approve` | Lock in the plan, return plan ID |
| `POST /run` | Execute research on approved plan |

---

## 2. Cost Estimation Before Starting

Show users what they're committing to:

```
┌─────────────────────────────────────────────────────────────────┐
│  "Based on this plan (6 components, 3 levels deep), I estimate: │
│                                                                  │
│   • ~45 LLM calls                                               │
│   • ~$12-18 in API costs                                        │
│   • ~25 minutes runtime                                         │
│                                                                  │
│   Want to proceed, or simplify the scope?"                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Source Quality Scoring

Not all sources are equal. Track and display quality:

```
Sources used:
├── [★★★★★] Nature 2023 - "Deep Learning for..." (14k citations)
├── [★★★★☆] arXiv 2024 - "Novel approach to..." (peer-reviewed)
├── [★★★☆☆] Industry blog - "How we built..." (practitioner)
└── [★★☆☆☆] Medium post - "Introduction to..." (secondary)
```

Weight conclusions by source quality.

---

## 4. Contradiction Detection

When sources disagree, surface it explicitly:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ CONFLICTING FINDINGS                                        │
│                                                                  │
│  On "optimal batch size for transformers":                      │
│  • Paper A (Google, 2023): "Larger is always better"            │
│  • Paper B (Meta, 2024): "Diminishing returns after 2048"       │
│                                                                  │
│  Context: Paper A used TPUs, Paper B used GPUs.                 │
│  Recommendation: Depends on your hardware.                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Research Memory

Don't start fresh every time. Build on past research:

```
USER: "Research quantum error correction"

SYSTEM: "I see you previously researched:
 • Quantum computing investments (2 weeks ago)
 • Qubit architectures (1 month ago)

 Should I build on that context, or start fresh?"
```

---

## 6. Confidence Levels

Be honest about certainty in findings:

```
Findings:
├── [HIGH confidence] CNNs work well for image classification
│   └── 500+ papers, consistent results
├── [MEDIUM confidence] ViTs may outperform on large datasets
│   └── Recent, fewer replications
└── [LOW confidence] Mamba architecture promising
    └── Very new, limited real-world validation
```

---

## 7. Checkpoints During Research

Human-in-the-loop at key decision points, not just start/end:

```
┌─────────────────────────────────────────────────────────────────┐
│  [After Stage 1 of Component 2]                                 │
│                                                                  │
│  "I've completed initial research on 'Model Architecture'.      │
│   Key finding: Your constraints rule out transformers.          │
│                                                                  │
│   This changes the scope. Should I:                             │
│   A) Continue as planned                                        │
│   B) Adjust remaining components based on this                  │
│   C) Pause and discuss"                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Knowledge Graph Visualization

Build a visual map as research progresses:

```
                    ┌─────────────────┐
                    │ Recommendation  │
                    │    Systems      │
                    └────────┬────────┘
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │Collaborative│   │Content-Based│   │   Hybrid    │
    │  Filtering  │   │  Filtering  │   │  Approaches │
    └──────┬──────┘   └──────┬──────┘   └─────────────┘
           │                 │
    ┌──────┴──────┐   ┌──────┴──────┐
    │ Matrix      │   │ Embeddings  │
    │Factorization│   │ (Word2Vec)  │
    └─────────────┘   └─────────────┘
```

---

## 9. Research Templates

Pre-built flows for common research types:

```
Templates:
├── Technical Build - "I want to build X"
│   └── Feasibility → Architecture → Implementation → Deployment
├── Investment Research - "Should I invest in X"
│   └── Market → Competition → Risks → Valuation
├── Academic Deep-Dive - "Research topic X"
│   └── Literature → Gaps → Methodology → Synthesis
└── Idea Validation - "I have an idea for X"
    └── Problem → Existing Solutions → Differentiation → Feasibility
```

---

## 10. Incremental Results

Show findings as they come in, not just at the end:

```
┌─────────────────────────────────────────────────────────────────┐
│  Component 1/6: Signal Processing    [COMPLETE]                 │
│  ├── Key finding: Bandpass 8-30Hz optimal                       │
│  └── Confidence: HIGH                                           │
│                                                                  │
│  Component 2/6: Feature Extraction   [IN PROGRESS - 60%]        │
│  ├── Preliminary: Wavelet > FFT for non-stationary              │
│  └── Still researching: optimal window size                     │
│                                                                  │
│  Component 3/6: Classification       [QUEUED]                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Export Formats

Research isn't useful if it stays in the app:

```
Export options:
├── PDF Report (formatted, citations)
├── Markdown (for docs/wiki)
├── Slide Deck (executive summary)
├── JSON (structured data for downstream use)
└── BibTeX (citations only)
```

---

## Implementation Priority

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Conversational Planning | High | High | 1 |
| Cost Estimation | High | Low | 2 |
| Incremental Results | High | Medium | 3 |
| Confidence Levels | Medium | Low | 4 |
| Source Quality Scoring | Medium | Medium | 5 |
| Contradiction Detection | Medium | Medium | 6 |
| Research Memory | Medium | High | 7 |
| Checkpoints During Research | Medium | Medium | 8 |
| Export Formats | Medium | Medium | 9 |
| Research Templates | Low | Low | 10 |
| Knowledge Graph | Low | High | 11 |
