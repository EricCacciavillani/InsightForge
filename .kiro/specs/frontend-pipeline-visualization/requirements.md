# Requirements Document

## Introduction

This feature updates the frontend to visualize the new research pipeline stages. The current UI only shows basic progress, but with hierarchical learning, intelligent research, and red team agents, users need visibility into each stage's status, outputs, and findings.

## Glossary

- **Pipeline Stage**: A discrete step in the research process
- **Stage Card**: UI component showing a stage's status and output
- **Progress Timeline**: Visual representation of pipeline progress
- **Foundation Viewer**: Component to display foundation knowledge
- **Red Team Report**: Component to display red team findings
- **Document Viewer**: Tab showing processed papers with figures, equations, and extracted data
- **Discrepancy Log**: UI section showing conflicts between text claims and visual data
- **Figure Thumbnail**: Small preview of extracted figure with description
- **User Document**: PDF, DOCX, TXT, or MD file uploaded by user containing their idea/concept
- **Pre-Run Analysis**: Processing of user documents to extract components before starting research
- **Cost Estimation**: Predicted cost based on document complexity and selected cost tier
- **Run Confirmation**: Dialog showing summary and cost before starting the pipeline

## Requirements

### Requirement 1: Pipeline Progress Visualization

**User Story:** As a user, I want to see all pipeline stages and their status, so that I understand where my research is.

#### Acceptance Criteria

1. WHEN a research run starts THEN the system SHALL display all pipeline stages
2. WHEN a stage is running THEN the system SHALL show a progress indicator
3. WHEN a stage completes THEN the system SHALL show success/failure status
4. WHEN a stage is skipped THEN the system SHALL show it as skipped with reason

### Requirement 2: Hierarchical Learning Display

**User Story:** As a user, I want to see system foundation and relationships, so that I understand the research context.

#### Acceptance Criteria

1. WHEN system survey completes THEN the system SHALL display domain concepts and patterns
2. WHEN relationship mapping completes THEN the system SHALL display a component graph
3. WHEN constraints are propagated THEN the system SHALL show budget allocations
4. WHEN conflicts are detected THEN the system SHALL highlight them prominently

### Requirement 3: Foundation Knowledge Display

**User Story:** As a user, I want to see what the system learned, so that I can verify understanding.

#### Acceptance Criteria

1. WHEN foundation learning completes THEN the system SHALL display the explainer document
2. WHEN concepts are extracted THEN the system SHALL show them in a browsable list
3. WHEN open questions exist THEN the system SHALL display them with confidence scores
4. WHEN open debates exist THEN the system SHALL show both positions

### Requirement 4: Hypothesis and Evidence Display

**User Story:** As a user, I want to see agent hypotheses and evidence, so that I understand their reasoning.

#### Acceptance Criteria

1. WHEN hypotheses are formed THEN the system SHALL display them per agent
2. WHEN evidence is gathered THEN the system SHALL show sources with relevance
3. WHEN evidence supports/contradicts THEN the system SHALL indicate the relationship
4. WHEN agents have different evidence THEN the system SHALL show side-by-side comparison

### Requirement 5: Red Team Report Display

**User Story:** As a user, I want to see red team findings, so that I understand risks before accepting.

#### Acceptance Criteria

1. WHEN red team completes THEN the system SHALL display a summary report
2. WHEN attack vectors are found THEN the system SHALL list them with impact
3. WHEN failure modes are found THEN the system SHALL show severity and mitigation
4. WHEN the recommendation is "reject" THEN the system SHALL highlight it prominently

### Requirement 6: Cost and Performance Display

**User Story:** As a user, I want to see cost and timing information, so that I can optimize my usage.

#### Acceptance Criteria

1. WHEN a run is in progress THEN the system SHALL show estimated vs actual cost
2. WHEN stages complete THEN the system SHALL show duration per stage
3. WHEN the run completes THEN the system SHALL show total cost breakdown
4. WHEN cost tier is selected THEN the system SHALL show expected cost range

### Requirement 7: Document Viewer Tab

**User Story:** As a user, I want to browse processed documents with their figures and extracted data, so that I can verify what the system understood.

#### Acceptance Criteria

1. WHEN documents are processed THEN the system SHALL display a "Documents" tab in the UI
2. WHEN a document is selected THEN the system SHALL show paper metadata (title, authors, year, source)
3. WHEN a document is selected THEN the system SHALL show the distilled summary
4. WHEN figures are extracted THEN the system SHALL display them as thumbnails with descriptions
5. WHEN equations are extracted THEN the system SHALL render them in LaTeX with plain English explanations
6. WHEN key claims are extracted THEN the system SHALL list them with source quotes
7. WHEN clicking a figure THEN the system SHALL show it full-size with detailed description

### Requirement 8: Discrepancy Log Display

**User Story:** As a user, I want to see when text and figures disagreed, so that I understand data quality issues.

#### Acceptance Criteria

1. WHEN discrepancies exist THEN the system SHALL show a "Discrepancies" section in the document viewer
2. WHEN displaying a discrepancy THEN the system SHALL show the text claim, figure value, and which was used
3. WHEN the source hierarchy resolved a conflict THEN the system SHALL explain the resolution
4. WHEN multiple discrepancies exist THEN the system SHALL sort by severity (largest difference first)
5. WHEN no discrepancies exist THEN the system SHALL show a "No conflicts detected" message

### Requirement 9: User Document Upload

**User Story:** As a user, I want to upload my own documents about my idea, so that the system can use them as context for research.

#### Acceptance Criteria

1. WHEN the user is on the run setup page THEN the system SHALL display a document upload area
2. WHEN the user drags files THEN the system SHALL accept PDF, DOCX, TXT, and MD formats
3. WHEN a document is uploaded THEN the system SHALL process it using multimodal distillation
4. WHEN processing completes THEN the system SHALL display extracted components, figures, and concepts
5. WHEN multiple documents are uploaded THEN the system SHALL show them in a list with status
6. WHEN the user clicks a document THEN the system SHALL show the extracted content preview

### Requirement 10: Pre-Run Analysis Preview

**User Story:** As a user, I want to see what the system extracted from my documents before running, so that I can verify it understood my idea correctly.

#### Acceptance Criteria

1. WHEN documents are processed THEN the system SHALL display a "Preview" panel
2. WHEN showing preview THEN the system SHALL list all extracted components/topics
3. WHEN showing preview THEN the system SHALL display key figures with descriptions
4. WHEN showing preview THEN the system SHALL show extracted concepts and ideas
5. WHEN showing preview THEN the system SHALL highlight any ambiguities or unclear sections
6. WHEN the user is unsatisfied THEN the system SHALL allow editing component names before run

### Requirement 11: Pre-Run Cost Estimation

**User Story:** As a user, I want to see estimated costs before running, so that I can decide whether to proceed.

#### Acceptance Criteria

1. WHEN documents are processed THEN the system SHALL calculate estimated cost
2. WHEN displaying estimate THEN the system SHALL show cost breakdown by stage
3. WHEN displaying estimate THEN the system SHALL show cost range (min/max) based on complexity
4. WHEN the user selects a cost tier THEN the system SHALL update the estimate accordingly
5. WHEN the estimate exceeds a threshold THEN the system SHALL warn the user
6. WHEN the user clicks "Run" THEN the system SHALL confirm the estimated cost before starting

### Requirement 12: Run Confirmation Dialog

**User Story:** As a user, I want to confirm before starting an expensive run, so that I don't accidentally spend too much.

#### Acceptance Criteria

1. WHEN the user clicks "Run" THEN the system SHALL show a confirmation dialog
2. WHEN showing confirmation THEN the system SHALL display: components to research, uploaded documents, cost tier, estimated cost
3. WHEN the user confirms THEN the system SHALL start the research pipeline
4. WHEN the user cancels THEN the system SHALL return to the setup page
5. WHEN estimated cost exceeds $5 THEN the system SHALL require explicit checkbox confirmation


### Requirement 13: PDF Report Download

**User Story:** As a user, I want to download the final PDF report, so that I have a complete document with all research findings.

#### Acceptance Criteria

1. WHEN a research run completes THEN the system SHALL show a "Download Report" button
2. WHEN the PDF is generating THEN the system SHALL show a progress indicator
3. WHEN the user clicks download THEN the system SHALL download the PDF to their device
4. WHEN the PDF is ready THEN the system SHALL notify the user via the UI
5. WHEN viewing results THEN the system SHALL show a preview of report sections


### Requirement 14: Research Mode Selection UI

**User Story:** As a user, I want to easily select my research mode and answer follow-up questions, so that I can customize my research experience.

#### Acceptance Criteria

1. WHEN starting a new run THEN the system SHALL display a mode selection screen with 4 options
2. WHEN displaying modes THEN the system SHALL show: Learn (📚), Build (🔧), Compare (⚖️), Explore (🔍) with descriptions
3. WHEN a mode is selected THEN the system SHALL highlight it and show relevant follow-up questions
4. WHEN showing follow-up questions THEN the system SHALL use appropriate input types (dropdowns, sliders, text)
5. WHEN the user clicks "Skip" THEN the system SHALL proceed with defaults
6. WHEN all questions are answered THEN the system SHALL show a summary before starting
7. WHEN the user wants to change mode THEN the system SHALL allow going back without losing answers


### Requirement 15: Progressive Disclosure with Intervention Points

**User Story:** As a user, I want to intervene during research, so that I can guide the system when it's off track.

#### Acceptance Criteria

1. WHEN papers are filtered THEN the UI SHALL show results and allow user to add/remove papers
2. WHEN themes are identified THEN the UI SHALL allow user to focus on specific themes or mark some as irrelevant
3. WHEN foundation claims are generated THEN the UI SHALL allow user to correct known errors
4. WHEN intervention is available THEN the UI SHALL show clear options without requiring intervention
5. WHEN user intervenes THEN the system SHALL continue from that point with the modifications

### Requirement 16: Real-Time Confidence Display

**User Story:** As a user, I want to see a running confidence score, so that I know if something might be wrong before final output.

#### Acceptance Criteria

1. WHEN a run is in progress THEN the UI SHALL display a running confidence score
2. WHEN confidence drops significantly THEN the UI SHALL highlight this with a warning
3. WHEN confidence is low THEN the UI SHALL show which areas are uncertain
4. WHEN hovering over confidence THEN the UI SHALL show contributing factors

### Requirement 17: "Why Did You..." Query Interface

**User Story:** As a user, I want to ask the system why it made decisions, so that I can understand and trust results.

#### Acceptance Criteria

1. WHEN viewing results THEN the user SHALL be able to ask "Why did you include paper X?"
2. WHEN viewing results THEN the user SHALL be able to ask "Why do you believe claim Y?"
3. WHEN a "why" question is asked THEN the system SHALL provide traceable explanations with sources
4. WHEN explanations are shown THEN the UI SHALL highlight the relevant evidence

### Requirement 18: Output Format Negotiation

**User Story:** As a user, I want to choose my output format after research completes, so that I get exactly what I need.

#### Acceptance Criteria

1. WHEN research completes THEN the UI SHALL ask which output format the user wants
2. WHEN presenting options THEN the UI SHALL offer: Full report, Executive summary, Technical guide, Literature review, Risk assessment
3. WHEN the user selects a format THEN the system SHALL generate that specific output
4. WHEN the user wants multiple formats THEN the system SHALL allow selecting multiple options

### Requirement 19: Confidence Map Visualization

**User Story:** As a user, I want a visual confidence map in reports, so that I can see which parts are well-supported vs uncertain.

#### Acceptance Criteria

1. WHEN displaying reports THEN the UI SHALL include a confidence map showing support levels per section
2. WHEN displaying confidence THEN the UI SHALL use color coding (green=high, yellow=medium, red=low)
3. WHEN a section has low confidence THEN the UI SHALL show the reasons for uncertainty
4. WHEN clicking on confidence indicators THEN the UI SHALL show supporting source counts and details

### Requirement 20: Surprising Findings Highlight

**User Story:** As a user, I want surprising findings prominently highlighted, so that I don't miss valuable anomalies.

#### Acceptance Criteria

1. WHEN displaying results THEN the UI SHALL prominently highlight findings marked as "surprising"
2. WHEN a finding contradicts common assumptions THEN the UI SHALL show a special indicator
3. WHEN surprising findings exist THEN the UI SHALL include a dedicated "Surprising Findings" section
4. WHEN clicking on a surprising finding THEN the UI SHALL show why it was flagged as surprising
