# Requirements Document

## Introduction

This feature replaces the current simple search-and-summarize approach with an intelligent research system that actually learns topics before agents form hypotheses. The system uses iterative comprehension with verification, contradiction resolution, and self-testing to build genuine understanding rather than just organizing text.

The key innovation is that agents will research different questions based on their own hypotheses, eliminating duplicate searches and creating evidence-based debates.

## Glossary

- **Foundation Learning**: Multi-round process of building verified understanding of a topic
- **Verified Claim**: A statement extracted from sources with citation and confidence score
- **Open Debate**: A contradiction between sources that remains unresolved
- **Open Question**: A gap in knowledge identified through self-testing
- **Hypothesis**: A testable proposition formed by an agent based on foundation knowledge
- **Evidence Set**: Sources gathered to support or refute a specific hypothesis
- **Concept Map**: Graph of relationships between key concepts in a topic
- **Smart Search Pipeline**: Multi-stage search with query generation and relevance filtering
- **Cheap LLM**: Low-cost model (Gemini Flash) used for filtering, query generation, and distillation
- **Relevance Score**: 1-10 rating of how relevant a paper is to the research topic
- **Document Distillation**: Process of compressing a full document into structured key concepts
- **Distilled Document**: Compressed representation of a paper containing only relevant claims, methods, results, and limitations
- **Specialist Subagent**: A focused agent that analyzes one aspect (methods, risks, integration, or cost)
- **Agent Collaboration Hub**: System for agents to share findings, request research, and challenge claims
- **Broadcast Finding**: A discovery shared with all agents for collective awareness
- **Research Request**: A message asking another agent to investigate a specific question
- **Challenge**: A counter-argument with evidence disputing another agent's claim
- **Source Hierarchy**: Trust order for resolving conflicts: figures/tables > equations > abstract > body text
- **Discrepancy Log**: Record of conflicts between text claims and visual data, including resolution
- **Multimodal Distillation**: Extraction of text, figures, equations, and tables into structured format
- **User Document**: File uploaded by user containing their idea, concept, or research context
- **Pre-Run Analysis**: Processing of user documents to extract components before starting research
- **Cost Estimation**: Predicted cost based on document complexity, component count, and cost tier
- **Query Effectiveness Tracker**: System that records which query patterns yield high-relevance results for future improvement
- **Conditional Claim**: A claim extracted with full context: conditions, method, result, and caveats
- **Distillation Validation**: Second-model review of distillation output to catch critical gaps
- **Lossless Mode**: Passing full content for top-3 most relevant papers without distillation
- **Diminishing Returns Detection**: Tracking improvement delta between iterations to stop early when plateauing
- **Stratified Confidence**: Different confidence thresholds based on topic type (factual vs exploratory)
- **Depth Signaling**: System recognition when it encounters concepts outside its current foundation
- **Steelman**: The strongest possible version of an opposing argument, required before countering
- **Gaps Specialist**: Subagent focused on identifying unexplored approaches, missing comparisons, and untested edge cases
- **Citation Chain Analysis**: Tracing citation networks to find true independent support vs circular references
- **Temporal Knowledge Layering**: Separating foundational concepts from cutting-edge findings
- **Cost Circuit Breaker**: Hard limit that pauses execution when cost exceeds threshold
- **Intervention Point**: Stage where user can modify system decisions mid-run
- **Decision Trace**: Log of reasoning with source references for every significant decision
- **Surprising Finding**: A result that contradicts common assumptions or prior expectations
- **Blind Red Teaming**: Adversarial analysis without knowledge of main conclusions
- **Confidence Checkpoint**: Verification of overall confidence at major phase transitions
- **Field Orientation**: Pre-search phase that learns the vocabulary, key people, and structure of a research field before generating queries
- **Quick Bootstrap**: Fast field orientation (~30 seconds) using top-cited papers and surveys to extract basic vocabulary
- **Deep Bootstrap**: Thorough field orientation (~2-3 minutes) with full survey analysis and comprehensive field mapping
- **Insider Vocabulary**: Technical terms, acronyms, and jargon used by domain experts (vs naive/outsider terminology)
- **Seminal Papers**: Highly-cited foundational works that most papers in the field build upon
- **Field Map**: Structured representation of a research field including sub-fields, key debates, methodology timeline, and influential researchers

## Requirements

### Requirement -1: Field Orientation (Pre-Search Learning)

**User Story:** As a researcher, I want the system to understand a field's vocabulary and structure before searching, so that queries use insider terminology and find relevant work.

#### Acceptance Criteria

1. WHEN a research topic is entered THEN the system SHALL offer two orientation modes: Quick Bootstrap and Deep Bootstrap
2. WHEN Quick Bootstrap is selected THEN the system SHALL complete orientation in under 60 seconds
3. WHEN Deep Bootstrap is selected THEN the system SHALL complete orientation in under 5 minutes
4. WHEN orientation begins THEN the system SHALL first search for survey/review papers on the topic
5. WHEN survey papers are found THEN the system SHALL extract key terminology and acronyms used by domain experts
6. WHEN orientation completes THEN the system SHALL identify 5-10 key researchers/labs in the field
7. WHEN orientation completes THEN the system SHALL identify 3-5 seminal papers that most work builds upon
8. WHEN orientation completes THEN the system SHALL identify major sub-fields or branches of the topic
9. WHEN orientation completes THEN the system SHALL identify key venues (journals, conferences) for the field
10. WHEN generating queries THEN the system SHALL use insider vocabulary instead of naive terminology
11. WHEN the user selects "Skip Orientation" THEN the system SHALL proceed directly to query generation with naive queries
12. WHEN orientation data is available THEN the system SHALL display a "Field Map" preview to the user before proceeding
13. WHEN previous research on similar topics exists THEN the system SHALL offer to reuse relevant orientation data

### Requirement -1.1: Quick Bootstrap Mode

**User Story:** As a researcher doing exploratory work, I want fast orientation that gives me basic field vocabulary without significant delay.

#### Acceptance Criteria

1. WHEN Quick Bootstrap runs THEN the system SHALL query OpenAlex for top 20 cited papers in the topic area
2. WHEN Quick Bootstrap runs THEN the system SHALL query Semantic Scholar for 10 survey/review papers
3. WHEN papers are retrieved THEN the system SHALL extract vocabulary from abstracts only (not full text)
4. WHEN extraction completes THEN the system SHALL use a cheap LLM to identify insider terms, acronyms, and key concepts
5. WHEN Quick Bootstrap completes THEN the system SHALL output a FieldKnowledge object with at minimum: insider_terms, key_venues, sub_fields
6. WHEN Quick Bootstrap fails to find surveys THEN the system SHALL fall back to extracting vocabulary from top-cited paper abstracts

### Requirement -1.2: Deep Bootstrap Mode

**User Story:** As a researcher doing thorough investigation, I want comprehensive field understanding even if it takes longer.

#### Acceptance Criteria

1. WHEN Deep Bootstrap runs THEN the system SHALL first complete Quick Bootstrap steps
2. WHEN surveys are identified THEN the system SHALL attempt to retrieve full text for the top 1-2 surveys
3. WHEN full text is available THEN the system SHALL extract a comprehensive field taxonomy
4. WHEN Deep Bootstrap runs THEN the system SHALL use Semantic Scholar's Recommendations API to find influential papers
5. WHEN Deep Bootstrap runs THEN the system SHALL identify active debates and controversies in the field
6. WHEN Deep Bootstrap runs THEN the system SHALL create a timeline of methodology evolution
7. WHEN Deep Bootstrap completes THEN the system SHALL output an enhanced FieldKnowledge object including: taxonomy, timeline, active_debates, methodology_evolution
8. WHEN Deep Bootstrap exceeds 5 minutes THEN the system SHALL checkpoint progress and offer to continue or proceed with partial orientation

### Requirement -1.3: Orientation-Informed Query Generation

**User Story:** As a researcher, I want queries generated using field knowledge, so that searches find relevant insider content.

#### Acceptance Criteria

1. WHEN generating queries with orientation data THEN the system SHALL replace naive terms with insider vocabulary
2. WHEN generating queries THEN the system SHALL include queries targeting seminal papers' citation networks
3. WHEN generating queries THEN the system SHALL include venue-specific queries for key journals/conferences
4. WHEN generating queries THEN the system SHALL include author-specific queries for key researchers
5. WHEN generating queries THEN the system SHALL generate sub-field-specific queries for each identified branch
6. WHEN comparing query quality THEN oriented queries SHALL have higher average relevance scores than naive queries
7. WHEN orientation identifies acronyms THEN queries SHALL use both the acronym and expanded form

### Requirement 0: Smart Search Pipeline

**User Story:** As a researcher, I want searches to be intelligent and filtered, so that only relevant papers reach expensive analysis.

#### Acceptance Criteria

1. WHEN a search is needed THEN the system SHALL use a cheap LLM to generate multiple specific queries
2. WHEN queries are generated THEN the system SHALL assess query diversity and regenerate if queries are too similar
3. WHEN queries are generated THEN the system SHALL search Semantic Scholar and arXiv (free APIs) as primary sources
4. WHEN academic sources return insufficient results THEN the system SHALL offer Tavily web search as a manual fallback (button press)
5. WHEN results are retrieved THEN the system SHALL use multi-model consensus scoring (2+ models must agree on relevance)
6. WHEN filtering results THEN the system SHALL use adaptive thresholds based on result count (7+ for many results, 5+ for niche topics)
7. WHEN papers are filtered THEN the system SHALL pass only high-relevance papers to the distillation stage
8. WHEN no relevant papers are found THEN the system SHALL regenerate queries with different terms
9. WHEN academic search completes THEN the system SHALL display result count and offer Tavily button if results are insufficient
10. WHEN caching results THEN the system SHALL cache individual query results, not just topic-level results
11. WHEN regenerating queries THEN the system SHALL preserve cached results from previous valid queries
12. WHEN scoring relevance THEN the system SHALL apply source reputation weighting (high-impact journals > preprints)
13. WHEN papers are retrieved THEN the system SHALL cluster by embedding similarity to detect off-topic infiltration
14. WHEN a cluster appears unrelated to expected themes THEN the system SHALL flag it for review or exclusion

### Requirement 0.5: Document Distillation

**User Story:** As a researcher, I want documents compressed to their essential concepts, so that expensive models only process relevant information.

#### Acceptance Criteria

1. WHEN a paper passes relevance filtering THEN the system SHALL distill it using a cheap LLM
2. WHEN distilling a document THEN the system SHALL extract key claims with source quotes
3. WHEN distilling a document THEN the system SHALL extract relevant methods and techniques
4. WHEN distilling a document THEN the system SHALL extract quantitative results and metrics
5. WHEN distilling a document THEN the system SHALL extract stated limitations and caveats
6. WHEN distillation completes THEN the system SHALL output a structured summary under 500 tokens
7. WHEN the original document is under 1000 tokens THEN the system SHALL skip distillation and pass through
8. WHEN distilled documents are ready THEN the system SHALL pass only the distilled versions to expensive LLMs
9. WHEN distillation completes THEN the system SHALL validate that key claims have non-empty supporting quotes
10. WHEN validation fails THEN the system SHALL re-distill with explicit quote extraction instructions
11. WHEN a document exceeds 10000 tokens THEN the system SHALL use chunked distillation (intro, methods, results, discussion)
12. WHEN chunked distillation completes THEN the system SHALL merge section summaries into unified output
13. WHEN distillation completes THEN the system SHALL calculate an information density score (0.0-1.0)
14. WHEN prioritizing papers for deep reading THEN the system SHALL rank by information density score

### Requirement 1: Broad Survey

**User Story:** As a researcher, I want the system to first survey the field broadly, so that it understands the landscape before diving deep.

#### Acceptance Criteria

1. WHEN foundation learning begins THEN the system SHALL search for survey papers and comprehensive reviews on the topic
2. WHEN survey results are retrieved THEN the system SHALL extract main themes, key terminology, and major approaches
3. WHEN themes are identified THEN the system SHALL create an initial concept list with definitions
4. IF no survey papers are found THEN the system SHALL fall back to aggregating multiple introductory sources

### Requirement 2: Deep Dive Per Theme

**User Story:** As a researcher, I want the system to deeply understand each theme, so that knowledge is comprehensive not superficial.

#### Acceptance Criteria

1. WHEN themes are identified THEN the system SHALL perform targeted searches for each theme
2. WHEN reading theme-specific sources THEN the system SHALL extract how the approach works, its tradeoffs, and relevant math
3. WHEN extracting claims THEN the system SHALL verify understanding by cross-referencing with source text
4. WHEN a claim cannot be verified THEN the system SHALL mark it as uncertain and search for clarification

### Requirement 3: Contradiction Resolution

**User Story:** As a researcher, I want the system to identify and resolve contradictions, so that the knowledge base is consistent.

#### Acceptance Criteria

1. WHEN multiple sources are processed THEN the system SHALL identify claims that contradict each other
2. WHEN contradictions are found THEN the system SHALL search for newer papers that may resolve them
3. WHEN a contradiction is resolved THEN the system SHALL update the knowledge base with the resolution
4. WHEN a contradiction cannot be resolved THEN the system SHALL mark it as an "open debate" with both positions

### Requirement 4: Synthesis and Critique

**User Story:** As a researcher, I want the system to synthesize and self-critique its understanding, so that gaps are identified.

#### Acceptance Criteria

1. WHEN deep dives complete THEN the system SHALL write a comprehensive explainer document
2. WHEN the explainer is written THEN a different model SHALL critique it for gaps, oversimplifications, and errors
3. WHEN critique identifies issues THEN the system SHALL perform targeted searches to address them
4. WHEN the explainer is revised THEN the system SHALL re-verify against original sources
5. WHEN confidence remains below 0.6 after 2 critique iterations THEN the system SHALL flag for human review
6. WHEN flagged for human review THEN the system SHALL pause and present specific low-confidence areas to the user

### Requirement 4.5: Knowledge Graph Construction

**User Story:** As a researcher, I want concepts organized as a graph with relationships, so that I can understand dependencies and connections.

#### Acceptance Criteria

1. WHEN concepts are extracted THEN the system SHALL build a knowledge graph with nodes for each concept
2. WHEN building the graph THEN the system SHALL identify relationship types: builds-on, contradicts, extends, requires, enables
3. WHEN a claim depends on another claim THEN the system SHALL create an edge with the dependency type
4. WHEN displaying the knowledge graph THEN the system SHALL show confidence scores on nodes
5. WHEN a foundational claim has low confidence THEN dependent claims SHALL have their confidence reduced (uncertainty propagation)
6. WHEN uncertainty propagates THEN the system SHALL track the propagation path for transparency

### Requirement 5: Self-Testing

**User Story:** As a researcher, I want the system to test its own understanding, so that it knows what it doesn't know.

#### Acceptance Criteria

1. WHEN synthesis completes THEN the system SHALL generate key questions about the topic
2. WHEN answering questions THEN the system SHALL attempt answers without re-reading sources
3. WHEN an answer is uncertain THEN the system SHALL mark it as an "open question"
4. WHEN self-testing completes THEN the system SHALL output a confidence score for overall understanding
5. WHEN overall confidence is below 0.5 THEN the system SHALL recommend additional research or human input

### Requirement 6: Hypothesis Formation

**User Story:** As a researcher, I want agents to form different hypotheses based on foundation knowledge, so that they explore different angles.

#### Acceptance Criteria

1. WHEN foundation learning completes THEN agents SHALL adopt positions dynamically based on evidence strength
2. WHEN forming hypotheses THEN Agent A SHALL explore approaches with strong supporting evidence
3. WHEN forming hypotheses THEN Agent B SHALL explore approaches with notable limitations or risks
4. WHEN forming hypotheses THEN Agent C (Synthesis) SHALL look for ways to combine approaches for novel insights
5. WHEN forming hypotheses THEN each agent SHALL generate specific research questions to test them
6. WHEN hypotheses are formed THEN they SHALL reference specific open questions or debates from foundation knowledge
7. WHEN a hypothesis depends on another hypothesis THEN the system SHALL track the dependency
8. WHEN a hypothesis is disproven THEN dependent hypotheses SHALL be flagged for re-evaluation
9. WHEN evidence strongly contradicts an agent's initial position THEN the agent SHALL update their stance

### Requirement 7: Evidence Gathering

**User Story:** As a researcher, I want agents to gather evidence for their own hypotheses, so that debates are evidence-based.

#### Acceptance Criteria

1. WHEN hypotheses are formed THEN each agent SHALL search for evidence supporting their hypotheses
2. WHEN searching for evidence THEN agents SHALL use their own research questions as queries
3. WHEN evidence is gathered THEN the system SHALL deduplicate across agents by URL
4. WHEN evidence contradicts a hypothesis THEN the agent SHALL note it as counter-evidence

### Requirement 8: Evidence-Based Debate

**User Story:** As a researcher, I want debates to cite specific evidence, so that arguments are substantiated.

#### Acceptance Criteria

1. WHEN agents debate THEN they SHALL cite specific papers and findings from their evidence sets
2. WHEN making a claim THEN agents SHALL reference the source that supports it
3. WHEN countering a claim THEN agents SHALL provide counter-evidence from their sources
4. WHEN no evidence exists for a claim THEN the agent SHALL acknowledge it as speculation

### Requirement 9: Specialist Subagents

**User Story:** As a researcher, I want specialized analysis from domain experts, so that different aspects are thoroughly covered.

#### Acceptance Criteria

1. WHEN foundation learning completes THEN the system SHALL run specialist subagents in parallel
2. WHEN running specialists THEN the system SHALL include Methods, Risks, Integration, and Cost experts
3. WHEN specialists analyze THEN each SHALL focus only on their designated areas
4. WHEN specialist analysis completes THEN the system SHALL synthesize findings into unified output
5. WHEN synthesizing THEN the system SHALL deduplicate findings and attribute concerns to sources

### Requirement 10: Agent Collaboration

**User Story:** As a researcher, I want agents to share findings and challenge each other, so that analysis is more thorough.

#### Acceptance Criteria

1. WHEN an agent discovers a finding THEN the system SHALL apply a relevance filter before broadcasting
2. WHEN filtering broadcasts THEN the system SHALL only share findings with significance score above 0.7
3. WHEN an agent needs specific research THEN the agent SHALL request it from the appropriate specialist
4. WHEN an agent disagrees with a claim THEN the agent SHALL challenge it with counter-evidence
5. WHEN a claim is challenged THEN the original agent SHALL respond with counter-arguments or acknowledgment
6. WHEN a challenge-response exchange completes THEN the system SHALL record the outcome (defended, conceded, unresolved)
7. WHEN multiple agents independently reach similar conclusions THEN the system SHALL track this as a consensus point
8. WHEN consensus is reached THEN the system SHALL increase confidence in that conclusion
9. WHEN agents collaborate THEN the system SHALL track all messages for transparency
10. WHEN an agent exceeds 10 broadcasts per round THEN the system SHALL require higher significance threshold (0.85)

### Requirement 11: Multimodal Document Understanding

**User Story:** As a researcher, I want the system to correctly understand figures, equations, and visual data, so that analysis is based on accurate information.

#### Acceptance Criteria

1. WHEN processing a PDF THEN the system SHALL extract figures, tables, and equations as separate elements
2. WHEN a figure is extracted THEN the system SHALL use a vision model to describe its content and extract key data
3. WHEN an equation is extracted THEN the system SHALL convert it to LaTeX and provide a plain English explanation
4. WHEN text claims conflict with figure/table data THEN the system SHALL use the source hierarchy to resolve
5. WHEN a discrepancy is detected THEN the system SHALL log it with both values and the resolution used
6. WHEN distillation completes THEN the output SHALL include figure images, equation LaTeX, and discrepancy log

### Requirement 12: Source Hierarchy for Conflict Resolution

**User Story:** As a researcher, I want conflicts between text and visuals resolved automatically using a trust hierarchy, so that the most reliable data is used.

#### Acceptance Criteria

1. WHEN resolving conflicts THEN the system SHALL trust sources in this order: figures/tables > equations > abstract > body text
2. WHEN a higher-trust source contradicts a lower-trust source THEN the system SHALL use the higher-trust value
3. WHEN the resolution is made THEN the system SHALL log the original claim, the figure value, and which was used
4. WHEN multiple figures show different values THEN the system SHALL use the most recent or most specific figure


### Requirement 13: User Document Upload and Processing

**User Story:** As a researcher, I want to upload my own documents about my idea, so that the system uses them as primary context for research.

#### Acceptance Criteria

1. WHEN a user uploads a document THEN the system SHALL accept PDF, DOCX, TXT, and MD formats
2. WHEN a document is uploaded THEN the system SHALL process it using multimodal distillation
3. WHEN processing completes THEN the system SHALL extract components, figures, equations, and key concepts
4. WHEN components are extracted THEN the system SHALL use them as the primary research topics
5. WHEN figures are extracted THEN the system SHALL include them in the foundation knowledge
6. WHEN the user uploads multiple documents THEN the system SHALL merge extracted components intelligently

### Requirement 14: Pre-Run Cost Estimation

**User Story:** As a researcher, I want to know the estimated cost before running, so that I can make informed decisions.

#### Acceptance Criteria

1. WHEN documents are processed THEN the system SHALL calculate estimated cost based on complexity
2. WHEN estimating cost THEN the system SHALL consider: number of components, document length, figure count, cost tier
3. WHEN the estimate is ready THEN the system SHALL return min/max cost range
4. WHEN the user selects a different cost tier THEN the system SHALL recalculate the estimate
5. WHEN the estimate exceeds a configurable threshold THEN the system SHALL flag it as "high cost"


### Requirement 15: PDF Report Generation

**User Story:** As a researcher, I want a comprehensive PDF report at the end, so that I have a complete solution document I can share and reference.

#### Acceptance Criteria

1. WHEN a research run completes THEN the system SHALL generate a PDF report
2. WHEN generating the PDF THEN the system SHALL include an executive summary with key findings
3. WHEN generating the PDF THEN the system SHALL include the foundation knowledge explainer
4. WHEN generating the PDF THEN the system SHALL include all agent hypotheses and evidence
5. WHEN generating the PDF THEN the system SHALL include the debate summary with citations
6. WHEN generating the PDF THEN the system SHALL include specialist findings (methods, risks, integration, cost)
7. WHEN generating the report THEN the system SHALL include extracted figures with descriptions
8. WHEN generating the report THEN the system SHALL include a bibliography of all sources cited
9. WHEN generating the report THEN the system SHALL include actionable recommendations
10. WHEN the report is ready THEN the system SHALL save it to the output directory and notify the user
11. WHEN red team findings exist THEN the system SHALL include them with severity ratings
12. WHEN open questions remain THEN the system SHALL list them as "areas for further research"

### Requirement 15.5: Interactive HTML Report (Primary Output)

**User Story:** As a researcher, I want an interactive HTML report as the primary output, so that I can explore findings with collapsible sections and clickable elements.

#### Acceptance Criteria

1. WHEN a research run completes THEN the system SHALL generate an interactive HTML report as the primary output
2. WHEN displaying sections THEN the system SHALL use collapsible/expandable panels for deep dives
3. WHEN displaying citations THEN the system SHALL make them clickable with hover previews
4. WHEN displaying charts THEN the system SHALL use interactive charts (zoom, hover data, filter)
5. WHEN displaying the knowledge graph THEN the system SHALL make it interactive (pan, zoom, click nodes)
6. WHEN the user wants a PDF THEN the system SHALL offer PDF export as a downloadable option
7. WHEN displaying code THEN the system SHALL include copy buttons and syntax highlighting
8. WHEN displaying equations THEN the system SHALL render LaTeX with MathJax for interactivity

### Requirement 15.6: Audience-Specific Executive Summaries

**User Story:** As a researcher, I want executive summaries tailored to different audiences, so that I can share appropriate versions with different stakeholders.

#### Acceptance Criteria

1. WHEN generating executive summary THEN the system SHALL offer three audience options: Technical, Strategic, Educational
2. WHEN "Technical" is selected THEN the summary SHALL focus on implementation details, architecture, and code considerations
3. WHEN "Strategic" is selected THEN the summary SHALL focus on business impact, costs, risks, and recommendations
4. WHEN "Educational" is selected THEN the summary SHALL focus on concepts, explanations, and learning progression
5. WHEN the user switches audience THEN the system SHALL regenerate the summary without re-running research
6. WHEN displaying the report THEN the system SHALL show audience selector at the top

### Requirement 16: Generated Figures and Flowcharts

**User Story:** As a researcher, I want the system to generate original figures and flowcharts, so that complex concepts are visualized clearly.

#### Acceptance Criteria

1. WHEN synthesizing findings THEN the system SHALL generate architecture diagrams using Mermaid or similar
2. WHEN explaining a pipeline THEN the system SHALL create flowcharts showing data flow and processing stages
3. WHEN comparing approaches THEN the system SHALL generate comparison tables and charts
4. WHEN describing system components THEN the system SHALL create component diagrams with relationships
5. WHEN rendering diagrams THEN the system SHALL auto-simplify when complexity exceeds threshold (>20 nodes)
6. WHEN a concept has multiple steps THEN the system SHALL create sequence diagrams or state machines
7. WHEN diagrams are too complex THEN the system SHALL offer "expand" option to show full detail

### Requirement 17: LaTeX Math and Equations

**User Story:** As a researcher, I want mathematical equations properly formatted in LaTeX, so that the technical content is precise and professional.

#### Acceptance Criteria

1. WHEN extracting equations from papers THEN the system SHALL convert them to LaTeX format
2. WHEN generating the PDF THEN the system SHALL render LaTeX equations using proper math typesetting
3. WHEN explaining an equation THEN the system SHALL provide both the LaTeX and plain English explanation
4. WHEN equations are related THEN the system SHALL show derivations step-by-step
5. WHEN variables are used THEN the system SHALL define them in a notation table
6. WHEN the system generates new equations THEN they SHALL follow standard mathematical notation

### Requirement 18: Code Examples and Snippets

**User Story:** As a researcher, I want relevant code examples included, so that I can understand implementation details.

#### Acceptance Criteria

1. WHEN a method is described THEN the system SHALL include pseudocode or real code examples
2. WHEN code is included THEN the system SHALL use syntax highlighting appropriate to the language
3. WHEN algorithms are discussed THEN the system SHALL provide implementation snippets
4. WHEN the PDF is generated THEN code blocks SHALL be properly formatted with line numbers
5. WHEN multiple implementations exist THEN the system SHALL compare them with code examples
6. WHEN code references a paper THEN the system SHALL cite the source

### Requirement 19: Paper Cross-References and Citations

**User Story:** As a researcher, I want proper academic citations and cross-references, so that I can trace findings back to sources.

#### Acceptance Criteria

1. WHEN citing a paper THEN the system SHALL use standard academic citation format (APA/IEEE)
2. WHEN a claim references multiple papers THEN the system SHALL list all supporting sources
3. WHEN papers build on each other THEN the system SHALL show the relationship graph
4. WHEN generating the bibliography THEN the system SHALL include DOI links where available
5. WHEN a figure is from a paper THEN the system SHALL cite the original source
6. WHEN comparing methods THEN the system SHALL create a literature comparison table with citations
7. WHEN the PDF is generated THEN citations SHALL be hyperlinked to the bibliography


### Requirement 20: Research Mode Selection

**User Story:** As a user, I want to choose my research goal upfront, so that the system tailors its output to my needs.

#### Acceptance Criteria

1. WHEN starting a new research run THEN the system SHALL ask the user to select a research mode
2. WHEN presenting modes THEN the system SHALL offer: "Learn" (educational), "Build" (implementation pipeline), "Compare" (method comparison), "Explore" (open-ended discovery)
3. WHEN the user selects a mode THEN the system SHALL adjust the research depth and output format accordingly
4. WHEN "Learn" mode is selected THEN the system SHALL focus on explanations, fundamentals, and concept clarity
5. WHEN "Build" mode is selected THEN the system SHALL focus on implementation details, code, and architecture
6. WHEN "Compare" mode is selected THEN the system SHALL focus on pros/cons, benchmarks, and decision matrices
7. WHEN "Explore" mode is selected THEN the system SHALL cast a wide net and surface unexpected connections

### Requirement 21: Smart Follow-Up Questions

**User Story:** As a user, I want the system to ask relevant follow-up questions, so that the research is tailored to my specific context.

#### Acceptance Criteria

1. WHEN a research topic is entered THEN the system SHALL generate 3-5 clarifying questions
2. WHEN in "Build" mode THEN the system SHALL ask about: target platform, programming language, performance requirements, budget constraints
3. WHEN in "Learn" mode THEN the system SHALL ask about: current knowledge level, specific areas of interest, preferred learning style
4. WHEN in "Compare" mode THEN the system SHALL ask about: comparison criteria, use case priorities, existing constraints
5. WHEN in "Explore" mode THEN the system SHALL ask about: adjacent fields of interest, time horizon, risk tolerance
6. WHEN the user skips questions THEN the system SHALL use sensible defaults
7. WHEN answers are provided THEN the system SHALL use them to filter and prioritize research

### Requirement 22: Context-Aware Output Customization

**User Story:** As a user, I want the final output customized to my research mode, so that I get exactly what I need.

#### Acceptance Criteria

1. WHEN generating PDF in "Learn" mode THEN the system SHALL emphasize tutorials, diagrams, and progressive explanations
2. WHEN generating PDF in "Build" mode THEN the system SHALL emphasize architecture, code, dependencies, and step-by-step implementation
3. WHEN generating PDF in "Compare" mode THEN the system SHALL emphasize comparison tables, decision matrices, and trade-off analysis
4. WHEN generating PDF in "Explore" mode THEN the system SHALL emphasize connections, emerging trends, and research gaps
5. WHEN the user has specified constraints THEN the system SHALL filter recommendations accordingly
6. WHEN the user has specified a platform THEN the system SHALL focus code examples on that platform


### Requirement 23: Query Effectiveness Feedback Loop

**User Story:** As a researcher, I want the system to learn which query patterns work well, so that future searches are more effective.

#### Acceptance Criteria

1. WHEN relevance scoring completes THEN the system SHALL record which query patterns yielded high-relevance results
2. WHEN generating queries for similar topics THEN the system SHALL use historically effective patterns
3. WHEN a query pattern consistently underperforms THEN the system SHALL deprioritize it for future use
4. WHEN tracking effectiveness THEN the system SHALL store pattern → average relevance mappings

### Requirement 24: Conditional Claims Extraction

**User Story:** As a researcher, I want claims extracted with full context, so that I understand the conditions under which they apply.

#### Acceptance Criteria

1. WHEN extracting claims THEN the system SHALL include the format: "Under [conditions], [method] achieved [result] with [caveats]"
2. WHEN a claim lacks context THEN the system SHALL flag it as incomplete
3. WHEN distilling THEN the system SHALL preserve surprising findings that contradict conventional wisdom
4. WHEN distilling THEN the system SHALL extract failure cases and when/why approaches did NOT work
5. WHEN distilling THEN the system SHALL include reproducibility information (exact settings needed to replicate)

### Requirement 25: Distillation Validation Loop

**User Story:** As a researcher, I want distillations validated by a second model, so that critical gaps are caught early.

#### Acceptance Criteria

1. WHEN distillation completes THEN a different cheap model SHALL review it for gaps
2. WHEN the validator identifies critical gaps THEN the system SHALL re-distill with more focus
3. WHEN validation passes THEN the system SHALL proceed with the distillation
4. WHEN the top-3 most relevant papers are identified THEN the system SHALL skip distillation and pass through full content ("lossless mode")

### Requirement 26: Adaptive Iteration with Diminishing Returns

**User Story:** As a researcher, I want the system to stop iterating when improvements plateau, so that time and cost are not wasted.

#### Acceptance Criteria

1. WHEN iterating on foundation learning THEN the system SHALL track confidence delta between iterations
2. WHEN improvement is less than 5% over previous iteration THEN the system SHALL stop early
3. WHEN still improving significantly at max iterations THEN the system SHALL offer extension with user approval
4. WHEN confidence remains low after max iterations THEN the system SHALL surface intervention options

### Requirement 27: Stratified Confidence Thresholds

**User Story:** As a researcher, I want different confidence thresholds for different topic types, so that expectations match the nature of the research.

#### Acceptance Criteria

1. WHEN the topic is factual ("How does X work?") THEN the system SHALL require high confidence (0.7+)
2. WHEN the topic is exploratory ("What are emerging approaches?") THEN the system SHALL tolerate lower confidence (0.5+)
3. WHEN the topic involves cutting-edge research THEN the system SHALL acknowledge inherent uncertainty
4. WHEN displaying results THEN the system SHALL show the confidence threshold used and why

### Requirement 28: Depth Signaling

**User Story:** As a researcher, I want the system to recognize when it's out of its depth, so that gaps are addressed rather than ignored.

#### Acceptance Criteria

1. WHEN papers reference concepts not in the foundation THEN the system SHALL flag for additional foundation building
2. WHEN unfamiliar terminology appears frequently THEN the system SHALL pause and build understanding
3. WHEN the system detects it's out of depth THEN the system SHALL surface this to the user with options
4. WHEN proceeding with gaps THEN the system SHALL explicitly note the limitations

### Requirement 29: Steelman Requirement in Debates

**User Story:** As a researcher, I want agents to steelman opposing positions before countering, so that debates are fair and thorough.

#### Acceptance Criteria

1. WHEN an agent counters another's position THEN the agent SHALL first present the best version of the opposing argument
2. WHEN steelmanning THEN the agent SHALL identify the strongest points of the opposition
3. WHEN a steelman is weak or missing THEN the system SHALL flag the debate round as potentially biased
4. WHEN debates conclude THEN the system SHALL include concessions each agent made

### Requirement 30: Gaps Specialist Subagent

**User Story:** As a researcher, I want a specialist that identifies what's NOT covered, so that blind spots are surfaced.

#### Acceptance Criteria

1. WHEN running specialists THEN the system SHALL include a "Gaps Expert" alongside Methods, Risks, Integration, and Cost
2. WHEN the Gaps Expert analyzes THEN the expert SHALL identify unexplored approaches
3. WHEN the Gaps Expert analyzes THEN the expert SHALL identify missing comparisons that should exist
4. WHEN the Gaps Expert analyzes THEN the expert SHALL identify untested edge cases and research opportunities
5. WHEN synthesizing specialist findings THEN the system SHALL prominently surface gaps

### Requirement 31: Specialist Confidence Weighting

**User Story:** As a researcher, I want specialist findings weighted by confidence and severity, so that critical concerns are prioritized.

#### Acceptance Criteria

1. WHEN synthesizing specialist outputs THEN the system SHALL weight by confidence score
2. WHEN a Risks expert finds major concerns with high confidence THEN those SHALL outweigh lower-confidence suggestions
3. WHEN specialists disagree THEN the system SHALL surface the conflict with confidence levels
4. WHEN displaying findings THEN the system SHALL sort by weighted importance

### Requirement 32: Cross-Specialist Validation

**User Story:** As a researcher, I want specialists to review each other's outputs, so that cross-domain issues are caught.

#### Acceptance Criteria

1. WHEN specialist analysis completes THEN specialists SHALL briefly review each other's outputs
2. WHEN the Methods expert recommends an approach THEN the Risks expert SHALL validate it doesn't have critical flaws
3. WHEN the Cost expert estimates resources THEN the Methods expert SHALL sanity-check technical feasibility
4. WHEN cross-validation finds conflicts THEN the system SHALL surface them prominently

### Requirement 33: Productive Disagreement Metrics

**User Story:** As a researcher, I want to know if disagreements led to insights, so that I can assess debate quality.

#### Acceptance Criteria

1. WHEN agents disagree THEN the system SHALL track whether the disagreement was productive
2. WHEN a disagreement resolves with new evidence THEN the system SHALL mark it as valuable
3. WHEN a disagreement persists with no new evidence THEN the system SHALL mark it as a stalemate
4. WHEN displaying debate results THEN the system SHALL show productive vs unproductive disagreement counts

### Requirement 34: Confidence Visualization in Reports

**User Story:** As a researcher, I want a visual confidence map in reports, so that I can see which parts are well-supported vs uncertain.

#### Acceptance Criteria

1. WHEN generating reports THEN the system SHALL include a confidence map showing support levels per section
2. WHEN displaying confidence THEN the system SHALL use color coding (green=high, yellow=medium, red=low)
3. WHEN a section has low confidence THEN the system SHALL show the reasons for uncertainty
4. WHEN hovering over confidence indicators THEN the system SHALL show supporting source counts

### Requirement 35: Multi-Format Export

**User Story:** As a researcher, I want to export results in multiple formats, so that I can use them in different contexts.

#### Acceptance Criteria

1. WHEN a research run completes THEN the system SHALL offer export to: PDF, Markdown, Jupyter notebook, Slide deck
2. WHEN exporting to Markdown THEN the system SHALL format for documentation systems (Obsidian, Notion)
3. WHEN exporting to Jupyter THEN the system SHALL include executable code cells
4. WHEN exporting to Slides THEN the system SHALL create a presentation-ready summary

### Requirement 36: Iterative Report Refinement

**User Story:** As a researcher, I want to refine specific sections after initial output, so that I can get exactly what I need.

#### Acceptance Criteria

1. WHEN viewing a report THEN the user SHALL be able to request "Go deeper on section X"
2. WHEN viewing a report THEN the user SHALL be able to request "Simplify section Y"
3. WHEN viewing a report THEN the user SHALL be able to request "Add more code examples"
4. WHEN refinement is requested THEN the system SHALL update only the relevant section without re-running full research

### Requirement 37: Mode Blending

**User Story:** As a researcher, I want to blend research modes with weights, so that I can customize the research approach.

#### Acceptance Criteria

1. WHEN selecting research mode THEN the user SHALL be able to specify weights (e.g., "80% Build, 20% Compare")
2. WHEN weights are specified THEN the system SHALL blend mode configurations proportionally
3. WHEN blending modes THEN the system SHALL validate weights sum to 100%
4. WHEN displaying mode selection THEN the system SHALL show both discrete and blended options

### Requirement 38: Citation Chain Analysis

**User Story:** As a researcher, I want citation chains analyzed for independence, so that I can trust the support for claims.

#### Acceptance Criteria

1. WHEN a claim appears well-supported THEN the system SHALL trace citation chains to find true independence
2. WHEN multiple papers cite a claim THEN the system SHALL check if they trace back to one original source
3. WHEN citation chains are circular or self-referential THEN the system SHALL flag this as "citation laundering"
4. WHEN displaying support THEN the system SHALL show independent replication count, not just citation count

### Requirement 39: Temporal Knowledge Layering

**User Story:** As a researcher, I want foundational vs cutting-edge knowledge separated, so that I understand what's established vs emerging.

#### Acceptance Criteria

1. WHEN building foundation THEN the system SHALL separate "foundational concepts" (can use older papers) from "current state of the art" (must use recent)
2. WHEN papers before year X say one thing and papers after say the opposite THEN the system SHALL surface this paradigm shift
3. WHEN identifying themes THEN the system SHALL identify "seminal" papers (high citations, foundational) even if old
4. WHEN displaying knowledge THEN the system SHALL show temporal layers clearly

### Requirement 40: Cost Circuit Breakers

**User Story:** As a researcher, I want hard cost limits, so that I don't accidentally overspend.

#### Acceptance Criteria

1. WHEN a research run exceeds 2x estimated cost THEN the system SHALL pause and ask user to approve continuation
2. WHEN cost approaches the limit THEN the system SHALL warn the user
3. WHEN the user sets a hard budget THEN the system SHALL stop before exceeding it
4. WHEN paused for cost THEN the system SHALL show what has been completed and what remains

### Requirement 41: Progressive Disclosure with Intervention Points

**User Story:** As a researcher, I want to intervene during research, so that I can guide the system when it's off track.

#### Acceptance Criteria

1. WHEN papers are filtered THEN the user SHALL be able to add papers they know about or remove irrelevant ones
2. WHEN themes are identified THEN the user SHALL be able to focus on specific themes or mark some as irrelevant
3. WHEN foundation claims are generated THEN the user SHALL be able to correct known errors
4. WHEN intervention is available THEN the system SHALL show clear options without requiring intervention

### Requirement 42: Decision Trace Logging

**User Story:** As a researcher, I want full observability into why the system reached conclusions, so that I can debug and trust results.

#### Acceptance Criteria

1. WHEN making significant decisions THEN the system SHALL log the reasoning with source references
2. WHEN the system considers and rejects options THEN the system SHALL log what was rejected and why
3. WHEN generating conclusions THEN the system SHALL track which sources had the most influence
4. WHEN the user asks "Why did you..." THEN the system SHALL provide traceable explanations

### Requirement 43: Surprising Findings Detector

**User Story:** As a researcher, I want surprising findings highlighted, so that I don't miss valuable anomalies.

#### Acceptance Criteria

1. WHEN processing papers THEN the system SHALL identify findings that contradict common assumptions
2. WHEN a finding contradicts prior expectations THEN the system SHALL flag it as "surprising"
3. WHEN displaying results THEN the system SHALL prominently highlight surprising findings
4. WHEN surprising findings exist THEN the system SHALL include them in the executive summary

### Requirement 44: Blind Red Teaming

**User Story:** As a researcher, I want the red team to form independent conclusions, so that adversarial analysis is unbiased.

#### Acceptance Criteria

1. WHEN running red team analysis THEN the system SHALL NOT tell the red team agent what the main conclusions are
2. WHEN red teaming THEN the agent SHALL receive evidence and form its own conclusions
3. WHEN red team conclusions differ from main conclusions THEN the system SHALL surface the discrepancy
4. WHEN red teaming THEN the system SHALL use multiple adversarial personas (skeptical expert, regulator, competitor, naïve user)

### Requirement 45: Confidence Checkpoints

**User Story:** As a researcher, I want confidence checked at phase transitions, so that problems are caught early.

#### Acceptance Criteria

1. WHEN transitioning between major phases THEN the system SHALL check overall confidence
2. WHEN confidence is too low at a checkpoint THEN the system SHALL surface options: add sources, narrow scope, or proceed with warnings
3. WHEN proceeding with low confidence THEN the system SHALL explicitly note this in the output
4. WHEN confidence improves significantly THEN the system SHALL note the improvement
