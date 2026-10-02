import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import DataTable from 'react-data-table-component'
import {
  CButton,
  CFormInput,
  CCard,
  CCardBody,
} from '@coreui/react'
import {
  FaUsers, FaCheck, FaClock, FaPause, FaExclamationTriangle,
  FaSearch, FaTimes, FaDownload,
  FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight,
  FaPlusSquare, FaMinusSquare, FaBuilding, FaCalendarAlt, FaUserSlash,
  FaSyncAlt,
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import '../../assets/CSS/user.css'

// Frozen Columns Widths (Col 0 is Checkbox)
const FROZEN_COL_0_WIDTH = 46  // Checkbox Column
const FROZEN_COL_1_WIDTH = 60  // S.No
const FROZEN_COL_NAME_WIDTH = 230 // Employee Name
const FROZEN_COL_VENDOR_WIDTH = 140 // Vendor

const STATUS_COL_W = 110
const NET_W = 130
const COLLAPSED_W = 64
const DETAIL_PANEL_WIDTH = 760

const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL)

/* ========== LOGGED-IN USER (sent to backend for Mdfd_By / Approver) ========== */   // 👈 NEW
// Maker / Checker lo unna same logic. Empty vasthe backend ResolveUser fallback chesthundi.   // 👈 NEW
const getLoggedInUserName = () => {                                                       // 👈 NEW
  try {                                                                                   // 👈 NEW
    const raw = sessionStorage.getItem('user')                                            // 👈 NEW
    const u = raw ? JSON.parse(raw) : null                                                // 👈 NEW
    return (u && (u.userName || u.userId)) || ''                                          // 👈 NEW
  } catch {                                                                               // 👈 NEW
    return ''                                                                             // 👈 NEW
  }                                                                                       // 👈 NEW
}                                                                                         // 👈 NEW

// 👈 CHANGED: old `const CURRENT_USER = window.APP_CONFIG.currentUser || 'System'` removed (adhe SYSTEM ki karanam)

const normSkill = (v) => (v || '').toString().trim().toLowerCase()
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const fmtDate = (val) => {
  if (!val) return null
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const fmtPeriodLabel = (fromVal, toVal) => {
  const from = fromVal ? new Date(fromVal) : null
  const to = toVal ? new Date(toVal) : null
  if (!from || Number.isNaN(from.getTime())) return null
  if (to && !Number.isNaN(to.getTime())) {
    const sameMonth = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()
    if (!sameMonth) return `${fmtDate(fromVal)} – ${fmtDate(toVal)}`
  }
  return from.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

const CATEGORIES = ['CL', 'NAPS']

const CATEGORY_CONFIG = {
  CL: {
    provisions: [
      { key: 'referalBonus', name: 'Referal Bonus', width: '130px' },
      { key: 'splAllow', name: 'Spl Allow', width: '110px' },
      { key: 'kaizen', name: 'Kaizen', width: '100px' },
      { key: 'gpaGmc', name: 'GPA & GMC', width: '120px' },
    ],
    earnings: [
      { key: 'attnBonus', name: 'Attendance Bonus', width: '150px' },
      { key: 'earnedBasicDa', name: 'Earned Basic+DA', width: '160px' },
      { key: 'earnedHra', name: 'Earned HRA', width: '140px' },
      { key: 'otAmount', name: 'Over Time Amount', width: '165px' },
      { key: 'gross', name: 'Gross', width: '110px', style: { fontWeight: 600, color: '#16a34a' } },
      { key: 'pf', name: 'EPF', width: '100px' },
      { key: 'esi', name: 'ESI', width: '100px' },
      { key: 'bonus', name: 'Bonus', width: '100px' },
      { key: 'serChar', name: 'Ser/char', width: '110px' },
      { key: 'lwf', name: 'LWF @40', width: '110px' },
      { key: 'total', name: 'Total', width: '110px', style: { fontWeight: 600, color: '#dc2626' } },
    ],
    deductions: [
      { key: 'hostelDeduction', name: 'Hostel Deduction', width: '160px' },
      { key: 'pf', name: 'PF', width: '100px' },
      { key: 'esi', name: 'ESI', width: '100px' },
    ],
    netName: 'Take Home Salary',
  },
  NAPS: {
    provisions: [
      { key: 'referalBonus', name: 'Referal Bonus', width: '140px' },
      { key: 'kaizen', name: 'Kaizen', width: '110px' },
    ],
    earnings: [
      { key: 'attnBonus', name: 'Attendance Bonus', width: '160px' },
      { key: 'earnedWages', name: 'Earned Wages', width: '145px' },
      { key: 'otEarning', name: 'OT Earning', width: '140px' },
      { key: 'handlingCharge', name: 'Handing Charge', width: '160px' },
    ],
    deductions: [
      { key: 'hostelFee', name: 'Hostel Fee YMIN Deduction', width: '210px' },
    ],
    netName: 'Take Home Salary',
  },
}

const customStyles = {
  rows: { style: { minHeight: '32px', cursor: 'pointer' } },
  headCells: {
    style: {
      justifyContent: 'center', fontSize: '9px', fontWeight: '700',
      paddingTop: '8px', paddingBottom: '8px', paddingLeft: '4px', paddingRight: '4px',
      background: '#f1f4f9', textTransform: 'uppercase', whiteSpace: 'normal',
      overflow: 'visible', textOverflow: 'unset', wordBreak: 'break-word',
      lineHeight: '1.2', minHeight: '40px', display: 'flex', alignItems: 'center',
    },
  },
  cells: {
    style: { justifyContent: 'center', fontSize: '12px', paddingTop: '2px', paddingBottom: '2px' },
  },
}

const SkillCatBadge = ({ skillCat }) => {
  const normalized = normSkill(skillCat)
  const colors = {
    'un skilled': { bg: '#e0f2fe', color: '#0369a1' },
    unskilled: { bg: '#e0f2fe', color: '#0369a1' },
    'semi skilled': { bg: '#fef3c7', color: '#92400e' },
    'semi-skilled': { bg: '#fef3c7', color: '#92400e' },
    'semi skilled level-2': { bg: '#fce7f3', color: '#be185d' },
    skilled: { bg: '#d1fae5', color: '#047857' },
    trainee: { bg: '#fef08a', color: '#78350f' },
    e1: { bg: '#e0e7ff', color: '#4c1d95' },
  }
  if (!skillCat) return <span style={{ color: '#9ca3af' }}>-</span>
  const style = colors[normalized] || { bg: '#f3f4f6', color: '#4b5563' }
  return (
    <span style={{
      background: style.bg, color: style.color, padding: '2px 8px',
      borderRadius: '12px', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap',
    }}>{skillCat}</span>
  )
}

const STATUS = {
  verified: { label: 'Verified', bg: '#5b21b6', Icon: FaCheck },
  approved: { label: 'Approved', bg: '#16a34a', Icon: FaCheck },
  hold: { label: 'Hold', bg: '#f59e0b', Icon: FaPause },
  rejected: { label: 'Rejected', bg: '#ef4444', Icon: FaExclamationTriangle },
  pending: { label: 'Pending', bg: '#94a3b8', Icon: FaClock },
}

const STATUS_TOAST_LABEL = {
  rejected: 'Rejected',
  hold: 'Hold',
  verified: 'Verified',
  approved: 'Approved',
}

const StatusBadge = ({ status }) => {
  const s = STATUS[status] || STATUS.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
      background: s.bg, color: '#fff', whiteSpace: 'nowrap',
    }}>
      <s.Icon size={10} /> {s.label}
    </span>
  )
}

const SummaryPill = ({ label, value, color }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minWidth: '84px', flex: '1 1 84px', padding: '10px 12px', borderRadius: '10px',
    background: '#fff', border: `1.5px solid ${color}33`,
  }}>
    <span style={{ fontSize: '18px', fontWeight: 700, color }}>{value}</span>
    <span style={{
      fontSize: '10px', fontWeight: 600, color: '#6b7280', marginTop: '2px',
      textTransform: 'uppercase', letterSpacing: '0.3px',
    }}>{label}</span>
  </div>
)

const InfoChip = ({ icon: Icon, label, value, subValue }) => (
  <div style={{
    flex: '1 1 160px', minWidth: '150px', padding: '10px 14px',
    background: '#f8f7fc', border: '1px solid #ece8f8', borderRadius: '10px',
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700,
      color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.4px',
    }}>
      {Icon && <Icon size={11} />}
      {label}
    </div>
    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1f2937', marginTop: '4px' }}>
      {value || '-'}
    </div>
    {subValue && (
      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{subValue}</div>
    )}
  </div>
)

const ATT_STYLES = {
  P: { bg: '#16a34a', label: 'Present' },
  HP: { bg: 'linear-gradient(to right, #16a34a 50%, #d1d5db 50%)', label: 'Half Day' },
  A: { bg: '#dc2626', label: 'Absent' },
  PL: { bg: '#dc2626', label: 'Paid Leave (auto-approved, first absent)' },
  OP: { bg: '#f97316', label: 'Out Pending (out-time not updated)' },
  WO: { bg: '#8b5cf6', label: 'Weekly Off' },
  PH: { bg: '#3b82f6', label: 'Public Holiday' },
  PM: { bg: '#f59e0b', label: 'Production Maintenance Leave' },
  RS: { bg: '#7f1d1d', label: 'Resigned (after Date of Leaving) – not counted in payroll' },
}

const ATT_LEGEND = ['P', 'HP', 'A', 'OP', 'WO', 'PH', 'PM', 'RS']

const dayTooltip = (day) => {
  const st = ATT_STYLES[day.status]
  const bits = [st ? st.label : (day.status || 'No data')]
  if (day.holidayName && ['PH', 'PM', 'WO'].includes(day.status)) bits.push(day.holidayName)
  if (day.status !== 'RS') {
    if (day.shiftStart && day.shiftEnd) bits.push(`Shift ${day.shiftStart}-${day.shiftEnd}`)
    if (day.workedHours) bits.push(`Worked ${day.workedHours}`)
    if (Number(day.otHours) > 0) {
      const totalMins = Math.round(Number(day.otHours) * 60)
      const h = Math.floor(totalMins / 60)
      const m = totalMins % 60
      bits.push(`OT ${h}:${m < 10 ? '0' : ''}${m}`)
    }
  }
  return bits.join(' · ')
}

const LegendChip = ({ code }) => {
  const st = ATT_STYLES[code]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px 3px 4px',
      background: '#fff', border: '1px solid #ece8f8', borderRadius: '999px',
      fontSize: '11px', color: '#475569', whiteSpace: 'nowrap',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: '26px', height: '18px', borderRadius: '5px', background: st.bg,
        color: '#fff', fontSize: '10px', fontWeight: 700,
      }}>
        {code === 'RS' ? <FaUserSlash size={10} /> : code}
      </span>
      {st.label.split(' (')[0]}
    </span>
  )
}

const buildApproverRow = (emp) => ({
  id: emp.id,
  empId: emp.employeeId,
  empNm: emp.employeeName,
  skillCat: emp.skillCategory || '',
  vendor: emp.vendor || '',
  leavingDate: emp.leavingDate || '',
  fromDate: emp.fromDate || null,
  toDate: emp.toDate || null,
  provisions: emp.provisions || {},
  earnings: emp.earnings || {},
  deductions: emp.deductions || {},
  netPayable: (emp.netPayable === null || emp.netPayable === undefined) ? 0 : emp.netPayable,
  status: emp.status || 'pending',
  transactionId: emp.transactionId || '',
  version: emp.version || '',
})

const computeGrossAndNet = (detail, category) => {
  if (!detail) return { provisionsTotal: 0, earningsTotal: 0, grossSalary: 0, deductionsTotal: 0, netPayable: 0 }
  const provisionsTotal = Object.values(detail.provisions || {}).reduce((a, b) => a + (Number(b) || 0), 0)

  let earningsTotal = 0
  if (category === 'CL') {
    // In CL, if gross is present, gross represents total contractor earnings (Basic+DA + HRA + Attn + OT)
    if (detail.earnings && detail.earnings.gross !== undefined) {
      earningsTotal = Number(detail.earnings.gross) || 0
    } else {
      earningsTotal = Object.entries(detail.earnings || {})
        .filter(([k]) => !['payDaysFull', 'payDaysHalf', 'gross', 'pf', 'esi', 'bonus', 'serChar', 'lwf', 'total'].includes(k))
        .reduce((a, [, v]) => a + (Number(v) || 0), 0)
    }
  } else {
    // In NAPS, sum monetary earnings only (strictly exclude attendance day counts payDaysFull / payDaysHalf)
    earningsTotal = Object.entries(detail.earnings || {})
      .filter(([k]) => k !== 'payDaysFull' && k !== 'payDaysHalf')
      .reduce((a, [, v]) => a + (Number(v) || 0), 0)
  }

  const deductionsTotal = Object.values(detail.deductions || {}).reduce((a, b) => a + (Number(b) || 0), 0)
  const grossSalary = provisionsTotal + earningsTotal

  // Authoritative Net Payable comes directly from DB (detail.netPayable); fallback to gross - deductions
  const netPayable = (detail.netPayable !== undefined && detail.netPayable !== null && !Number.isNaN(Number(detail.netPayable)))
    ? Number(detail.netPayable)
    : (grossSalary - deductionsTotal)

  return { provisionsTotal, earningsTotal, grossSalary, deductionsTotal, netPayable }
}

const pickNum = (...vals) => {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== '' && !Number.isNaN(Number(v))) return Number(v)
  }
  return null
}

const computePaidDays = (detail) => {
  if (!detail) return 0
  const full = pickNum(
    detail.payDaysFull, detail.PayDaysFull, detail.Pay_Days_Full,
    detail.earnings && detail.earnings.payDaysFull,
  )
  const half = pickNum(
    detail.payDaysHalf, detail.PayDaysHalf, detail.Pay_Days_Half,
    detail.earnings && detail.earnings.payDaysHalf,
  )
  if (full !== null || half !== null) return (full || 0) + (half || 0) * 0.5

  const days = detail.attendanceDetails
  if (Array.isArray(days) && days.length > 0) {
    let paid = 0
    let hasAnyStatus = false
    days.forEach((d) => {
      const st = String(d.status ?? '').trim().toUpperCase()
      if (st) hasAnyStatus = true
      switch (st) {
        case 'P': paid += 1; break
        case 'HP': paid += 0.5; break
        case 'PL': paid += 1; break
        case 'WO': paid += 1; break
        case 'PH': paid += 1; break
        case 'PM': paid += 1; break
        default: break
      }
    })
    if (hasAnyStatus) return paid
  }
  return pickNum(detail.paidDays) || 0
}

const fmtDays = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

// ==================== DETAIL PANEL ====================
const DetailPanel = ({
  detail, loading, category, filteredData, currentDetailIndex,
  onClose, onUpdateStatus, onNavigate, onOpenRow,
}) => {
  const [tab, setTab] = useState('payroll')
  const [remark, setRemark] = useState('')
  const [showRemarks, setShowRemarks] = useState(false)

  useEffect(() => {
    setRemark('')
    setShowRemarks(false)
  }, [detail?.id])

  if (!detail && !loading) return null

  const isRejected = !!detail && detail.status === 'rejected'
  const isApproved = !!detail && detail.status === 'approved'
  const isActioned = isRejected || isApproved

  const handleActionAndNext = async (status) => {
    if (isApproved || (status !== 'rejected' && isActioned)) return
    if (status === 'rejected' && !remark.trim()) {
      toast.error('Remarks required for Reject')
      return
    }
    const success = await onUpdateStatus(detail, status, remark)
    if (!success) return
    setRemark('')
    setShowRemarks(false)
    const newIndex = currentDetailIndex + 1
    if (newIndex < filteredData.length) {
      onOpenRow(filteredData[newIndex], newIndex)
    } else {
      onClose()
    }
  }

  const handleRejectClick = () => {
    if (!showRemarks) {
      setShowRemarks(true)
      return
    }
    if (!remark.trim()) {
      toast.error('Remarks required for Reject')
      return
    }
    handleActionAndNext('rejected')
  }

  const { provisionsTotal, earningsTotal, grossSalary, deductionsTotal, netPayable } = computeGrossAndNet(detail, category)
  const paidDays = computePaidDays(detail)
  const otHours = Number(detail?.otHours) || 0
  const isResigned = !!(detail && (detail.leavingDate || detail.resignedDays > 0))

  const btnBase = (disabled) => ({
    padding: '10px 12px', borderRadius: '8px', fontWeight: 600, fontSize: '12px',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, transition: 'all 0.2s',
  })

  const disabledTooltip = isActioned
    ? `This record is already ${STATUS[detail.status]?.label || detail.status}. Status can't be changed again.`
    : undefined

  const tabStyle = (active) => ({
    background: 'none', border: 'none', padding: '12px 0', fontSize: '13px', fontWeight: 600,
    color: active ? '#5b21b6' : '#9ca3af',
    borderBottom: active ? '2px solid #5b21b6' : 'none',
    cursor: 'pointer', marginBottom: '-2px',
  })

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(15, 15, 25, 0.35)' }}
      />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: `${DETAIL_PANEL_WIDTH}px`, maxWidth: '95vw',
        background: '#fff', boxShadow: '-3px 0 15px rgba(0,0,0,0.15)',
        zIndex: 100, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>Approval Details</h3>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
              Review complete payroll details and verify or reject.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer',
              color: '#6b7280', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '6px',
            }}
            title="Close panel"
          >
            <FaTimes />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>Loading details...</div>
          ) : detail ? (
            <>
              <div style={{
                marginBottom: '16px', padding: '12px', background: '#ede9fe', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>Status</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937', marginTop: '2px' }}>
                    {isActioned ? 'REVIEWED' : 'IN REVIEW'}
                  </div>
                </div>
                <StatusBadge status={detail.status} />
              </div>

              <div style={{ marginBottom: '16px', padding: '16px', background: '#f3f4f6', borderRadius: '10px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%', background: '#5b21b6', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px',
                    flexShrink: 0,
                  }}>
                    {detail.employeeName.charAt(0)}{detail.employeeName.split(' ')[1]?.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>{detail.employeeName}</span>
                      {isResigned && (
                        <span
                          title={detail.leavingDate ? `Date of Leaving: ${fmtDate(detail.leavingDate)}` : 'Resigned'}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '9.5px',
                            fontWeight: 700, color: '#fff', background: '#dc2626', borderRadius: '10px',
                            padding: '1px 8px', lineHeight: '15px',
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                          RESIGNED{detail.leavingDate ? ` · ${fmtDate(detail.leavingDate)}` : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      {detail.employeeId} • {detail.skillCategory || '-'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <InfoChip icon={FaBuilding} label="Vendor / Centre" value={detail.vendor || '-'} />
                  <InfoChip
                    icon={FaCalendarAlt}
                    label="Payroll Period"
                    value={fmtPeriodLabel(detail.fromDate, detail.toDate) || '-'}
                    subValue={detail.fromDate || detail.toDate
                      ? `${fmtDate(detail.fromDate) || '-'} – ${fmtDate(detail.toDate) || '-'}`
                      : undefined}
                  />
                </div>
                <div style={{
                  fontSize: '11px', color: '#6b7280', marginTop: '12px', display: 'flex', gap: '14px',
                  flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px dashed #d1d5db',
                }}>
                  <span>Txn ID: <b style={{ color: '#374151' }}>{detail.transactionId || '-'}</b></span>
                  <span>Version: <b style={{ color: '#374151' }}>{detail.version || '-'}</b></span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>PAID DAYS / TWD</div>
                  <div
                    style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', marginTop: '4px' }}
                    title="Present + Half Day (0.5) + Paid Leave + Week Off + Holidays"
                  >
                    {fmtDays(paidDays)} / {detail.totalWorkingDays || 0}
                  </div>
                </div>
                <div style={{ background: '#fff7ed', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#c2410c', fontWeight: 600 }}>OT HOURS</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#c2410c', marginTop: '4px' }}>
                    {fmtDays(otHours)}
                  </div>
                </div>
                <div style={{ background: '#dbeafe', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600 }}>NET PAYABLE</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0369a1', marginTop: '4px' }}>
                    {money(netPayable)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
                <button onClick={() => setTab('payroll')} style={tabStyle(tab === 'payroll')}>
                  Payroll Details
                </button>
                <button onClick={() => setTab('attendance')} style={{ ...tabStyle(tab === 'attendance'), marginLeft: '16px' }}>
                  Attendance Details
                </button>
              </div>

              {tab === 'payroll' && (
                <>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: Object.keys(detail.provisions || {}).length > 0 ? '1fr 1fr 1fr' : '1fr 1fr',
                    gap: '10px', marginBottom: '16px',
                  }}>
                    {Object.keys(detail.provisions || {}).length > 0 && (
                      <div style={{ background: '#fef9e6', padding: '12px', borderRadius: '8px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                          <div style={{ width: '10px', height: '10px', background: '#b91c1c', borderRadius: '50%' }} />
                          <div style={{ fontWeight: 600, fontSize: '11px', color: '#b91c1c' }}>Variable Inputs</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '10.5px' }}>
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', fontWeight: 500,
                            paddingBottom: '5px', borderBottom: '1px solid #fde68a',
                          }}>
                            <span style={{ color: '#6b7280' }}>ITEM</span>
                            <span style={{ color: '#6b7280' }}>₹</span>
                          </div>
                          {Object.entries(detail.provisions).map(([key, val]) => (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                              <span style={{
                                color: '#6b7280', textTransform: 'capitalize',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>{key}</span>
                              <span style={{ fontWeight: 600, color: '#1f2937', flexShrink: 0 }}>{money(val || 0)}</span>
                            </div>
                          ))}
                          <div style={{
                            borderTop: '1px solid #fde68a', marginTop: '6px', paddingTop: '6px',
                            display: 'flex', justifyContent: 'space-between', fontSize: '11px',
                            fontWeight: 700, color: '#b91c1c',
                          }}>
                            <span>Total</span>
                            <span>{money(provisionsTotal)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <div style={{ width: '10px', height: '10px', background: '#16a34a', borderRadius: '50%' }} />
                        <div style={{ fontWeight: 600, fontSize: '11px', color: '#16a34a' }}>Earnings</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '10.5px' }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', fontWeight: 500,
                          paddingBottom: '5px', borderBottom: '1px solid #d1fae5',
                        }}>
                          <span style={{ color: '#6b7280' }}>ITEM</span>
                          <span style={{ color: '#6b7280' }}>₹</span>
                        </div>
                        {Object.entries(detail.earnings || {})
                          .filter(([key]) => key !== 'payDaysFull' && key !== 'payDaysHalf')
                          .map(([key, val]) => (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                              <span style={{
                                color: '#6b7280', textTransform: 'capitalize',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>{key}</span>
                              <span style={{ fontWeight: 600, color: '#1f2937', flexShrink: 0 }}>{money(val || 0)}</span>
                            </div>
                          ))}
                        <div style={{
                          borderTop: '1px solid #d1fae5', marginTop: '6px', paddingTop: '6px',
                          display: 'flex', justifyContent: 'space-between', fontSize: '11px',
                          fontWeight: 700, color: '#16a34a',
                        }}>
                          <span>Gross</span>
                          <span>{money(grossSalary)}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <div style={{ width: '10px', height: '10px', background: '#dc2626', borderRadius: '50%' }} />
                        <div style={{ fontWeight: 600, fontSize: '11px', color: '#dc2626' }}>Deductions</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '10.5px' }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', fontWeight: 500,
                          paddingBottom: '5px', borderBottom: '1px solid #fecaca',
                        }}>
                          <span style={{ color: '#6b7280' }}>ITEM</span>
                          <span style={{ color: '#6b7280' }}>₹</span>
                        </div>
                        {Object.entries(detail.deductions || {}).map(([key, val]) => (
                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                            <span style={{
                              color: '#6b7280', textTransform: 'capitalize',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{key}</span>
                            <span style={{ fontWeight: 600, color: '#1f2937', flexShrink: 0 }}>{money(val || 0)}</span>
                          </div>
                        ))}
                        {Object.keys(detail.deductions || {}).length === 0 && (
                          <div style={{ color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>No deductions</div>
                        )}
                        <div style={{
                          borderTop: '1px solid #fecaca', marginTop: '6px', paddingTop: '6px',
                          display: 'flex', justifyContent: 'space-between', fontSize: '11px',
                          fontWeight: 700, color: '#dc2626',
                        }}>
                          <span>Total</span>
                          <span>{money(deductionsTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#dbeafe', color: '#1e3a8a', padding: '16px', borderRadius: '10px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>Net Payable (Take Home)</div>
                      <div style={{ fontSize: '22px', fontWeight: 700 }}>{money(netPayable)}</div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#3730a3', marginTop: '6px', opacity: 0.85 }}>
                      {money(provisionsTotal)} (Variable Inputs) + {money(earningsTotal)} (Earnings) − {money(deductionsTotal)} (Deductions) = {money(netPayable)}
                    </div>
                  </div>
                </>
              )}

              {tab === 'attendance' && (
                <div style={{ padding: '14px', background: '#fafafa', borderRadius: '10px' }}>
                  {detail.attendanceDetails && detail.attendanceDetails.length > 0 ? (
                    <>
                      <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px', color: '#1f2937' }}>
                        Attendance Register
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                        {ATT_LEGEND.map((c) => <LegendChip key={c} code={c} />)}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '16px' }}>
                        {detail.attendanceDetails.map((day) => {
                          const st = ATT_STYLES[day.status] || { bg: '#e5e7eb' }
                          const hasOt = Number(day.otHours) > 0
                          return (
                            <div
                              key={day.attendanceDate}
                              title={dayTooltip(day)}
                              style={{
                                width: '100%', aspectRatio: '1', display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: '2px',
                                borderRadius: '6px', color: day.status ? '#fff' : '#6b7280',
                                background: st.bg, position: 'relative', lineHeight: 1.1,
                              }}
                            >
                              <span style={{ fontSize: '11px', fontWeight: 700 }}>{day.day}</span>
                              {day.status === 'RS'
                                ? <FaUserSlash size={11} />
                                : <span style={{ fontSize: '9px', fontWeight: 700, opacity: 0.95 }}>{day.status || '-'}</span>}
                              {hasOt && (
                                <span style={{
                                  position: 'absolute', top: '2px', right: '3px', fontSize: '8px', fontWeight: 800,
                                  background: '#fff', color: '#c2410c', borderRadius: '4px', padding: '0 3px',
                                }}>
                                  OT
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '10px', color: '#1f2937' }}>
                        Attendance Summary
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        <SummaryPill label="Present" value={detail.presentDays || 0} color="#16a34a" />
                        <SummaryPill label="Half Day" value={detail.halfDays || 0} color="#f59e0b" />
                        <SummaryPill label="Absent" value={detail.absentDays || 0} color="#dc2626" />
                        <SummaryPill label="LOP" value={detail.lop || 0} color="#b91c1c" />
                        <SummaryPill label="Week Off" value={detail.weeklyOff || 0} color="#8b5cf6" />
                        <SummaryPill label="Holiday" value={detail.holidays || 0} color="#3b82f6" />
                        {(detail.resignedDays || 0) > 0 && (
                          <SummaryPill label="Resigned" value={detail.resignedDays} color="#7f1d1d" />
                        )}
                        <SummaryPill label="OT Hrs" value={fmtDays(otHours)} color="#ea580c" />
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                      No attendance records found for this period
                    </div>
                  )}
                </div>
              )}

              {showRemarks && (
                <div style={{ marginTop: '24px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#1f2937', marginBottom: '4px', display: 'block' }}>
                    Remarks <span style={{ fontWeight: 400, color: '#9ca3af' }}>(required for Reject)</span>
                  </label>
                  <textarea
                    value={remark}
                    onChange={(e) => setRemark(e.target.value.slice(0, 500))}
                    placeholder="Enter remarks here..."
                    maxLength={500}
                    autoFocus
                    style={{
                      width: '100%', minHeight: '80px', padding: '10px', border: '1px solid #e5e7eb',
                      borderRadius: '8px', fontSize: '12px', fontFamily: 'inherit', resize: 'none',
                      boxSizing: 'border-box', background: '#fff',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'right', marginTop: '4px' }}>
                    {remark.length}/500
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {detail && !loading && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid #e5e7eb', background: '#fafafa',
            flexShrink: 0, position: 'sticky', bottom: 0, zIndex: 10,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <button
                onClick={handleRejectClick}
                disabled={isApproved}
                title={isApproved ? disabledTooltip : undefined}
                style={{
                  ...btnBase(isApproved),
                  background: '#fff', color: '#dc2626', border: '1.5px solid #dc2626',
                }}
              >
                {showRemarks ? '⚠️ Confirm Reject' : '⚠️ Reject & Next'}
              </button>
              <button
                onClick={() => handleActionAndNext('hold')}
                disabled={isActioned}
                title={disabledTooltip}
                style={{
                  ...btnBase(isActioned),
                  background: '#fff', color: '#f59e0b', border: '1.5px solid #f59e0b',
                }}
              >
                ⏸ Hold &amp; Next
              </button>
              <button
                onClick={() => handleActionAndNext('verified')}
                disabled={isActioned}
                title={disabledTooltip}
                style={{
                  ...btnBase(isActioned),
                  background: isActioned ? '#9ca3af' : '#5b21b6',
                  color: '#fff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <FaCheck size={12} /> Verified &amp; Next
              </button>
            </div>
            <button
              onClick={() => onNavigate(-1)}
              disabled={currentDetailIndex === 0}
              style={{
                width: '100%', padding: '10px', background: '#f3f4f6', color: '#1f2937',
                border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, fontSize: '12px',
                cursor: currentDetailIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: currentDetailIndex === 0 ? 0.6 : 1,
              }}
            >
              ← Previous
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ==================== MAIN COMPONENT ====================
const PayrollApprover = () => {
  const [payrollData, setPayrollData] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('CL')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isTableScrolled, setIsTableScrolled] = useState(false)
  const [collapsed, setCollapsed] = useState({})
  const [containerWidth, setContainerWidth] = useState(0)
  const [detailPanel, setDetailPanel] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [currentDetailIndex, setCurrentDetailIndex] = useState(0)
  const [approving, setApproving] = useState(false)
  const [activeCardFilter, setActiveCardFilter] = useState('ALL')

  // Selected row IDs for Checkboxes (ONLY verified records allowed)
  const [selectedRowIds, setSelectedRowIds] = useState([])

  const tableScrollRef = useRef(null)
  const detailRequestId = useRef(0)
  const toggleGroup = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))

  const handleCardClick = (filterValue) => {
    if (!filterValue) return
    setActiveCardFilter((prev) => (prev === filterValue ? 'ALL' : filterValue))
    setCurrentPage(1)
  }

  const loadDetailPanel = async (row, index) => {
    const requestId = ++detailRequestId.current
    setDetailLoading(true)
    setCurrentDetailIndex(index)
    if (index !== undefined && index >= 0) {
      const targetPage = Math.floor(index / (rowsPerPage === 'All' ? (filtered.length || 1) : rowsPerPage)) + 1
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage)
      }
    }
    setDetailPanel((prev) => (prev ? { ...prev, id: row.id, employeeId: row.empId, empId: row.empId, employeeName: row.empNm } : row))
    try {
      const res = await fetch(
        `${API_BASE_URL}/PayrollApprover/approver/${row.id}?empId=${encodeURIComponent(row.empId)}&category=${encodeURIComponent(category)}`
      )
      if (!res.ok) throw new Error('Failed to load detail')
      const data = await res.json()
      if (requestId === detailRequestId.current) setDetailPanel(data)
    } catch (err) {
      console.error(err)
      if (requestId === detailRequestId.current) toast.error('Failed to load detail')
    } finally {
      if (requestId === detailRequestId.current) setDetailLoading(false)
    }
  }

  const navigateDetail = (direction) => {
    const newIndex = currentDetailIndex + direction
    if (newIndex >= 0 && newIndex < filtered.length) {
      const targetPage = Math.floor(newIndex / (rowsPerPage === 'All' ? filtered.length : rowsPerPage)) + 1
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage)
      }
      loadDetailPanel(filtered[newIndex], newIndex)
    }
  }

  const loadPayroll = useCallback(async () => {
    setLoading(true)
    setPayrollData([])
    setSelectedRowIds([])
    try {
      const res = await fetch(`${API_BASE_URL}/PayrollApprover/approver?category=${encodeURIComponent(category)}`)
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data = await res.json()
      setPayrollData((data.employees || []).map(buildApproverRow))
    } catch (err) {
      console.error(err)
      toast.error('Failed to load payroll records for approval')
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    loadPayroll()
  }, [loadPayroll])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setCurrentPage(1)
    setActiveCardFilter('ALL')
  }, [category])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, rowsPerPage])

  useEffect(() => {
    const el = tableScrollRef.current
    if (!el) return
    const onScroll = (e) => setIsTableScrolled(e.target.scrollLeft > 0)
    el.addEventListener('scroll', onScroll, true)
    return () => el.removeEventListener('scroll', onScroll, true)
  }, [])

  useEffect(() => {
    const el = tableScrollRef.current
    if (!el) return
    const update = () => setContainerWidth(Math.floor(el.clientWidth))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!detailPanel) return
    const rows = tableScrollRef.current?.querySelectorAll('.rdt_TableRow')
    const pageIndex = currentDetailIndex % (rowsPerPage === 'All' ? 999999 : rowsPerPage)
    const rowEl = rows && rows[pageIndex]
    if (rowEl) rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentDetailIndex, detailPanel, rowsPerPage])

  const filtered = useMemo(() => {
    let rows = payrollData

    if (activeCardFilter === 'approved') {
      rows = rows.filter((p) => p.status === 'approved')
    } else if (activeCardFilter === 'verified') {
      rows = rows.filter((p) => p.status === 'verified')
    } else if (activeCardFilter === 'pending') {
      rows = rows.filter((p) => p.status === 'pending')
    } else if (activeCardFilter === 'hold') {
      rows = rows.filter((p) => p.status === 'hold')
    } else if (activeCardFilter === 'rejected') {
      rows = rows.filter((p) => p.status === 'rejected')
    }

    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(
      (p) => p.empId.toLowerCase().includes(q) || p.empNm.toLowerCase().includes(q)
    )
  }, [payrollData, search, activeCardFilter])

  const effectiveRowsPerPage = rowsPerPage === 'All' ? (filtered.length || 1) : rowsPerPage
  const totalRows = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalRows / effectiveRowsPerPage))
  const startIndex = (currentPage - 1) * effectiveRowsPerPage
  const endIndex = Math.min(startIndex + effectiveRowsPerPage, totalRows)
  const paginatedData = useMemo(() => filtered.slice(startIndex, endIndex), [filtered, startIndex, endIndex])

  const counts = useMemo(() => {
    const c = { approved: 0, verified: 0, pending: 0, hold: 0, rejected: 0 }
    payrollData.forEach((p) => { c[p.status] = (c[p.status] || 0) + 1 })
    return c
  }, [payrollData])

  const period = useMemo(() => {
    const row = payrollData.find((p) => p.fromDate && p.toDate)
    return row ? { fromDate: row.fromDate, toDate: row.toDate } : null
  }, [payrollData])

  const summaryCards = [
    { label: 'Total Employees', value: payrollData.length, icon: FaUsers, bg: '#e9edfd', fg: '#4e73df', filterValue: 'ALL' },
    { label: 'Verified', value: counts.verified, icon: FaCheck, bg: '#f3e8ff', fg: '#7c3aed', filterValue: 'verified' },
    { label: 'Approved', value: counts.approved, icon: FaCheck, bg: '#e3f6ea', fg: '#16a34a', filterValue: 'approved' },
    { label: 'Pending', value: counts.pending, icon: FaClock, bg: '#eef0f5', fg: '#64748b', filterValue: 'pending' },
    { label: 'Hold', value: counts.hold, icon: FaPause, bg: '#fef3e2', fg: '#f59e0b', filterValue: 'hold' },
    { label: 'Rejected', value: counts.rejected, icon: FaExclamationTriangle, bg: '#fde8e8', fg: '#dc2626', filterValue: 'rejected' },
  ]

  const callApproverStatusApi = async (row, status, remark) => {
    try {
      const res = await fetch(`${API_BASE_URL}/PayrollApprover/approver/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: row.employeeId ?? row.empId,
          transactionId: row.transactionId,
          version: row.version,
          category,
          status,
          remarks: remark,
          approvedBy: getLoggedInUserName(),   // 👈 CHANGED: was CURRENT_USER ('System'); ippudu logged-in user name
        }),
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || 'Failed to update status')
      }
      return true
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to update status')
      return false
    }
  }

  const updateStatusFromDetail = async (detailObj, status, remark) => {
    const ok = await callApproverStatusApi(detailObj, status, remark)
    if (!ok) return false
    const empId = detailObj.employeeId ?? detailObj.empId
    setPayrollData((prev) => prev.map((r) => (r.id === detailObj.id ? { ...r, status } : r)))
    setDetailPanel((d) => (d && d.id === detailObj.id ? { ...d, status } : d))

    // If verified, auto-select for convenience; if hold/rejected/approved, deselect
    if (status === 'verified') {
      setSelectedRowIds((prev) => Array.from(new Set([...prev, detailObj.id])))
    } else {
      setSelectedRowIds((prev) => prev.filter((id) => id !== detailObj.id))
    }

    toast.success(`${empId} ${STATUS_TOAST_LABEL[status] || 'Updated'}`)
    return true
  }

  // ==================== CHECKBOX HANDLERS ====================
  // ONLY 'verified' rows can be toggled
  const handleToggleRow = (row) => {
    if (row.status !== 'verified') return
    setSelectedRowIds((prev) =>
      prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]
    )
  }

  // Select all verified on the current page
  const pageVerifiedRows = useMemo(() => paginatedData.filter((r) => r.status === 'verified'), [paginatedData])
  const isAllPageVerifiedSelected = pageVerifiedRows.length > 0 && pageVerifiedRows.every((r) => selectedRowIds.includes(r.id))
  const isSomePageVerifiedSelected = pageVerifiedRows.some((r) => selectedRowIds.includes(r.id))

  const handleToggleSelectAllPage = () => {
    if (isAllPageVerifiedSelected) {
      const pageVerifiedIds = pageVerifiedRows.map((r) => r.id)
      setSelectedRowIds((prev) => prev.filter((id) => !pageVerifiedIds.includes(id)))
    } else {
      const pageVerifiedIds = pageVerifiedRows.map((r) => r.id)
      setSelectedRowIds((prev) => Array.from(new Set([...prev, ...pageVerifiedIds])))
    }
  }

  // Bottom approve button is ENABLED only when at least 1 verified checkbox is selected
  const canApproveSelected = !loading && !approving && selectedRowIds.length > 0

  const approveSelectedRows = async () => {
    if (!canApproveSelected) return
    setApproving(true)

    const rowsToApprove = payrollData.filter((r) => selectedRowIds.includes(r.id) && r.status === 'verified')
    const succeededIds = []

    for (const row of rowsToApprove) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await callApproverStatusApi(row, 'approved', '')
      if (ok) succeededIds.push(row.id)
    }

    if (succeededIds.length > 0) {
      toast.success(`${succeededIds.length} verified record(s) approved`)
      setSelectedRowIds([])
      setCurrentPage(1)
      await loadPayroll()
    }
    if (succeededIds.length < rowsToApprove.length) {
      toast.error(`${rowsToApprove.length - succeededIds.length} record(s) failed to approve`)
    }
    setApproving(false)
  }

  const handleExport = () => {
    if (filtered.length === 0) { toast.warning('No data to export'); return }
    const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.CL
    const headers = [
      'S.No', 'Emp ID', 'Name', 'Vendor', 'Skill', 'Date of Leaving',
      'From Date', 'To Date',
      ...cfg.provisions.map((c) => c.name),
      ...cfg.earnings.map((c) => c.name),
      ...cfg.deductions.map((c) => c.name),
      cfg.netName, 'Status', 'Transaction ID', 'Version',
    ]
    const rows = filtered.map((p, idx) => [
      idx + 1, p.empId, p.empNm, p.vendor, p.skillCat,
      p.leavingDate ? (fmtDate(p.leavingDate) || '') : '',
      fmtDate(p.fromDate) || '', fmtDate(p.toDate) || '',
      ...cfg.provisions.map((c) => p.provisions[c.key]),
      ...cfg.earnings.map((c) => p.earnings[c.key]),
      ...cfg.deductions.map((c) => p.deductions[c.key]),
      p.netPayable, STATUS[p.status]?.label || p.status,
      p.transactionId, p.version,
    ])
    let csv = `${headers.join(',')}\n`
    rows.forEach((row) => {
      csv += `${row.map((c) => `"${c === undefined || c === null ? '' : c}"`).join(',')}\n`
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll_approver_${category}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    toast.success('Payroll approval exported')
  }

  const FROZEN_TOTAL = FROZEN_COL_0_WIDTH + FROZEN_COL_1_WIDTH + FROZEN_COL_NAME_WIDTH + FROZEN_COL_VENDOR_WIDTH
  const sumWidth = (cols) => cols.reduce((a, c) => a + parseInt(c.width, 10), 0)

  const { columns, groupDefs, TOTAL_WIDTH } = useMemo(() => {
    const frozenCols = [
      // Checkbox Column (Only ENABLED when row.status === 'verified')
      {
        name: (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
            title={pageVerifiedRows.length > 0 ? 'Select all verified on this page' : 'No verified records to select'}
          >
            <input
              type="checkbox"
              ref={(el) => {
                if (el) el.indeterminate = !isAllPageVerifiedSelected && isSomePageVerifiedSelected
              }}
              checked={isAllPageVerifiedSelected}
              disabled={pageVerifiedRows.length === 0}
              onChange={handleToggleSelectAllPage}
              style={{
                cursor: pageVerifiedRows.length > 0 ? 'pointer' : 'not-allowed',
                width: '16px',
                height: '16px',
                accentColor: '#5b21b6',
              }}
            />
          </div>
        ),
        cell: (row) => {
          const isVerified = row.status === 'verified'
          const isChecked = selectedRowIds.includes(row.id)
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
              title={isVerified ? 'Select to Approve' : `Checkbox disabled: Status is ${row.status} (only Verified can be selected)`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={!isVerified}
                onChange={() => handleToggleRow(row)}
                style={{
                  cursor: isVerified ? 'pointer' : 'not-allowed',
                  width: '16px',
                  height: '16px',
                  accentColor: '#5b21b6',
                  opacity: isVerified ? 1 : 0.4,
                }}
              />
            </div>
          )
        },
        width: `${FROZEN_COL_0_WIDTH}px`,
        minWidth: `${FROZEN_COL_0_WIDTH}px`,
        maxWidth: `${FROZEN_COL_0_WIDTH}px`,
        center: true,
        grow: 0,
      },
      {
        name: 'S.No',
        selector: (_, i) => startIndex + i + 1,
        width: `${FROZEN_COL_1_WIDTH}px`,
        minWidth: `${FROZEN_COL_1_WIDTH}px`,
        maxWidth: `${FROZEN_COL_1_WIDTH}px`,
        center: true,
        grow: 0,
      },
      {
        name: 'Employee Name',
        selector: (row) => row.empNm,
        width: `${FROZEN_COL_NAME_WIDTH}px`,
        minWidth: `${FROZEN_COL_NAME_WIDTH}px`,
        maxWidth: `${FROZEN_COL_NAME_WIDTH}px`,
        style: { justifyContent: 'flex-start', whiteSpace: 'nowrap' },
        cell: (row) => (
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, padding: '3px 0' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 500, fontSize: '12px', color: '#1f2937' }}>{row.empNm}</span>
              {row.leavingDate && (
                <span
                  title={`Resigned – Date of Leaving: ${fmtDate(row.leavingDate) || ''}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '8.5px',
                    fontWeight: 700, letterSpacing: '0.2px', color: '#fff', background: '#dc2626',
                    borderRadius: '10px', padding: '0 6px', lineHeight: '14px', flexShrink: 0,
                  }}
                >
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                  RESIGNED
                </span>
              )}
            </span>
            <span style={{ fontSize: '9.5px', color: '#8b8fa3', fontWeight: 500 }}>
              {row.empId}{row.skillCat ? ` | ${row.skillCat}` : ''}
            </span>
          </div>
        ),
        grow: 0,
      },
      {
        name: 'Vendor',
        selector: (row) => row.vendor,
        width: `${FROZEN_COL_VENDOR_WIDTH}px`,
        minWidth: `${FROZEN_COL_VENDOR_WIDTH}px`,
        maxWidth: `${FROZEN_COL_VENDOR_WIDTH}px`,
        style: { justifyContent: 'flex-start', fontWeight: 500, whiteSpace: 'nowrap' },
        cell: (row) => (row.vendor ? row.vendor : <span style={{ color: '#9ca3af' }}>-</span>),
        grow: 0,
      },
    ]

    const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.CL
    const mkCols = (group, defs) => defs.map((d) => ({
      name: d.name,
      selector: (r) => {
        const v = r[group] && r[group][d.key]
        return (v === undefined || v === null) ? 0 : v
      },
      width: d.width,
      center: true,
      cell: (r) => {
        const raw = r[group] && r[group][d.key]
        if (raw === undefined || raw === null) return <span style={{ color: '#9ca3af' }}>-</span>
        return money(raw)
      },
      ...(d.style ? { style: d.style } : {}),
    }))
    const provisionCols = mkCols('provisions', cfg.provisions)
    const earningCols = mkCols('earnings', cfg.earnings)
    const deductionCols = mkCols('deductions', cfg.deductions)

    const netCols = [{
      name: cfg.netName,
      selector: (r) => r.netPayable,
      width: `${NET_W}px`,
      center: true,
      cell: (row) => (
        row.netPayable
          ? <span style={{ fontWeight: 700, color: '#6b4fa1' }}>{money(row.netPayable)}</span>
          : <span style={{ color: '#9ca3af' }}>-</span>
      ),
    }]

    const statusCol = {
      name: 'Status',
      selector: (r) => r.status,
      width: `${STATUS_COL_W}px`,
      center: true,
      cell: (r) => <StatusBadge status={r.status} />,
    }

    const groups = [
      { key: 'provisions', label: 'VARIABLE INPUTS', short: 'VARIABLE', bg: '#b91c1c', color: '#fff', cols: provisionCols },
      { key: 'earnings', label: 'EARNINGS', short: 'EARNINGS', bg: '#15803d', color: '#fff', cols: earningCols },
      { key: 'deductions', label: 'DEDUCTIONS', short: 'DEDUCT.', bg: '#d97706', color: '#fff', cols: deductionCols },
    ].filter((g) => g.cols.length > 0)

    const scalable = []
    groups.forEach((g) => { if (!collapsed[g.key]) scalable.push(...g.cols) })
    scalable.push(...netCols, statusCol)
    const collapsedCount = groups.filter((g) => collapsed[g.key]).length
    const baseScalable = sumWidth(scalable)
    const baseTotal = FROZEN_TOTAL + collapsedCount * COLLAPSED_W + baseScalable
    const extra = Math.max(0, containerWidth - baseTotal)
    if (extra > 0 && baseScalable > 0) {
      const adds = scalable.map((c) => Math.floor((extra * parseInt(c.width, 10)) / baseScalable))
      adds[adds.length - 1] += extra - adds.reduce((a, b) => a + b, 0)
      scalable.forEach((c, i) => {
        const newW = parseInt(c.width, 10) + adds[i]
        c.width = `${newW}px`
        c.minWidth = `${newW}px`
        c.maxWidth = `${newW}px`
      })
    }

    const allCols = [...frozenCols]
    const defs = [
      { key: 'emp', label: 'EMPLOYEE DETAILS', width: FROZEN_TOTAL, bg: '#ede9fe', color: '#5b21b6', sticky: true },
    ]

    groups.forEach((g) => {
      const isCollapsed = !!collapsed[g.key]
      if (isCollapsed) {
        allCols.push({
          name: '', selector: () => '', width: `${COLLAPSED_W}px`, center: true, compact: true,
          cell: () => null, style: { backgroundColor: 'rgba(0,0,0,0.035)' },
        })
      } else {
        allCols.push(...g.cols)
      }
      defs.push({
        key: g.key, label: g.label, short: g.short,
        width: isCollapsed ? COLLAPSED_W : sumWidth(g.cols),
        bg: g.bg, color: g.color, collapsible: true, collapsed: isCollapsed,
      })
    })

    allCols.push(...netCols)
    defs.push({ key: 'net', label: 'Net Payable', width: sumWidth(netCols), bg: '#1e3a8a', color: '#fff' })
    allCols.push(statusCol)
    defs.push({ key: 'review', label: 'Status', width: parseInt(statusCol.width, 10), bg: '#3b1d8f', color: '#fff' })

    return {
      columns: allCols,
      groupDefs: defs,
      TOTAL_WIDTH: defs.reduce((a, d) => a + d.width, 0),
    }
  }, [category, startIndex, collapsed, containerWidth, selectedRowIds, pageVerifiedRows, isAllPageVerifiedSelected, isSomePageVerifiedSelected])

  const conditionalRowStyles = useMemo(() => [
    {
      when: (row) => selectedRowIds.includes(row.id) && (!detailPanel || row.id !== detailPanel.id),
      style: { backgroundColor: '#f5f3ff', '--row-bg': '#f5f3ff' },
    },
    {
      when: (row) => !!detailPanel && row.id === detailPanel.id,
      style: { backgroundColor: '#dcfce7', '--row-bg': '#dcfce7' },
    },
  ], [detailPanel, selectedRowIds])

  const pageBtnStyle = (disabled) => ({
    background: 'transparent', border: 'none',
    color: disabled ? '#d1d5db' : '#4b5563',
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '4px 6px', display: 'flex', alignItems: 'center', fontSize: 14,
  })

  return (
    <div className="user-master-page" style={{ paddingBottom: '90px' }}>
      {/* ===================== TOP CARD — ORANGE GRADIENT (NO BLINK) ===================== */}
      <div className="payroll-top-card" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 55%, #c2410c 100%)',
        padding: '12px 14px', borderRadius: '8px',
        boxShadow: '0 3px 12px rgba(194, 65, 12, 0.35)',
        marginBottom: '16px', flexWrap: 'wrap', gap: '10px 14px',
        border: '1px solid #9a3412', width: '100%', boxSizing: 'border-box',
      }}>
        {/* LEFT SECTION: Badge + Period */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexShrink: 0, whiteSpace: 'nowrap' }}>
          <span style={{
            background: '#ffffff',
            color: '#c2410c',
            fontWeight: 800, fontSize: '10.5px', letterSpacing: '0.4px',
            borderRadius: '5px', padding: '3px 8px',
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            flexShrink: 0,
          }}>
            APPROVER
          </span>

          {period ? (
            <span style={{ fontSize: '11.5px', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <span>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>From:</span>{' '}
                <b style={{ color: '#fff' }}>{fmtDate(period.fromDate)}</b>
              </span>
              <span>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>To:</span>{' '}
                <b style={{ color: '#fff' }}>{fmtDate(period.toDate)}</b>
              </span>
            </span>
          ) : (
            <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.9)' }}>
              {loading ? 'Loading salary period...' : 'No records pending approval'}
            </span>
          )}
        </div>

        {/* RIGHT SECTION: Refresh Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexShrink: 0, flexWrap: 'wrap', whiteSpace: 'nowrap' }}>
          <button
            type="button"
            onClick={loadPayroll}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '0 11px', height: '30px', borderRadius: '6px',
              background: '#ffffff', color: '#ea580c', border: '1px solid #fdba74',
              fontWeight: 700, fontSize: '11.5px', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flexShrink: 0,
              boxSizing: 'border-box',
            }}
          >
            <FaSyncAlt size={10} className={loading ? 'fa-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary cards — clickable filter */}
      <div className="summary-stats-wrapper" style={{
        display: 'flex', gap: '16px', alignItems: 'center',
        background: '#fff', padding: '18px 20px', borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px', flexWrap: 'wrap',
      }}>
        {summaryCards.map(({ label, value, icon: Icon, bg, fg, filterValue }) => {
          const isActive = activeCardFilter === filterValue
          return (
            <div
              key={label}
              onClick={() => handleCardClick(filterValue)}
              style={{
                flex: 1,
                minWidth: '140px',
                background: bg,
                borderRadius: '10px',
                padding: '14px 16px',
                cursor: 'pointer',
                border: isActive ? `2px solid ${fg}` : '2px solid transparent',
                boxShadow: isActive ? `0 0 0 3px ${fg}22` : 'none',
                transition: 'all 0.15s ease-in-out',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#3f4a6b' }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>{value}</span>
                <Icon size={18} color={fg} />
              </div>
            </div>
          )
        })}
      </div>

      <CCard className="mt-3">
        <CCardBody>
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            marginBottom: '16px', flexWrap: 'wrap', gap: '12px',
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <CButton
                size="sm"
                style={{
                  background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  height: '32px', minHeight: '32px', maxHeight: '32px',
                  padding: '0 12px', fontWeight: 600, fontSize: '12px', boxSizing: 'border-box',
                }}
                onClick={handleExport}
              >
                <FaDownload size={12} /> Export CSV
              </CButton>

              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', height: '32px' }}>
                <FaSearch style={{
                  position: 'absolute', left: '10px', color: '#9ca3af', fontSize: '12px', pointerEvents: 'none',
                }} />
                <CFormInput
                  placeholder="Search by Emp ID or Name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{
                    paddingLeft: '30px', paddingRight: searchInput ? '28px' : '10px',
                    paddingTop: 0, paddingBottom: 0,
                    minWidth: '200px', height: '32px', minHeight: '32px', maxHeight: '32px',
                    fontSize: '12px', lineHeight: '32px',
                    borderRadius: '6px', border: '1px solid #d1d5db',
                    boxSizing: 'border-box', background: '#fff',
                  }}
                />
                {searchInput && (
                  <FaTimes
                    onClick={() => { setSearchInput(''); setSearch('') }}
                    style={{
                      position: 'absolute', right: '10px', color: '#9ca3af', fontSize: '12px', cursor: 'pointer',
                    }}
                  />
                )}
              </div>

              <div style={{
                display: 'inline-flex', alignItems: 'center', background: '#f3f4f6',
                borderRadius: '6px', padding: '2px',
                height: '32px', minHeight: '32px', maxHeight: '32px',
                boxSizing: 'border-box', border: '1px solid #e5e7eb',
              }}>
                {CATEGORIES.map((c) => {
                  const active = category === c
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      style={{
                        border: 'none', cursor: 'pointer', minWidth: '58px', padding: '0 12px',
                        fontSize: '11.5px', fontWeight: 700, borderRadius: '4px',
                        background: active ? '#5b21b6' : 'transparent',
                        color: active ? '#ffffff' : '#6b7280',
                        transition: 'background 0.15s, color 0.15s',
                        height: '26px', lineHeight: '26px',
                        boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <style>{`
            .papr-group-header { display: flex; width: ${TOTAL_WIDTH}px; min-width: ${TOTAL_WIDTH}px; box-sizing: border-box; }
            .papr-group-header .group-cell {
              height: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center;
              font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase;
              border-right: 2px solid #ffffff; box-sizing: border-box; white-space: nowrap; padding: 0 6px; flex-shrink: 0;
            }
            .papr-group-header .group-cell:last-child { border-right: none; }
            .papr-group-header .group-cell--toggle { cursor: pointer; user-select: none; transition: filter 0.15s; }
            .papr-group-header .group-cell--toggle:hover { filter: brightness(1.1); }
            .papr-group-header .group-cell__row { display: flex; align-items: center; gap: 6px; }
            .papr-group-header .group-cell__short { font-size: 8px; font-weight: 700; letter-spacing: 0; margin-top: 1px; }
            .papr-group-header .group-cell--sticky { position: sticky; left: 0; z-index: 20; }

            .papr-frozen-table .rdt_Table, .papr-frozen-table .rdt_TableBody,
            .papr-frozen-table .rdt_TableHead, .papr-frozen-table .rdt_TableHeadRow,
            .papr-frozen-table .rdt_TableRow { overflow: visible !important; }
            .papr-frozen-table .rdt_TableCol, .papr-frozen-table .rdt_TableCell { flex-grow: 0 !important; flex-shrink: 0 !important; }
            .papr-frozen-table .rdt_TableCol, .papr-frozen-table .rdt_TableCol * { overflow: visible !important; text-overflow: unset !important; }
            .papr-frozen-table .rdt_TableCol:nth-child(-n+4), .papr-frozen-table .rdt_TableCol:nth-child(-n+4) * { white-space: nowrap !important; }
            .papr-frozen-table .rdt_TableCell, .papr-frozen-table .rdt_TableCell * { text-overflow: unset !important; }

            .papr-frozen-table .rdt_TableCol:nth-child(-n+4), .papr-frozen-table .rdt_TableCell:nth-child(-n+4) { position: sticky !important; }
            .papr-frozen-table .rdt_TableCol:nth-child(-n+4) { background-color: #f1f4f9 !important; z-index: 5 !important; }
            .papr-frozen-table .rdt_TableRow .rdt_TableCell:nth-child(-n+4) { background-color: var(--row-bg, #ffffff) !important; z-index: 3 !important; }
            .papr-frozen-table .rdt_TableRow:nth-of-type(odd) .rdt_TableCell:nth-child(-n+4) { background-color: var(--row-bg, #fafafa) !important; }
            .papr-frozen-table .rdt_TableRow:hover .rdt_TableCell:nth-child(-n+4) { background-color: var(--row-bg, #eeeeee) !important; }

            /* Frozen Column Left Offsets (Checkbox is col 1) */
            .papr-frozen-table .rdt_TableCol:nth-child(1), .papr-frozen-table .rdt_TableCell:nth-child(1) { left: 0px !important; }
            .papr-frozen-table .rdt_TableCol:nth-child(2), .papr-frozen-table .rdt_TableCell:nth-child(2) { left: ${FROZEN_COL_0_WIDTH}px !important; }
            .papr-frozen-table .rdt_TableCol:nth-child(3), .papr-frozen-table .rdt_TableCell:nth-child(3) { left: ${FROZEN_COL_0_WIDTH + FROZEN_COL_1_WIDTH}px !important; }
            .papr-frozen-table .rdt_TableCol:nth-child(4), .papr-frozen-table .rdt_TableCell:nth-child(4) { left: ${FROZEN_COL_0_WIDTH + FROZEN_COL_1_WIDTH + FROZEN_COL_NAME_WIDTH}px !important; }

            .papr-frozen-table.is-scrolled .rdt_TableCol:nth-child(4), .papr-frozen-table.is-scrolled .rdt_TableCell:nth-child(4) {
              border-right: 2px solid #000 !important; box-shadow: 3px 0 6px -3px rgba(0,0,0,0.25) !important;
            }

            .papr-frozen-table::-webkit-scrollbar { height: 8px; width: 8px; }
            .papr-frozen-table::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
            .papr-frozen-table::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
            .papr-frozen-table::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
            .papr-frozen-table { scrollbar-width: thin; scrollbar-color: #c1c1c1 #f1f1f1; }
          `}</style>

          <div
            ref={tableScrollRef}
            className={`papr-frozen-table${isTableScrolled ? ' is-scrolled' : ''}`}
            style={{ overflowX: 'auto', width: '100%' }}
          >
            <div style={{ width: `${TOTAL_WIDTH}px` }}>
              <div className="papr-group-header">
                {groupDefs.map((g) => (
                  <div
                    key={g.key}
                    className={`group-cell${g.sticky ? ' group-cell--sticky' : ''}${g.collapsible ? ' group-cell--toggle' : ''}`}
                    onClick={g.collapsible ? () => toggleGroup(g.key) : undefined}
                    title={g.collapsible ? `${g.collapsed ? 'Expand' : 'Collapse'} ${g.label}` : undefined}
                    style={{
                      width: `${g.width}px`, minWidth: `${g.width}px`, maxWidth: `${g.width}px`,
                      background: g.bg, color: g.color,
                    }}
                  >
                    {g.collapsed ? (
                      <>
                        <FaPlusSquare size={11} />
                        <span className="group-cell__short">{g.short}</span>
                      </>
                    ) : (
                      <span className="group-cell__row">
                        {g.collapsible && <FaMinusSquare size={11} />}
                        {g.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <DataTable
                columns={columns}
                data={paginatedData}
                striped
                highlightOnHover
                dense
                responsive={false}
                progressPending={loading}
                progressComponent={<div style={{ padding: 24, color: '#94a3b8' }}>Loading records...</div>}
                customStyles={customStyles}
                conditionalRowStyles={conditionalRowStyles}
                noDataComponent={<div style={{ padding: 24, color: '#94a3b8' }}>No payroll records pending approval</div>}
                onRowClicked={(row) => {
                  const globalIdx = filtered.findIndex((r) => r.id === row.id && r.empId === row.empId)
                  loadDetailPanel(row, globalIdx >= 0 ? globalIdx : 0)
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px',
            padding: '14px 8px 4px', fontSize: '12px', color: '#4b5563',
          }}>
            <span style={{ color: '#6b7280' }}>Rows per page</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                const v = e.target.value
                setRowsPerPage(v === 'All' ? 'All' : Number(v))
              }}
              style={{
                border: 'none', background: 'transparent', fontSize: '12px',
                color: '#4b5563', cursor: 'pointer', outline: 'none', paddingRight: '4px',
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="All">All</option>
            </select>
            <span style={{ color: '#6b7280', minWidth: '80px', textAlign: 'center' }}>
              {totalRows === 0 ? '0-0' : `${startIndex + 1}-${endIndex}`} of {totalRows}
            </span>
            <button style={pageBtnStyle(currentPage === 1)} disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
              <FaAngleDoubleLeft />
            </button>
            <button
              style={pageBtnStyle(currentPage === 1)}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <FaAngleLeft />
            </button>
            <button
              style={pageBtnStyle(currentPage >= totalPages)}
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <FaAngleRight />
            </button>
            <button
              style={pageBtnStyle(currentPage >= totalPages)}
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
            >
              <FaAngleDoubleRight />
            </button>
          </div>
        </CCardBody>
      </CCard>

      {/* Detail panel with verified & next */}
      <DetailPanel
        detail={detailPanel}
        loading={detailLoading}
        category={category}
        filteredData={filtered}
        currentDetailIndex={currentDetailIndex}
        onClose={() => setDetailPanel(null)}
        onUpdateStatus={updateStatusFromDetail}
        onNavigate={navigateDetail}
        onOpenRow={loadDetailPanel}
      />

      {/* Bottom bulk approve bar (ENABLED ONLY WHEN CHECKBOXES ARE SELECTED) */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: '16px',
        padding: '14px 20px', background: '#fff',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.08)',
      }}>
        <span style={{ fontSize: '13px', color: canApproveSelected ? '#16a34a' : '#6b7280', fontWeight: 600 }}>
          {selectedRowIds.length > 0
            ? `${selectedRowIds.length} verified record(s) selected for approval`
            : counts.verified > 0
              ? `Select verified records above using checkboxes to approve (${counts.verified} available)`
              : 'No verified records ready for approval'}
        </span>
        <CButton
          onClick={approveSelectedRows}
          disabled={!canApproveSelected}
          style={{
            background: canApproveSelected ? '#1e3a8a' : '#9ca3af',
            color: '#fff', border: 'none',
            borderRadius: '10px', height: '46px', padding: '0 36px',
            display: 'flex', alignItems: 'center', gap: '10px',
            fontWeight: 700, fontSize: '14px',
            cursor: canApproveSelected ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          <FaCheck size={14} /> {approving ? 'Approving...' : selectedRowIds.length > 0 ? `Approve (${selectedRowIds.length})` : 'Approve'}
        </CButton>
      </div>
    </div>
  )
}

export default PayrollApprover