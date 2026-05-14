'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  Eyebrow, GoldRule, DisplayHeading, PageBackground, PageHeader, BrandButton,
  CornerBracket,
  useIsMobile,
} from '@/lib/brand'

export default function ImportLeads() {
  const isMobile = useIsMobile()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  async function readFile() {
    if (!file) return null
    return await file.text()
  }

  async function runDryRun() {
    setError('')
    setResult(null)
    if (!file) { setError('Pick a CSV first.'); return }
    setBusy(true)
    try {
      const csv = await readFile()
      const res = await fetch('/api/import-leads?dryRun=1', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.reason || 'Dry run failed.')
        setPreview(null)
      } else {
        setPreview(data)
      }
    } catch (err) {
      setError(String(err))
    }
    setBusy(false)
  }

  async function runImport() {
    setError('')
    if (!file) { setError('Pick a CSV first.'); return }
    if (!confirm(`Import ${preview?.to_process || '?'} contacts? This cannot be easily undone.`)) return
    setBusy(true)
    try {
      const csv = await readFile()
      const res = await fetch('/api/import-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.reason || 'Import failed.')
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(String(err))
    }
    setBusy(false)
  }

  function resetAll() {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <PageBackground style={{ minHeight: '100vh' }}>

      <PageHeader
        pageLabel="Import"
        leftSlot={
          <Link href="/calls" style={{ textDecoration: 'none' }}>
            <BrandButton variant="ghost" size="sm">
              {isMobile ? '← Pipeline' : '← Outreach Pipeline'}
            </BrandButton>
          </Link>
        }
      />

      <div style={{
        padding: isMobile ? '20px 14px' : '32px 24px',
        maxWidth: 880, margin: '0 auto',
      }}>

        <div style={{ marginBottom: isMobile ? 18 : 28 }}>
          <Eyebrow style={{ fontSize: 10, letterSpacing: '0.35em', marginBottom: 10 }}>
            One-Time Migration
          </Eyebrow>
          <DisplayHeading size={isMobile ? 30 : 38} style={{ marginBottom: 12 }}>
            Import Contacts
          </DisplayHeading>
          <GoldRule width={40} />
          <p style={{
            fontSize: 11, marginTop: 14, color: BRAND.textMuted,
            fontFamily: FONT_BODY,
            letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600,
          }}>
            Bulk-Import GHL Contacts From CSV Export
          </p>
        </div>

        {/* File picker */}
        <div style={{
          position: 'relative',
          background: BRAND.bgCard,
          border: `1px solid ${BRAND.border}`,
          padding: isMobile ? '20px 16px' : '24px 28px',
          marginBottom: 20,
        }}>
          <CornerBracket position="tl" size={14} />
          <CornerBracket position="tr" size={14} />
          <CornerBracket position="bl" size={14} />
          <CornerBracket position="br" size={14} />

          <Eyebrow style={{ fontSize: 10, letterSpacing: '0.3em', marginBottom: 8 }}>
            Step 1 — Select File
          </Eyebrow>
          <GoldRule width={24} />

          <div style={{
            display: 'flex',
            alignItems: isMobile ? 'stretch' : 'center',
            gap: 12,
            marginTop: 16,
            flexDirection: isMobile ? 'column' : 'row',
          }}>
            <BrandButton variant="ghost" size="md" onClick={() => fileInputRef.current?.click()}>
              📎 {file ? 'Change CSV' : 'Choose CSV'}
            </BrandButton>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={e => {
                setFile(e.target.files?.[0] || null)
                setPreview(null)
                setResult(null)
                setError('')
              }}
              style={{ display: 'none' }}
            />
            {file && (
              <span style={{
                fontSize: 11,
                color: BRAND.textSecondary,
                fontFamily: FONT_BODY,
                letterSpacing: '0.01em',
                flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {file.name} <span style={{ color: BRAND.textDim }}>({(file.size / 1024).toFixed(1)} KB)</span>
              </span>
            )}
          </div>

          {file && (
            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
              <BrandButton variant="primary" size="md" onClick={runDryRun} disabled={busy}>
                {busy ? 'Working…' : 'Preview Import'}
              </BrandButton>
              {preview && (
                <BrandButton variant="solid" size="md" onClick={runImport} disabled={busy}>
                  {busy ? 'Importing…' : `Commit Import (${preview.to_process} rows)`}
                </BrandButton>
              )}
              {(preview || result) && (
                <BrandButton variant="ghost" size="md" onClick={resetAll} disabled={busy}>
                  Reset
                </BrandButton>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(220, 80, 80, 0.08)',
            border: `1px solid rgba(220, 80, 80, 0.4)`,
            color: BRAND.statusDisqualified,
            padding: '14px 16px',
            marginBottom: 20,
            fontSize: 12,
            fontFamily: FONT_BODY,
            letterSpacing: '0.01em',
          }}>
            <strong style={{ letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: 10 }}>
              Error
            </strong>
            <p style={{ marginTop: 6 }}>{error}</p>
          </div>
        )}

        {/* Preview */}
        {preview && !result && (
          <div style={{
            position: 'relative',
            background: BRAND.bgCard,
            border: `1px solid ${BRAND.border}`,
            padding: isMobile ? '20px 16px' : '24px 28px',
            marginBottom: 20,
          }}>
            <CornerBracket position="tl" size={14} />
            <CornerBracket position="tr" size={14} />
            <CornerBracket position="bl" size={14} />
            <CornerBracket position="br" size={14} />

            <Eyebrow style={{ fontSize: 10, letterSpacing: '0.3em', marginBottom: 8 }}>
              Step 2 — Preview
            </Eyebrow>
            <GoldRule width={24} />

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 1,
              marginTop: 18, marginBottom: 18,
              background: BRAND.border,
              border: `1px solid ${BRAND.border}`,
            }}>
              <Stat label="Rows In CSV" value={preview.total} color={BRAND.textSecondary} />
              <Stat label="Ready To Import" value={preview.to_process} color={BRAND.gold} />
              <Stat label="Errors" value={preview.errors?.length || 0} color={preview.errors?.length ? BRAND.statusDisqualified : BRAND.textMuted} />
            </div>

            {preview.errors && preview.errors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Eyebrow color={BRAND.statusDisqualified} style={{ fontSize: 10, letterSpacing: '0.25em', marginBottom: 8 }}>
                  Skipped Rows
                </Eyebrow>
                <div style={{ maxHeight: 160, overflowY: 'auto', fontSize: 11, fontFamily: FONT_BODY, color: BRAND.textMuted }}>
                  {preview.errors.slice(0, 20).map((e, i) => (
                    <div key={i} style={{ padding: '4px 0', borderBottom: `1px dotted ${BRAND.border}` }}>
                      Row {e.row || '?'}: <span style={{ color: BRAND.textSecondary }}>{e.reason}</span>
                      {e.detail && <span style={{ color: BRAND.textDim }}> — {e.detail}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Eyebrow color={BRAND.textSecondary} style={{ fontSize: 10, letterSpacing: '0.25em', marginBottom: 8 }}>
              Sample (First 3 Rows)
            </Eyebrow>
            <div style={{
              background: BRAND.bgInput,
              border: `1px solid ${BRAND.border}`,
              padding: 14,
              fontSize: 11,
              fontFamily: 'monospace',
              color: BRAND.textSecondary,
              whiteSpace: 'pre-wrap',
              maxHeight: 320,
              overflowY: 'auto',
              lineHeight: 1.6,
            }}>
              {JSON.stringify(preview.sample, null, 2)}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{
            position: 'relative',
            background: BRAND.bgCard,
            border: `1px solid ${BRAND.borderGoldStrong}`,
            padding: isMobile ? '20px 16px' : '24px 28px',
            marginBottom: 20,
          }}>
            <CornerBracket position="tl" size={14} />
            <CornerBracket position="tr" size={14} />
            <CornerBracket position="bl" size={14} />
            <CornerBracket position="br" size={14} />

            <Eyebrow color={BRAND.gold} style={{ fontSize: 10, letterSpacing: '0.3em', marginBottom: 8 }}>
              Import Complete
            </Eyebrow>
            <GoldRule width={24} />

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 1,
              marginTop: 18,
              background: BRAND.border,
              border: `1px solid ${BRAND.border}`,
            }}>
              <Stat label="Created" value={result.created} color={BRAND.statusBooked} />
              <Stat label="Updated" value={result.updated} color={BRAND.gold} />
              <Stat label="Skipped" value={result.skipped} color={BRAND.statusDisqualified} />
              <Stat label="Tags Applied" value={result.tags_applied || 0} color={BRAND.statusNew} />
            </div>

            {result.errors && result.errors.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <Eyebrow color={BRAND.statusDisqualified} style={{ fontSize: 10, letterSpacing: '0.25em', marginBottom: 8 }}>
                  Errors ({result.errors.length})
                </Eyebrow>
                <div style={{ maxHeight: 160, overflowY: 'auto', fontSize: 11, fontFamily: FONT_BODY, color: BRAND.textMuted }}>
                  {result.errors.map((e, i) => (
                    <div key={i} style={{ padding: '4px 0', borderBottom: `1px dotted ${BRAND.border}` }}>
                      {e.row && <>Row {e.row}: </>}
                      <span style={{ color: BRAND.textSecondary }}>{e.reason}</span>
                      {e.detail && <span style={{ color: BRAND.textDim }}> — {e.detail}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p style={{
              fontSize: 11, marginTop: 16, color: BRAND.textMuted,
              fontFamily: FONT_BODY, fontStyle: 'italic',
            }}>
              Contacts now live in the leads table. Tags applied as call_logs entries.
            </p>
          </div>
        )}

      </div>
    </PageBackground>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{
      background: BRAND.bgRaised,
      padding: '14px 16px',
      textAlign: 'center',
    }}>
      <p style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 22, fontWeight: 400,
        color, lineHeight: 1,
        letterSpacing: '0.02em',
        fontVariantNumeric: 'tabular-nums',
        margin: 0, marginBottom: 6,
      }}>{value}</p>
      <Eyebrow color={BRAND.textMuted} style={{ fontSize: 8, letterSpacing: '0.25em' }}>
        {label}
      </Eyebrow>
    </div>
  )
}