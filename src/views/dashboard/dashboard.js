import React, { useEffect, useRef, useState } from 'react'
import {
  CCard, CCardBody, CRow, CCol, CFormInput, CButton,
  CTable, CTableHead, CTableBody, CTableRow, CTableHeaderCell, CTableDataCell,
} from '@coreui/react'
import {
  FaClipboardCheck, FaUsers, FaBan, FaSyncAlt,
  FaBell, FaClock, FaFileAlt, FaShieldAlt,
  FaChevronDown, FaCalendarAlt, FaInbox,
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import API from '../../api.js'
import '../../assets/CSS/dashboard.css'

const SEVERITY_CLASS = {
  High: 'severity-high',
  Medium: 'severity-medium',
  Low: 'severity-low',
}

const STATUS_CLASS = {
  Passed: 'severity-low',
  Failed: 'severity-high',
  Suspended: 'severity-medium',
}

const initials = (name = '') =>
  name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()

const toISODate = (d) => d.toISOString().slice(0, 10)

// Reads the logged-in user (written to sessionStorage at login) and returns
// their division, or undefined for ADMIN users so they see every division.
const getCurrentUserDivision = () => {
  try {
    const user = JSON.parse(sessionStorage.getItem('user') || 'null')
    if (!user) return undefined
    return user.userType === 'ADMIN' ? undefined : user.division
  } catch {
    return undefined
  }
}

const PRESETS = [
  { label: 'Today', getRange: () => { const t = new Date(); return [toISODate(t), toISODate(t)] } },
  { label: 'Last 7 Days', getRange: () => { const t = new Date(); const s = new Date(); s.setDate(t.getDate() - 6); return [toISODate(s), toISODate(t)] } },
  { label: 'Last 30 Days', getRange: () => { const t = new Date(); const s = new Date(); s.setDate(t.getDate() - 29); return [toISODate(s), toISODate(t)] } },
  { label: 'This Month', getRange: () => { const t = new Date(); const s = new Date(t.getFullYear(), t.getMonth(), 1); return [toISODate(s), toISODate(t)] } },
]

const Dashboard = () => {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [fromInput, setFromInput] = useState('')
  const [toInput, setToInput] = useState('')
  const [activeRange, setActiveRange] = useState(null) 
  const pickerRef = useRef(null)

  useEffect(() => {
    loadSummary(null, null)
  }, [])

  // Close the picker when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadSummary = async (from, to) => {
    setLoading(true)
    try {
      const division = getCurrentUserDivision()
      const res = await API.get('/Dashboard/summary', { params: { from: from || undefined, to: to || undefined, division } })
      setSummary(res.data)
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const applyPreset = (preset) => {
    const [from, to] = preset.getRange()
    setActiveRange({ from, to, label: preset.label })
    setFromInput(from)
    setToInput(to)
    setPickerOpen(false)
    loadSummary(from, to)
  }

  const applyCustomRange = () => {
    if (!fromInput || !toInput) {
      toast.error('Pick both a start and end date')
      return
    }
    if (fromInput > toInput) {
      toast.error('Start date must be before end date')
      return
    }
    setActiveRange({ from: fromInput, to: toInput, label: null })
    setPickerOpen(false)
    loadSummary(fromInput, toInput)
  }

  const clearRange = () => {
    setActiveRange(null)
    setFromInput('')
    setToInput('')
    setPickerOpen(false)
    loadSummary(null, null)
  }

  if (loading && !summary) {
    return (
      <div className="dashboard-page">
        <CCard className="dashboard-loading-card">
          <CCardBody>Loading assessment data...</CCardBody>
        </CCard>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="dashboard-page">
        <CCard className="dashboard-loading-card">
          <CCardBody>No dashboard data available</CCardBody>
        </CCard>
      </div>
    )
  }

  const { stats, attention, violations, latestResults, dateRangeLabel } = summary

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            <FaShieldAlt className="me-2" />
            Quality Assessment Control Center
          </h1>
          <p className="dashboard-subtitle">Monitor assessments, violations and reassessment requests</p>
        </div>

        <div className="dashboard-daterange-wrap" ref={pickerRef}>
          <button
            type="button"
            className={`dashboard-daterange ${loading ? 'is-loading' : ''}`}
            onClick={() => setPickerOpen(o => !o)}
          >
            <FaCalendarAlt size={13} />
            <span>{dateRangeLabel || 'All Time'}</span>
            <FaChevronDown size={11} />
          </button>

          {pickerOpen && <div className="date-picker-backdrop" onClick={() => setPickerOpen(false)} />}

          {pickerOpen && (
            <div className="date-picker-panel">
              <div className="date-picker-presets">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    className={`preset-btn ${activeRange?.label === p.label ? 'active' : ''}`}
                    onClick={() => applyPreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`preset-btn ${activeRange === null ? 'active' : ''}`}
                  onClick={clearRange}
                >
                  All Time
                </button>
              </div>

              <div className="date-picker-custom">
                <div className="date-picker-row">
                  <div className="date-picker-field">
                    <label>From</label>
                    <CFormInput type="date" size="sm" value={fromInput} onChange={e => setFromInput(e.target.value)} />
                  </div>
                  <div className="date-picker-field">
                    <label>To</label>
                    <CFormInput type="date" size="sm" value={toInput} onChange={e => setToInput(e.target.value)} />
                  </div>
                </div>
                <CButton color="primary" size="sm" className="date-apply-btn" onClick={applyCustomRange}>
                  Apply Custom Range
                </CButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <CRow className="g-3 mb-3">
        <CCol md={3}>
          <StatCard
            icon={<FaClipboardCheck />}
            iconClass="icon-blue"
            label="Active Assessments"
            value={stats.activeAssessments}
            sub="Running assessments"
            subClass="text-blue"
          />
        </CCol>
        <CCol md={3}>
          <StatCard
            icon={<FaUsers />}
            iconClass="icon-green"
            label="Total Candidates"
            value={stats.totalCandidates}
            sub="Across all Assessments"
            subClass="text-green"
          />
        </CCol>
        <CCol md={3}>
          <StatCard
            icon={<FaBan />}
            iconClass="icon-red"
            label="Suspended Candidates"
            value={stats.suspendedCandidates}
            sub="Require immediate review"
            subClass="text-red"
          />
        </CCol>
        <CCol md={3}>
          <StatCard
            icon={<FaSyncAlt />}
            iconClass="icon-orange"
            label="Reassessment Requests"
            value={stats.reassessmentRequests}
            sub="Pending review"
            subClass="text-orange"
          />
        </CCol>
      </CRow>

      {/* Needs Your Attention + Recent Violations (left) / Latest Results (right, full height) */}
      <CRow className="g-3">
        <CCol md={6} className="d-flex flex-column gap-3">
          <CCard className="dashboard-panel">
            <CCardBody>
              <div className="panel-head">
                <h3><FaBell className="text-red me-2" />Needs Your Attention</h3>
                <p>Important actions that require your attention</p>
              </div>
              {attention.length === 0 ? (
                <EmptyState text="Nothing needs your attention right now" />
              ) : (
                attention.map(item => <AttentionRow key={item.key} item={item} />)
              )}
              <a className="view-all-link">View All Pending Actions ›</a>
            </CCardBody>
          </CCard>

          <CCard className="dashboard-panel flex-grow-1">
            <CCardBody>
              <div className="panel-head panel-head--split">
                <div>
                  <h3>Recent Violations</h3>
                  <p>Latest violations detected in assessments</p>
                </div>
                <a>View All</a>
              </div>
              {violations.length === 0 ? (
                <EmptyState text="No violations detected" />
              ) : (
                violations.map(v => <ViolationRow key={v.id} v={v} />)
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={6}>
          <CCard className="dashboard-panel h-100">
            <CCardBody>
              <div className="panel-head panel-head--split">
                <div>
                  <h3>Latest Results</h3>
                  <p>Recent assessment results overview</p>
                </div>
                <a>View All</a>
              </div>
              {latestResults.length === 0 ? (
                <EmptyState text="No results yet" />
              ) : (
                <CTable align="middle" hover responsive className="results-table mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Employee Code</CTableHeaderCell>
                      <CTableHeaderCell>Employee Name</CTableHeaderCell>
                      <CTableHeaderCell>Marks</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {latestResults.map(r => (
                      <CTableRow key={r.id}>
                        <CTableDataCell>{r.employeeCode}</CTableDataCell>
                        <CTableDataCell>{r.employeeName}</CTableDataCell>
                        <CTableDataCell>{r.marksObtained}/{r.marks}</CTableDataCell>
                        <CTableDataCell>
                          <span className={`severity-pill ${STATUS_CLASS[r.status] || 'severity-low'}`}>{r.status}</span>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
              <a className="view-all-link">View All Results ›</a>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}

const EmptyState = ({ text }) => (
  <div className="empty-state">
    <FaInbox size={20} />
    <span>{text}</span>
  </div>
)

const StatCard = ({ icon, iconClass, label, value, sub, subClass }) => (
  <CCard className="stat-card">
    <CCardBody>
      <div className="stat-card-top">
        <div className={`stat-card-icon ${iconClass}`}>{icon}</div>
        <div className="stat-card-label">{label}</div>
      </div>
      <div className="stat-card-value">{value}</div>
      <div className={`stat-card-sub ${subClass}`}>{sub}</div>
    </CCardBody>
  </CCard>
)

const ATTENTION_ICON = {
  reassessment: <FaSyncAlt className="text-orange" />,
  suspended: <FaClock className="text-red" />,
  pending: <FaFileAlt className="text-blue" />,
}
const ATTENTION_ICON_CLASS = {
  reassessment: 'icon-orange',
  suspended: 'icon-red',
  pending: 'icon-blue',
}

const AttentionRow = ({ item }) => (
  <div className="attention-item">
    <div className="attention-item-left">
      <div className={`attention-item-icon ${ATTENTION_ICON_CLASS[item.key] || 'icon-blue'}`}>
        {ATTENTION_ICON[item.key] || <FaFileAlt />}
      </div>
      <div>
        <div className="attention-item-title">{item.title}</div>
        <div className="attention-item-desc">{item.desc}</div>
      </div>
    </div>
    <div className="attention-item-count">{item.count}</div>
  </div>
)

const ViolationRow = ({ v }) => (
  <div className="violation-row">
    <div className="avatar">{initials(v.name)}</div>
    <div className="violation-name">{v.name}</div>
    <div className="violation-type">{v.type}</div>
    <div className="violation-time">{v.time}</div>
    <span className={`severity-pill ${SEVERITY_CLASS[v.severity] || 'severity-low'}`}>{v.severity}</span>
  </div>
)

export default Dashboard
