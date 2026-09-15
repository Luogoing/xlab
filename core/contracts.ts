/** Shared contracts for the local HTTP boundary and workspace snapshots. */
export type RunState='queued'|'planning'|'retrieving'|'analyzing'|'cancelling'|'completed'|'partial'|'failed'|'cancelled'|'interrupted';
export type Provider='codex'|'glm';
export interface Strategy {object_terms:string[];focus_terms:string[];exclude_terms:string[];date_from?:string|null;date_to?:string|null;[key:string]:unknown}
export interface Evidence {evidence_id:string;record_id:string;text:string;field:string;locator:string;checksum:string;source_asset_id?:string|null;source_start?:number|null;source_end?:number|null;independent?:boolean}
export interface PatentRecord {record_id:string;publication_number:string;title:string;applicants:string[];publication_date:string|null;abstract_excerpt:string|null;claims:string|null;description:string|null;evidence:Evidence[];data_mode:string;source_metadata:{raw_sha256?:string;source_run_id?:string;database?:string}|null;[key:string]:unknown}
export interface SearchDraft {topic:string;strategy:Strategy;query:string;manual:boolean;auto_strategy:boolean;database:string;provider:Provider;analyze:boolean}
export interface Query {sq:string;db:string;pn:number;ips:number;sf:string}
export interface SearchRound {run_id:string;attempt_ids?:string[];sequence:number;created_at:string;strategy:Strategy;actual_query?:Query;status:RunState|'archived';stop_reason?:string;api_calls:number;record_ids:string[];candidate_count:number;source_total?:number;source_pages?:number}
export interface ReportSection {id:string;title:string;text:string}
export interface FrozenReport {report_id:string;version:number;created_at:string;markdown:string;sections?:ReportSection[];evidence_ids?:string[];analysis_run_id?:string|null;fingerprint?:string;[key:string]:unknown}
export interface Review {state:'pending'|'adopted'|'rejected';text?:string;at?:string}
export interface AnalysisVersion {run_id:string;model_calls:number;model_analysis:{model:string;raw:unknown;origin?:string;context_fingerprint:string;[key:string]:unknown};[key:string]:unknown}
export interface ResearchProject {
 schema_version:3;project_id:string;title:string;goal:string;revision:number;created_at:string;updated_at:string;
 draft:SearchDraft;records:PatentRecord[];candidates:Array<{record_id:string;publication_number:string;round_ids:string[];[key:string]:unknown}>;
 rounds:SearchRound[];analyses:AnalysisVersion[];reports:FrozenReport[];excluded:string[];notes:Record<string,string>;pins:string[];
 comparison:{record_ids:string[];dimensions:string[];cells:Record<string,string>};reviews:Record<string,Review>;
 report_draft:{title?:string;sections:ReportSection[];legacy_edit?:unknown};evidence_aliases:Record<string,string>;
 source_conflicts:Array<{conflict_id:string;record_id:string;previous:PatentRecord;incoming:PatentRecord;status:string;run_id:string}>;
 run_history:Array<{run_id:string;status:RunState;api_calls:number;model_calls:number;[key:string]:unknown}>;
 review_history:Array<{analysis_run_id:string;reviews:Record<string,Review>}>;last_run:unknown;legacy:unknown;live_preview?:boolean;
}
export interface StartRun {project_id?:string;kind:'strategy'|'search'|'explore'|'analyze'|'collect';provider?:Provider;page?:number;record_ids?:string[];idempotency_key:string;analyze?:boolean}
export interface ApiFailure {error:{code:string;message:string}}
