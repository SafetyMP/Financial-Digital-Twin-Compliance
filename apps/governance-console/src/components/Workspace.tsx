'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { issues as demoIssues, filterIssues, summarize, validateReviews, scenarioImpact, type Review, type Issue } from '../lib/demo';

import { fetchWorkspace, fetchEvidence, fetchReviews, saveReview, verifyLedger } from '../lib/connected';

type View = 'Overview' | 'Review history' | 'Twin explorer' | 'Scenario lab';
const storageKey = 'financial-twin-governance-reviews-v1';
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    shield: <><path d="M12 3 3.5 6v6c0 5 8.5 9 8.5 9s8.5-4 8.5-9V6Z"/><path d="m8 12 3 3 5-6"/></>,
    nodes: <><circle cx="5" cy="12" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8 11 7-4M8 13l7 4"/></>,
    sliders: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    arrow: <><path d="M5 12h14m-5-5 5 5-5 5"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    alert: <><path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3v1"/></>,
    book: <><path d="M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.grid}</svg>;
}
function Badge({ value }: { value: string }) { return <span className={`badge ${value.toLowerCase()}`}>{value === 'Critical' && <span className="dot"/>}{value}</span>; }

export default function Workspace({ mode = 'demo' }: { mode?: 'demo' | 'connected' }) {
  const connected = mode === 'connected';
  const [backendIssues, setBackendIssues] = useState<Issue[]>([]);
  const issues = connected ? backendIssues : demoIssues;
  const [view, setView] = useState<View>('Overview');
  const [selected, setSelected] = useState(connected ? '' : demoIssues[0].id);
  const [tab, setTab] = useState<'Summary' | 'Evidence' | 'Review'>('Summary');
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState<'All'|'Critical'|'Warning'>('All');
  const [status, setStatus] = useState<'All'|'Open'|'Acknowledged'|'Escalated'>('All');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');
  const [guide, setGuide] = useState(false);
  const [reset, setReset] = useState(false);
  const [category, setCategory] = useState<Issue['category']>('Liquidity');
  const [adjustment, setAdjustment] = useState(10);
  const [loading, setLoading] = useState(connected);
  const [loadError, setLoadError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [evidence, setEvidence] = useState<Awaited<ReturnType<typeof fetchEvidence>> | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  const [verification, setVerification] = useState<Awaited<ReturnType<typeof verifyLedger>> | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const pendingRequest = useRef<{ fingerprint: string; requestId: string } | null>(null);
  const loadGeneration = useRef(0);
  const verifyGeneration = useRef(0);
  const detailRef = useRef<HTMLElement>(null);
  const refresh = useCallback(async (offset = 0) => {
    const generation = ++loadGeneration.current;
    setLoading(true); setLoadError('');
    try {
      const result = await fetchWorkspace(offset);
      if (generation !== loadGeneration.current) return;
      setBackendIssues(previous => offset ? [...previous, ...result.issues.filter(i => !previous.some(p => p.id === i.id))] : result.issues);
      setReviews(previous => offset ? [...previous, ...result.reviews].sort((a,b) => Date.parse(b.at) - Date.parse(a.at)) : result.reviews);
      setHasMore(result.hasMore); setNextOffset(result.nextOffset);
    } catch (error) {
      if (generation === loadGeneration.current) setLoadError(error instanceof Error ? error.message : 'Unable to load backend issues.');
    } finally { if (generation === loadGeneration.current) setLoading(false); }
  }, []);
  useEffect(() => {
    if (connected) { void refresh(); return () => { loadGeneration.current++; }; }
    try { setReviews(validateReviews(JSON.parse(localStorage.getItem(storageKey) || '[]'))); }
    catch { setNotice('Saved reviews could not be loaded. You can still explore the demo.'); }
  }, [connected, refresh]);
  const issueStatus = (issue: Issue) => connected ? (issue.backendStatus || 'Unknown') : (reviews.find(r => r.issueId === issue.id)?.status || 'Open');
  const counts = connected ? {
    open: issues.filter(i => issueStatus(i) === 'Open').length,
    critical: issues.filter(i => issueStatus(i) === 'Open' && i.severity === 'Critical').length,
    reviewed: issues.filter(i => ['Acknowledged','Escalated'].includes(issueStatus(i))).length,
  } : summarize(issues, reviews);
  const filtered = connected ? issues.filter(i =>
    (severity === 'All' || i.severity === severity) && (status === 'All' || issueStatus(i) === status) &&
    [i.id,i.title,i.entity,i.rule,i.owner].some(value => value.toLowerCase().includes(query.trim().toLowerCase()))
  ).sort((a,b) => Number(b.severity === 'Critical') - Number(a.severity === 'Critical') || Date.parse(b.detectedAt) - Date.parse(a.detectedAt)) : filterIssues(issues, query, severity, status, reviews);
  const emptyIssue: Issue = { id:'',title:'No issue selected',entity:'',entityType:'',severity:'Unknown',rule:'',category:'Other',observed:'',threshold:'',summary:'',impact:'',owner:'',detectedAt:'',evidence:[] };
  const active = (view === 'Overview' && filtered.length ? (filtered.find(i => i.id === selected) || filtered[0]) : issues.find(i => i.id === selected) || issues[0]) || emptyIssue;
  const currentReview = reviews.find(r => r.issueId === active.id);
  useEffect(() => { setNote(''); setSaveError(''); setVerification(null); setVerifyError(''); setVerifying(false); verifyGeneration.current++; }, [active.id]);
  useEffect(() => {
    if (!connected || !active.id || tab !== 'Evidence') return;
    let cancelled = false;
    setEvidence(null); setEvidenceError(''); setEvidenceLoading(true);
    fetchEvidence(active.id).then(result => { if (!cancelled) setEvidence(result); })
      .catch(error => { if (!cancelled) setEvidenceError(error instanceof Error ? error.message : 'Evidence unavailable.'); })
      .finally(() => { if (!cancelled) setEvidenceLoading(false); });
    return () => { cancelled = true; };
  }, [connected, active.id, active.evidenceRef, tab]);
  const scenario = scenarioImpact(category, adjustment);
  function selectIssue(id: string) { setSelected(id); setTab('Summary'); setNote(''); setNotice(''); if (window.innerWidth < 1100) setTimeout(() => { detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); detailRef.current?.focus({ preventScroll: true }); }, 0); }
  function persist(next: Review[], message: string) { setReviews(next); try { localStorage.setItem(storageKey, JSON.stringify(next)); setNotice(message); } catch { setNotice(`${message} Storage is unavailable; this change lasts only until you leave the page.`); } }
  async function recordReview(nextStatus: Review['status']) {
    if (!active.id || saving || loading || loadError) return;
    if (!connected) {
      const record: Review = { issueId: active.id, status: nextStatus, note: note.trim(), at: new Date().toISOString() };
      persist([record, ...reviews.filter(r => r.issueId !== active.id)], `${active.entity}: ${nextStatus.toLowerCase()} in this browser. The underlying issue remains unresolved.`); setNote(''); return;
    }
    const issueId = active.id;
    const fingerprint = JSON.stringify([issueId,nextStatus,note.trim()]);
    if (pendingRequest.current?.fingerprint !== fingerprint) pendingRequest.current = { fingerprint, requestId: crypto.randomUUID() };
    setSaving(true); setSaveError('');
    try {
      const result = await saveReview(issueId,nextStatus,note.trim(),pendingRequest.current.requestId);
      setBackendIssues(previous => previous.map(i => i.id === issueId ? result.alert : i));
      setReviews(previous => [result.review,...previous.filter(r => r.reviewId !== result.review.reviewId)].sort((a,b)=>Date.parse(b.at) - Date.parse(a.at)));
      setNotice(`Review saved by the alert service as ${result.review.reviewedBy}. The issue remains unresolved; no team notification was sent.`);
      setNote(''); pendingRequest.current = null;
      try { const history = await fetchReviews(issueId); setReviews(previous => [...history,...previous.filter(r=>r.issueId!==issueId)].sort((a,b)=>Date.parse(b.at) - Date.parse(a.at))); }
      catch { setNotice('The review was saved. Refresh to reload the full review history.'); }
    } catch (error) { setSaveError(`${error instanceof Error ? error.message : 'The service did not confirm this review.'} Refresh to check its state, or retry the same action; retries reuse the request ID.`); }
    finally { setSaving(false); }
  }
  async function verify() {
    const generation = ++verifyGeneration.current;
    setVerifying(true); setVerifyError(''); setVerification(null);
    try { const result = await verifyLedger(); if (generation === verifyGeneration.current) setVerification(result); }
    catch(error) { if (generation === verifyGeneration.current) setVerifyError(error instanceof Error ? error.message : 'Verification unavailable.'); }
    finally { if (generation === verifyGeneration.current) setVerifying(false); }
  }
  function exportReviews() {
    const blob = new Blob([JSON.stringify({ demo: !connected, data: connected ? 'Alert-service snapshot and persisted review records; review history is not an immudb ledger' : 'Synthetic fixtures; not verified audit evidence', exportedAt: new Date().toISOString(), scope: connected ? { loadedIssues:issues.length, hasMore } : undefined, issues: issues.map(i => ({ id:i.id, title:i.title, entity:i.entity, rule:i.rule, observed:i.observed, threshold:i.threshold, status:issueStatus(i), evidenceRef:i.evidenceRef })), reviews }, null, 2)], { type:'application/json' });
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=connected?'financial-twin-review.json':'financial-twin-demo-review.json'; a.click(); URL.revokeObjectURL(url); setNotice(connected ? 'Review pack exported for the loaded issues. This is a service snapshot, not a verified ledger export.' : 'Demo review pack exported. It contains synthetic issues and your local review notes.');
  }
  const navigation: [View,string][] = connected ? [['Overview','grid'],['Twin explorer','nodes'],['Review history','clock']] : [['Overview','grid'],['Twin explorer','nodes'],['Scenario lab','sliders'],['Review history','clock']];
  return <div className="workspace">
    <a className="skip-link" href="#main">Skip to workspace</a>
    <aside className="sidebar" aria-label="Workspace navigation">
      <a className="brand" href="#main" onClick={event => { if (saving) event.preventDefault(); else setView('Overview'); }}><span className="brand-mark"><Icon name="nodes" size={25}/></span><span>Financial Twin<small>GOVERNANCE WORKSPACE</small></span></a>
      <div className="institution"><span className="institution-icon">N</span><span>{connected ? "Connected services" : "Northstar Financial"}<small>{connected ? "Development workspace" : "Example institution"}</small></span><span className="tiny-chevron">⌄</span></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{navigation.map(([label, icon]) => <button key={label} disabled={saving} onClick={() => {setSelected(active.id);setView(label);setNotice('');}} className={`nav-item ${view === label ? 'active' : ''}`} aria-current={view === label ? 'page' : undefined}><Icon name={icon}/>{label}{label === 'Overview' && <span className="nav-count">{counts.open}</span>}</button>)}</nav>
      <div className="sidebar-note"><span className="small-icon"><Icon name="shield"/></span><strong>From signal to understanding.</strong><p>Explore the context behind an issue before recording your review.</p><button onClick={() => setGuide(!guide)}>{connected ? "How reviews work" : "How this demo works"} <Icon name="arrow" size={16}/></button></div>
      <div className="sidebar-bottom"><span className="avatar">GP</span><span>Governance professional<small>{connected ? "Service-backed workspace" : "Demo workspace"}</small></span></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{view}</strong></div><div className="top-actions"><span className="demo-pill"><span className="dot"/>{connected ? "Connected development stack" : "Synthetic demo"}</span><button className="icon-button" aria-label="Show demo guide" onClick={() => setGuide(!guide)}><Icon name="book"/></button><span className="avatar light">GP</span></div></header>
      <main id="main" tabIndex={-1}>
        <div className="page-heading"><div><div className="eyebrow">YOUR GOVERNANCE WORKSPACE</div><h1>{view === 'Overview' ? 'See the risk. Understand the why.' : view}</h1><p>{view === 'Overview' ? 'A clear view of what needs attention, with the context to review it.' : view === 'Twin explorer' ? 'Connect an institution, its financial signals, and the issues that need review.' : view === 'Scenario lab' ? 'Explore how a change in assumptions could affect a monitoring threshold.' : 'Keep review decisions and their context in one place.'}</p></div><button className="button secondary" onClick={exportReviews} disabled={saving || (connected && (loading || !!loadError))}><Icon name="download" size={17}/>{connected ? "Export review pack" : "Export demo pack"}</button></div>
        <div className="demo-banner"><span><Icon name="shield" size={17}/><strong>{connected ? "Service-backed review." : "A safe space to explore."}</strong> {connected ? "Notes and decisions are persisted by the alert service. Development access uses a configured reviewer identity." : "All financial data is synthetic. Reviews stay in this browser."}</span><button onClick={() => setGuide(!guide)} aria-expanded={guide}>{connected ? "Review guide" : "Demo guide"} <span>↗</span></button></div>
        {guide && <section className="guide panel"><div><h2>Your first review, in three steps</h2><p>1. Select an issue. 2. Read the cause and evidence. 3. Acknowledge or escalate with a note.</p><p>{connected ? "This workspace reads alerts and linked evidence from the existing services. Reviews are stored in PostgreSQL; they are not immudb audit entries. Verify audit chain explicitly checks the audit service ledger. Connected mode is for a trusted development environment, not public or production access." : "This static demo does not connect to institutions, run Cedar policies, verify an immudb ledger, or submit reports. Review notes are saved on this device; use fictional notes only."}</p></div><button className="button secondary" onClick={() => setGuide(false)}>Close guide</button></section>}
        {connected && <div className="connection-bar" data-testid="connection-status"><span>{loading ? 'Loading backend issues…' : loadError ? 'Backend refresh failed. Displayed records may be stale; review actions are disabled.' : `Connected · ${issues.length} loaded issues${hasMore ? ' · more available' : ''}`}</span><button className="button secondary" disabled={loading || saving} onClick={()=>void refresh()}>Refresh issues</button></div>}
        {loadError && <div className="error-message" role="alert">{loadError} No synthetic data has been substituted.</div>}
        <div className="announcement" role="status" aria-live="polite">{notice}</div>
        {view === 'Overview' && <>
          <section className="metrics" aria-label="Review queue summary">
            <div className="metric"><div className="metric-top">Needs review <span className="metric-icon blue"><Icon name="grid"/></span></div><strong>{counts.open.toString().padStart(2,'0')}</strong><span>{connected ? "Open issues among loaded records" : "Open issues across the demo portfolio"}</span></div>
            <div className="metric"><div className="metric-top">Critical attention <span className="metric-icon red"><Icon name="alert"/></span></div><strong>{counts.critical.toString().padStart(2,'0')} <small>prioritize these</small></strong><span>Open issues above a critical threshold</span></div>
            <div className="metric"><div className="metric-top">Reviews recorded <span className="metric-icon green"><Icon name="check"/></span></div><strong>{counts.reviewed.toString().padStart(2,'0')} <small>of {issues.length} issues</small></strong><span>{connected ? "Acknowledged or escalated in the service" : "Acknowledged or escalated in this browser"}</span></div>
          </section>
          <div className="review-layout">
            <section className="panel queue"><div className="section-heading"><div><h2>Review queue <span className="count">{filtered.length}</span></h2><p>Start with the issues that matter most.</p></div><span className="snapshot">{connected ? "Service snapshot · refresh to update" : "14 Nov 2026 · Snapshot"}</span></div>
              <div className="filters"><label className="search"><Icon name="search" size={17}/><input disabled={saving} aria-label="Search issues" placeholder="Search issues or institutions…" value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="select-label"><span className="sr-only">Severity</span><select disabled={saving} aria-label="Severity" value={severity} onChange={e=>setSeverity(e.target.value as typeof severity)}><option value="All">All severities</option><option>Critical</option><option>Warning</option></select></label><label className="select-label"><span className="sr-only">Review status</span><select disabled={saving} aria-label="Review status" value={status} onChange={e=>setStatus(e.target.value as typeof status)}><option value="All">All statuses</option><option>Open</option><option>Acknowledged</option><option>Escalated</option></select></label></div>
              <div className="queue-labels"><span>ISSUE / INSTITUTION</span><span>PRIORITY</span></div>
              <div className="issue-list">{filtered.map(issue => { const review = reviews.find(r => r.issueId === issue.id); return <button disabled={saving} className={`issue-row ${active.id === issue.id ? 'selected' : ''}`} key={issue.id} onClick={()=>selectIssue(issue.id)} aria-pressed={active.id === issue.id}><span className={`issue-icon ${issue.category.toLowerCase()}`}><Icon name={issue.category === 'Liquidity' ? 'shield' : issue.category === 'Exposure' ? 'nodes' : 'sliders'} size={19}/></span><span className="issue-copy"><strong>{issue.title}</strong><span>{issue.entity}</span><small>{issue.category}<i/> {issueStatus(issue)} <i/> {issue.id}</small></span><span className="issue-right"><Badge value={issue.severity}/><Icon name="arrow" size={17}/></span></button>; })}</div>
              {filtered.length === 0 && <div className="empty"><Icon name="search" size={30}/><h3>{loading ? "Loading issues" : issues.length ? "No matching issues" : "No issues loaded"}</h3><p>{connected && !issues.length ? "Use Refresh issues to retrieve records from the alert service." : "Try another search or clear your filters."}</p><button className="button secondary" onClick={()=>{setQuery('');setSeverity('All');setStatus('All');}}>Clear filters</button></div>}
              <div className="queue-footer"><span>{filtered.length} of {issues.length} {connected ? "loaded issues" : "synthetic issues"}</span><span>Review ≠ resolution</span></div>{connected && hasMore && <div className="load-more"><button className="button secondary" disabled={loading || saving} onClick={()=>void refresh(nextOffset)}>Load more issues</button><p>Search, totals, and exports cover loaded records.</p></div>}
            </section>
            {filtered.length > 0 ? <section className="panel issue-detail" aria-label="Selected issue details" tabIndex={-1} ref={detailRef}>
              <div className="detail-header"><div className="eyebrow">ISSUE BRIEF <span>{active.id}</span></div><h2>{active.title}</h2><p>{active.entity} <span>· {active.entityType}</span></p><div className="badge-row"><Badge value={active.severity}/><Badge value={issueStatus(active)}/></div></div>
              <div className="tabs" role="group" aria-label="Issue sections">{(['Summary','Evidence','Review'] as const).map(t=><button key={t} aria-pressed={tab === t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}{t==='Evidence' && !connected && <span>{active.evidence.length}</span>}</button>)}</div>
              <div className="detail-body">
                {tab === 'Summary' && <><h3>Why this needs attention</h3><p>{active.summary}</p><div className="comparison"><div><span>Observed</span><strong>{active.observed}</strong></div><div><span>Policy threshold</span><strong>{active.threshold}</strong></div></div><h3>What it could mean</h3><p>{active.impact}</p><dl className="metadata"><div><dt>Review owner</dt><dd>{active.owner}</dd></div><div><dt>Monitoring rule</dt><dd>{active.rule}</dd></div><div><dt>Detected (UTC)</dt><dd>{active.detectedAt.replace('T',' ').replace('.000Z','').replace('Z','')}</dd></div></dl><button className="text-button" onClick={()=>setTab('Evidence')}>Follow the evidence <Icon name="arrow" size={16}/></button></>}
                {tab === 'Evidence' && <>
                  {connected ? <>
                    <div className="evidence-note" data-testid="evidence-status">{evidenceLoading ? 'Loading linked audit evidence…' : evidenceError || evidence?.message || 'Evidence not loaded.'}</div>
                    {evidence?.available && <ol className="timeline">{evidence.evidence.map((e,index)=><li key={e.id}><span className="step">{index+1}</span><h3>{e.title}</h3><p>{e.detail}</p><small>{e.source} · {e.time}</small><code>{e.id}</code></li>)}</ol>}
                    {evidence?.entry && <details className="raw-evidence"><summary>Inspect source record</summary><pre>{JSON.stringify(evidence.entry,null,2)}</pre></details>}
                    <button className="button secondary full" disabled={verifying || evidenceLoading || !evidence?.ledgerRecord} onClick={()=>void verify()}>{verifying ? 'Checking audit chain…' : 'Verify audit chain'}</button>
                    <div data-testid="ledger-verification" role="status" className="verification-result">{verifyError || (verification ? `${verification.valid && verification.checkedCount > 0 ? 'Chain check passed' : verification.valid ? 'No ledger entries checked' : 'Chain check failed'} · ${verification.checkedCount} entries checked · ${verification.verifiedAt}. ${verification.message || ''}` : 'Not checked. Loading an entry is not a chain verification.')}</div>
                    <p className="input-help">This service-wide check covers audit entries at the time requested. Review notes are stored separately in PostgreSQL.</p>
                  </> : <>
                    <div className="evidence-note">Illustrative evidence · no live ledger verification</div><ol className="timeline">{active.evidence.map((e,index)=><li key={e.id}><span className="step">{index+1}</span><h3>{e.title}</h3><p>{e.detail}</p><small>{e.source} · {e.time}</small><code>{e.id}</code></li>)}</ol>
                  </>}
                  <button className="button primary full" onClick={()=>setTab('Review')}>Continue to review <Icon name="arrow" size={16}/></button>
                </>}
                {tab === 'Review' && <>
                  <h3>{currentReview ? 'Review recorded' : 'Record your review'}</h3><p>Acknowledge that you have reviewed this issue, or flag it for follow-up. This does not resolve the issue or approve an exception.</p>
                  {currentReview && <div className="saved-review"><Badge value={currentReview.status}/><p>{currentReview.note || 'No note added.'}</p><small>{new Date(currentReview.at).toLocaleString()}{connected && ` · ${currentReview.reviewedBy || 'Reviewer not recorded'}`}</small><p>{connected ? 'Persisted by the alert service. Full records are in Review history.' : 'Saved locally. No team notification was sent.'}</p></div>}
                  {(!currentReview || connected) && <>
                    {currentReview && connected && <h3 className="review-followup">Record a follow-up review</h3>}
                    <label className="note-label" htmlFor="review-note">Review note <span>(optional)</span></label><textarea id="review-note" value={note} disabled={saving} maxLength={2000} onChange={e=>setNote(e.target.value)} placeholder={connected ? 'Document your assessment and follow-up.' : 'What should the next reviewer know? Use fictional details.'} rows={4}/>
                    <small className="input-help">{connected ? 'Saved to the alert service' : 'Saved on this device'} · {note.length}/2000 characters</small>
                    {saveError && <div className="error-message" role="alert">{saveError}</div>}
                    <div className="review-actions"><button className="button primary" disabled={saving || loading || !!loadError} onClick={()=>void recordReview('Acknowledged')}><Icon name="check" size={16}/>{saving ? 'Saving…' : 'Acknowledge'}</button><button className="button secondary" disabled={saving || loading || !!loadError} onClick={()=>void recordReview('Escalated')}>Escalate</button></div>
                  </>}
                </>}
              </div>
              {tab === 'Summary' && <div className="detail-footer"><button className="button primary full" onClick={()=>setTab(currentReview ? 'Review' : 'Evidence')}>{currentReview ? 'View recorded review' : 'Review this issue'}<Icon name="arrow" size={16}/></button><small>Understand the evidence before taking action.</small></div>}
            </section> : <section className="panel empty"><h2>No issue selected</h2><p>{issues.length ? "Clear your filters to choose an issue for review." : "Load an issue from the service to begin a review."}</p></section>}
          </div>
        </>}
        {view === 'Review history' && <section className="panel history"><div className="section-heading"><div><h2>Recorded reviews</h2><p>{connected ? "Persisted review records for loaded issues. Underlying issues remain unresolved." : "Local review decisions. Underlying issues remain unresolved."}</p></div>{!connected && <button className="button secondary" onClick={()=>setReset(true)}>Reset demo</button>}</div>{reset && <div className="reset-box"><p>Clear all {reviews.length} saved reviews and notes from this browser?</p><button className="button primary" onClick={()=>{persist([], 'Demo reset. All issues are open again.');setReset(false);}}>Clear saved reviews</button><button className="button secondary" onClick={()=>setReset(false)}>Keep reviews</button></div>}{reviews.length === 0 ? <div className="empty"><Icon name="clock" size={36}/><h3>Your review history starts here</h3><p>{connected ? "Select an issue and record a review to build its service-backed history." : "Select an issue and record a review to build your local decision trail."}</p><button className="button primary" onClick={()=>setView('Overview')}>Go to review queue</button></div> : reviews.map(r=><article className="history-row" key={r.reviewId || r.issueId}><div><Badge value={r.status}/><h3>{issues.find(i=>i.id===r.issueId)?.title}</h3><p>{r.note || 'No review note added.'}</p><small>{new Date(r.at).toLocaleString()} · {r.issueId} · {connected ? (r.reviewedBy || "Service record") : "Browser only"}</small></div><button className="button secondary" onClick={()=>{setQuery('');setSeverity('All');setStatus('All');selectIssue(r.issueId);setTab('Review');setView('Overview');}}>Open issue <Icon name="arrow" size={16}/></button></article>)}</section>}
        {view === 'Twin explorer' && active.id && <section className="panel explorer"><div className="section-heading"><div><h2>See the connected context</h2><p>{connected ? "Entity and monitoring signal from the selected alert. This is not a graph-service query." : "Illustrative relationships from the selected issue’s synthetic evidence."}</p></div><label>Selected issue<select aria-label="Twin issue" value={selected} onChange={e=>selectIssue(e.target.value)}>{issues.map(i=><option value={i.id} key={i.id}>{i.title} — {i.entity}</option>)}</select></label></div><div className="twin-diagram"><div className="twin-node institution-node"><Icon name="nodes" size={30}/><small>{active.entityType}</small><h3>{active.entity}</h3><span>{connected ? "Alert subject" : "Synthetic entity"}</span></div><div className="connector"><span>observed signal</span><div>→</div></div><div className="twin-node"><Icon name="sliders" size={30}/><small>{active.category}</small><h3>{active.observed}</h3><span>Threshold: {active.threshold}</span></div><div className="connector"><span>triggers review</span><div>→</div></div><div className="twin-node"><Badge value={active.severity}/><h3>{active.title}</h3><span>{active.rule}</span></div></div><div className="explorer-bottom"><p>{active.summary}</p><button className="button primary" onClick={()=>{setQuery('');setSeverity('All');setStatus('All');setView('Overview');setTab('Evidence');}}>Inspect this issue’s evidence <Icon name="arrow" size={16}/></button></div></section>}
        {view === 'Scenario lab' && !connected && <section className="panel scenario"><div className="section-heading"><div><h2>What changes if…</h2><p>Northstar baseline fixtures. A transparent sensitivity calculation; no policy is changed.</p></div><span className="badge open">Sandbox</span></div><div className="scenario-grid"><div><label className="note-label" htmlFor="scenario-type">Choose a signal</label><select id="scenario-type" value={category} onChange={e=>{setCategory(e.target.value as Issue['category']);setAdjustment(10);}}><option>Liquidity</option><option>Exposure</option><option>Payments</option></select><label className="range-label" htmlFor="adjustment">Change in {category === 'Liquidity' ? 'cash outflows' : category === 'Exposure' ? 'exposure notional' : 'payment volume'}<strong>{adjustment > 0 ? '+' : ''}{adjustment}%</strong></label><input id="adjustment" type="range" min="-50" max="50" step="5" value={adjustment} onChange={e=>setAdjustment(Number(e.target.value))}/><div className="range-endpoints"><span>−50%</span><span>No change</span><span>+50%</span></div><button className="text-button" onClick={()=>setAdjustment(0)}>Reset assumption</button><div className="formula"><h3>How this is calculated</h3><p>{scenario.explanation}</p></div></div><div className="scenario-result"><span className="eyebrow">ILLUSTRATIVE OUTCOME</span><div className="scenario-values"><div><span>Baseline</span><strong>{scenario.base.toLocaleString(undefined,{maximumFractionDigits:2})}<small>{scenario.unit}</small></strong></div><Icon name="arrow" size={24}/><div><span>Scenario</span><strong>{scenario.projected.toLocaleString(undefined,{maximumFractionDigits:2})}<small>{scenario.unit}</small></strong></div></div><div className={`outcome ${scenario.breached ? 'breached' : 'within'}`}><Icon name={scenario.breached ? 'alert' : 'check'}/><strong>{scenario.breached ? 'Monitoring threshold breached' : 'Within this illustrative threshold'}</strong></div><p>Threshold: {scenario.limit} {scenario.unit}. This result is a simplified sensitivity, not a forecast or a compliance determination.</p></div></div></section>}
        <footer className="workspace-footer"><span><Icon name="shield" size={14}/> Financial Digital Twin <i/> {connected ? "Connected governance" : "Governance demo"}</span><a href="https://github.com/SafetyMP/Financial-Digital-Twin-Compliance" target="_blank" rel="noreferrer">Explore the project ↗</a></footer>
      </main>
    </div>
  </div>;
}
