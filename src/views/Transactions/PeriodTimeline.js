import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FaCalendarAlt, FaSearch, FaTimes, FaChevronDown } from 'react-icons/fa'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const parseKey = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const fmtDate = (key) =>
  parseKey(key).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtShort = (key) =>
  parseKey(key).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
const fmtMoney = (n) => {
  const v = Number(n || 0)
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

const pKey = (p) => `${p.fromDate}|${p.toDate}`
const monthOf = (p) => parseKey(p.toDate).getMonth()
const yearOf = (p) => parseKey(p.toDate).getFullYear()

/* ============================================================================================
   SEARCHABLE DROPDOWN COMPONENT
   ---------------------------------------------------------------------------------------------
   props:
     value        : current value (number | null)
     options      : [{ value, label, disabled? }]
     placeholder  : e.g. "Year"
     disabled     : bool
     onChange     : (value) => void
   ============================================================================================ */
const SearchableDropdown = ({ value, options, placeholder, disabled, onChange }) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  const current = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  /* Click outside → close */
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  /* Auto-focus input when opened */
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current && inputRef.current.focus(), 20)
    }
    if (!open) setQuery('')
  }, [open])

  const handleSelect = (opt) => {
    if (opt.disabled) return
    onChange(opt.value)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', minWidth: '150px' }}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        title={placeholder}
        style={{
          width: '100%',
          height: '34px',
          padding: '0 30px 0 12px',
          borderRadius: '8px',
          border: open ? '1.5px solid #7c3aed' : '1.5px solid #e2e8f0',
          background: open ? '#f5f3ff' : '#ffffff',
          color: '#5b21b6',
          fontSize: '12.5px',
          fontWeight: 700,
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'border .15s, background .15s',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {current ? current.label : placeholder}
        </span>
        <FaChevronDown
          size={10}
          style={{
            position: 'absolute',
            right: '10px',
            color: '#7c3aed',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .15s',
          }}
        />
      </button>

      {/* Popup */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '38px',
          right: 0,
          zIndex: 100,
          width: 'min(220px, 80vw)',
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 10px 26px rgba(0,0,0,0.16)',
          padding: '8px',
          boxSizing: 'border-box',
        }}>
          {/* Search input */}
          <div style={{ position: 'relative', marginBottom: '6px' }}>
            <FaSearch
              size={11}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${placeholder}...`}
              style={{
                width: '100%',
                height: '32px',
                paddingLeft: '28px',
                paddingRight: query ? '26px' : '8px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                color: '#1f2937',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {query && (
              <FaTimes
                size={10}
                onClick={() => setQuery('')}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', cursor: 'pointer' }}
              />
            )}
          </div>

          {/* Options list */}
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                No matches
              </div>
            ) : filtered.map((o) => {
              const isActive = o.value === value
              return (
                <div
                  key={String(o.value)}
                  onClick={() => handleSelect(o)}
                  title={o.label}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: isActive ? 800 : 500,
                    color: o.disabled ? '#cbd5e1' : (isActive ? '#4c1d95' : '#374151'),
                    background: isActive ? '#ede9fe' : 'transparent',
                    cursor: o.disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => { if (!o.disabled && !isActive) e.currentTarget.style.background = '#f8fafc' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.label}
                  </span>
                  {isActive && <span style={{ color: '#7c3aed', fontSize: '10px' }}>●</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================================================
   PERIOD TIMELINE
   ============================================================================================ */
const PeriodTimeline = ({ periods = [], selectedKey, loading, listLoading, onSelect }) => {
  const disabled = !!(loading || listLoading)

  /* ---- Sorted list (newest first) ---- */
  const sorted = useMemo(
    () => [...periods].sort((a, b) => (a.fromDate < b.fromDate ? 1 : a.fromDate > b.fromDate ? -1 : 0)),
    [periods]
  )

  /* ---- Latest 3 for the tiles ---- */
  const latest3 = useMemo(() => sorted.slice(0, 3), [sorted])

  /* ---- All unique years (newest first) ---- */
  const years = useMemo(
    () => Array.from(new Set(sorted.map(yearOf))).sort((a, b) => b - a),
    [sorted]
  )

  /* ---- Currently selected period ---- */
  const selected = useMemo(
    () => sorted.find((p) => pKey(p) === selectedKey) || null,
    [sorted, selectedKey]
  )

  /* ---- Dropdown state ---- */
  const [year, setYear] = useState(null)
  const [month, setMonth] = useState(null)

  /* ---- Keep dropdowns in sync with the selected period ---- */
  useEffect(() => {
    if (selected) {
      setYear(yearOf(selected))
      setMonth(monthOf(selected))
    } else if (years.length > 0) {
      if (year === null || !years.includes(year)) setYear(years[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, years.length])

  /* ---- Months that actually have data for the selected year ---- */
  const monthMap = useMemo(() => {
    const map = {}
    sorted.filter((p) => yearOf(p) === year).forEach((p) => {
      const m = monthOf(p)
      if (!map[m]) map[m] = p
    })
    return map
  }, [sorted, year])

  /* ---- Dropdown options ---- */
  const yearOptions = useMemo(
    () => years.map((y) => ({ value: y, label: `Year ${y}` })),
    [years]
  )

  const monthOptions = useMemo(
    () => MONTHS_FULL.map((label, i) => ({
      value: i,
      label: monthMap[i] ? label : `${label} (no data)`,
      disabled: !monthMap[i],
    })),
    [monthMap]
  )

  /* ---- Pick ---- */
  const pick = (p) => {
    if (disabled || !p) return
    if (pKey(p) === selectedKey) return
    onSelect(p)
  }

  const handleYearChange = (y) => {
    setYear(y)
    const inYear = sorted.filter((p) => yearOf(p) === y)
    if (inYear.length > 0) {
      setMonth(monthOf(inYear[0]))
      pick(inYear[0])
    } else {
      setMonth(null)
    }
  }

  const handleMonthChange = (m) => {
    setMonth(m)
    const p = monthMap[m]
    if (p) pick(p)
  }

  return (
    <div>
      {/* ===================== HEADER ===================== */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', marginBottom: '14px', flexWrap: 'wrap',
      }}>
        {/* LEFT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <FaCalendarAlt size={15} color="#5b21b6" />
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#1f2937' }}>
            Payroll Periods
          </span>
          <span style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px',
            color: '#5b21b6', background: '#ede9fe',
            borderRadius: '999px', padding: '3px 10px',
          }}>
            Last 3 approved months
          </span>
          {listLoading && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Loading...</span>}
        </div>

        {/* RIGHT: searchable Year + Month */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <SearchableDropdown
            value={year}
            options={yearOptions}
            placeholder="Year"
            disabled={disabled || years.length === 0}
            onChange={handleYearChange}
          />
          <SearchableDropdown
            value={month}
            options={monthOptions}
            placeholder="Month"
            disabled={disabled || years.length === 0}
            onChange={handleMonthChange}
          />
        </div>
      </div>

      {/* ===================== LATEST 3 CARDS ===================== */}
      {latest3.length === 0 ? (
        <div style={{
          padding: '24px', fontSize: '13px', color: '#94a3b8',
          textAlign: 'center', background: '#f8fafc',
          border: '1.5px dashed #e2e8f0', borderRadius: '10px',
        }}>
          {listLoading ? 'Loading periods...' : 'No approved payroll periods yet'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
          {latest3.map((p) => {
            const active = pKey(p) === selectedKey
            const monthLabel = `${MONTHS[monthOf(p)]} ${yearOf(p)}`
            const txn = p.transactionId || '—'
            return (
              <button
                key={pKey(p)}
                type="button"
                onClick={() => pick(p)}
                disabled={disabled}
                title={`${fmtDate(p.fromDate)} – ${fmtDate(p.toDate)}`}
                style={{
                  position: 'relative',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: active ? '2px solid #7c3aed' : '1.5px solid #e2e8f0',
                  background: active
                    ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
                    : '#ffffff',
                  color: '#1f2937',
                  boxShadow: active
                    ? '0 8px 22px rgba(124, 58, 237, 0.22)'
                    : '0 2px 6px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '6px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.18s ease-in-out',
                  textAlign: 'left',
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%',
                }}>
                  <span style={{
                    fontSize: '14.5px', fontWeight: 800,
                    color: '#5b21b6', letterSpacing: '0.2px',
                  }}>
                    {monthLabel}
                  </span>
                  {p.isCurrent && (
                    <span style={{
                      fontSize: '9px', fontWeight: 800, letterSpacing: '0.4px',
                      color: '#fff', background: '#16a34a',
                      borderRadius: '999px', padding: '2px 8px',
                    }}>CURRENT</span>
                  )}
                </div>

                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#6b7280' }}>
                  {fmtShort(p.fromDate)} – {fmtShort(p.toDate)}
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', marginTop: '4px',
                }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>
                    👥 {p.employeeCount ?? 0} employees
                  </span>
                  <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#16a34a' }}>
                    {fmtMoney(p.netTotal)}
                  </span>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  width: '100%', padding: '6px 10px', marginTop: '6px',
                  background: active ? '#ede9fe' : '#f8fafc',
                  border: `1px dashed ${active ? '#c4b5fd' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  fontSize: '10.5px', fontWeight: 700,
                  color: '#5b21b6',
                  overflow: 'hidden',
                }}>
                  <span style={{
                    color: '#94a3b8', fontWeight: 800, fontSize: '10px',
                    letterSpacing: '0.4px', flexShrink: 0,
                  }}>TXN:</span>
                  <span title={txn} style={{
                    fontFamily: 'monospace',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {txn}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ===================== SELECTED PERIOD STRIP ===================== */}
      {selected && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
          marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
          background: '#f8f7fd', border: '1px solid #ece8f8', fontSize: '13px',
        }}>
          <span style={{
            background: selected.isCurrent ? '#6d28d9' : '#f59e0b', color: '#fff', fontWeight: 700,
            fontSize: '10.5px', letterSpacing: '0.4px', borderRadius: '6px', padding: '3px 10px',
          }}>
            {selected.badge || 'SELECTED'}
          </span>
          <b style={{ color: '#1f2937' }}>{fmtDate(selected.fromDate)} – {fmtDate(selected.toDate)}</b>
          <span style={{ color: '#6b7280' }}>
            {selected.employeeCount ?? 0} employees · Net {fmtMoney(selected.netTotal)}
          </span>
          {selected.transactionId && (
            <span style={{
              fontFamily: 'monospace', color: '#5b21b6', fontWeight: 700,
              fontSize: '11.5px', padding: '3px 10px', borderRadius: '6px',
              background: '#ede9fe',
            }}>
              {selected.transactionId}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default PeriodTimeline