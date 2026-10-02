import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import DataTable from 'react-data-table-component'
import { CButton, CFormInput, CCard, CCardBody } from '@coreui/react'
import {
  FaDownload, FaUpload, FaSearch, FaTimes, FaUsers,
  FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight,
  FaPlusSquare, FaMinusSquare, FaCalculator, FaPaperPlane,
  FaUserSlash, FaChartLine, FaSyncAlt, FaArrowRight, FaCloudDownloadAlt,
  FaFilter, FaCheckCircle, FaLock,
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import * as XLSX from 'xlsx'
import '../../assets/CSS/user.css'
import PeriodTimeline from './PeriodTimeline'

const FROZEN_COL_1_WIDTH = 60
const FROZEN_COL_NAME_WIDTH = 230
const FROZEN_COL_VENDOR_WIDTH = 140
const DAY_COL_W = 42
const REMARKS_W = 220

const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL)

/* ========== LOGGED-IN USER (sent to backend for Crtd_By / Mdfd_By) ========== */
const getLoggedInUserName = () => {
  try {
    const raw = sessionStorage.getItem('user')
    const u = raw ? JSON.parse(raw) : null
    return (u && (u.userName || u.userId)) || ''
  } catch {
    return ''
  }
}

/* ========== DATE HELPERS ========== */
const parseKey = (key) => {
  if (!key || typeof key !== 'string') return new Date()
  const parts = key.split('-').map(Number)
  if (parts.length < 3 || parts.some(isNaN)) return new Date()
  return new Date(parts[0], parts[1] - 1, parts[2])
}
const toKey = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
const fmtDate = (key) => {
  if (!key) return ''
  const d = parseKey(key)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
const fmtShort = (key) => {
  if (!key) return ''
  const d = parseKey(key)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

const fmtDateTime = (v) => {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  })
}

const buildDays = (fromKey, endKey) => {
  const days = []
  if (!fromKey || !endKey) return days
  const cur = parseKey(fromKey)
  const end = parseKey(endKey)
  const MAX_DAYS = 370
  while (cur <= end && days.length < MAX_DAYS) {
    days.push({ key: toKey(cur), day: cur.getDate() })
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

const periodKey = (p) => (p && p.fromDate && p.toDate ? `${p.fromDate}|${p.toDate}` : '')
const HOLIDAY_CODES = ['PH', 'PM', 'WO']

/* ========== TIME / OT HELPERS ========== */
const parseDateTime = (str) => {
  if (!str) return null
  const iso = str.trim().replace(' ', 'T')
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

const combineDateAndTime = (anchorDt, timeStr) => {
  if (!anchorDt || !timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return new Date(anchorDt.getFullYear(), anchorDt.getMonth(), anchorDt.getDate(), h, m, 0, 0)
}

const parseShiftDuration = (shiftStart, shiftEnd) => {
  const anchor = new Date(2000, 0, 1)
  const start = combineDateAndTime(anchor, shiftStart)
  let end = combineDateAndTime(anchor, shiftEnd)
  if (!start || !end) return 0
  if (end <= start) end = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1, end.getHours(), end.getMinutes())
  return (end - start) / 60000
}

const OT_MIN_GAP_MINUTES = 120

/**
 * OT Rounding Rule:
 * Rounds up to next full hour only if minutes >= 51 (e.g. 6:51 -> 7).
 * For 6:38 (38 mins < 51), it strictly returns 6.
 */
const roundOtTotal = (value) => {
  const val = Number(value) || 0
  if (val <= 0) return 0
  const totalMinutes = Math.round(val * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m >= 51 ? h + 1 : h
}

/**
 * Early punch-in is ignored.
 * Seconds are stripped (set to 0) to avoid any round-off discrepancies.
 * OT is counted strictly from ShiftEnd to Punch2 in whole minutes.
 */
const calculateDayOt = (dayStatus, shiftStart, shiftEnd, punch1, punch2) => {
  if (dayStatus === 'RS') return 0
  const punch1Dt = parseDateTime(punch1)
  const punch2Dt = parseDateTime(punch2)

  if (dayStatus === 'PH' || dayStatus === 'PM' || dayStatus === 'WO') {
    if (!punch1Dt || !punch2Dt) return 0
    const shiftMinutes = parseShiftDuration(shiftStart, shiftEnd)
    return shiftMinutes > 0 ? shiftMinutes / 60 : 0
  }

  if (!punch1Dt || !punch2Dt || !shiftStart || !shiftEnd) return 0

  // Strip seconds & milliseconds
  punch1Dt.setSeconds(0, 0)
  punch2Dt.setSeconds(0, 0)

  const shiftStartDt = combineDateAndTime(punch1Dt, shiftStart)
  let shiftEndDt = combineDateAndTime(punch1Dt, shiftEnd)
  if (!shiftStartDt || !shiftEndDt) return 0
  shiftStartDt.setSeconds(0, 0)
  shiftEndDt.setSeconds(0, 0)

  if (shiftEndDt <= shiftStartDt) {
    shiftEndDt = new Date(shiftEndDt.getFullYear(), shiftEndDt.getMonth(), shiftEndDt.getDate() + 1, shiftEndDt.getHours(), shiftEndDt.getMinutes(), 0, 0)
  }

  // Early punch-in is ignored: Effective start is strictly ShiftStart
  const effectiveStartDt = punch1Dt < shiftStartDt ? shiftStartDt : punch1Dt
  const workedMinutes = Math.floor((punch2Dt - effectiveStartDt) / 60000)
  const shiftMinutes = Math.floor((shiftEndDt - shiftStartDt) / 60000)
  if (workedMinutes < shiftMinutes) return 0

  // OT counted strictly from ShiftEnd in whole minutes (no seconds)
  const otMinutes = Math.floor((punch2Dt - shiftEndDt) / 60000)
  if (otMinutes < OT_MIN_GAP_MINUTES) return 0
  return otMinutes / 60
}

const cleanValues = (obj) => {
  const out = {}
  if (!obj) return out
  Object.entries(obj).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') return
    out[k] = v
  })
  return out
}

const countDays = (fromKey, endKey) =>
  Math.round((parseKey(endKey) - parseKey(fromKey)) / 86400000) + 1

const buildPayrollRow = (emp, period) => {
  const attendance = {}
  const holidayNames = {}
  const dayInfo = {}
  let totalOtHours = 0

  ;(emp.attendance || []).forEach((a) => {
    if (a.status === 'P') attendance[a.date] = 1
    else if (a.status === 'HP') attendance[a.date] = 'HP'
    else if (a.status === 'OP') attendance[a.date] = 'OP'
    else if (a.status === 'A' || a.status === 'PL') attendance[a.date] = 0
    else if (a.status === 'RS') {
      attendance[a.date] = 'RS'
      holidayNames[a.date] = a.holidayName || 'Resigned'
    } else if (HOLIDAY_CODES.includes(a.status)) {
      attendance[a.date] = a.status
      holidayNames[a.date] = a.holidayName || ''
    } else attendance[a.date] = null

    const dayOt = calculateDayOt(a.status, a.shiftStart, a.shiftEnd, a.punch1, a.punch2)
    totalOtHours += dayOt

    let workedHours = a.workedHours || ''
    if (workedHours && workedHours.split(':').length === 3) {
      workedHours = workedHours.slice(0, 5) // strip seconds: HH:MM
    } else if (!workedHours && a.punch1 && a.punch2) {
      const p1 = parseDateTime(a.punch1)
      const p2 = parseDateTime(a.punch2)
      if (p1 && p2 && p2 > p1) {
        p1.setSeconds(0, 0)
        p2.setSeconds(0, 0)
        const diffM = Math.floor((p2 - p1) / 60000)
        const wh = Math.floor(diffM / 60)
        const wm = diffM % 60
        workedHours = `${wh}:${wm < 10 ? '0' : ''}${wm}`
      }
    }

    dayInfo[a.date] = {
      shiftStart: a.shiftStart || '',
      shiftEnd: a.shiftEnd || '',
      workedHours,
      otHours: dayOt,
      punch1: a.punch1 || '',
      punch2: a.punch2 || '',
      status: a.status || '',
    }
  })

  const values = Object.values(attendance)
  const present = values.filter((v) => v === 1).length
  const halfPresent = values.filter((v) => v === 'HP').length
  const outPending = values.filter((v) => v === 'OP').length
  const absent = values.filter((v) => v === 0).length
  const whOff = values.filter((v) => v === 'WO').length
  const holiday = values.filter((v) => v === 'PH' || v === 'PM').length

  const lop = absent > 0 ? absent - 1 : 0
  const paidDays = present + halfPresent * 0.5
  const availDays = period && period.fromDate && period.toDate
    ? countDays(period.fromDate, period.toDate)
    : Object.keys(attendance).length

  return {
    id: emp.id,
    empId: emp.employeeId,
    empNm: emp.employeeName,
    skillCat: emp.skillCategory || '',
    vendorName: emp.vendorName || '',
    leavingDate: emp.leavingDate || '',
    attendance,
    holidayNames,
    dayInfo,
    attendanceSummary: {
      present, halfPresent, outPending, absent,
      whOff, holiday, lop, paidDays, availDays, otHrs: roundOtTotal(totalOtHours),
    },
    provisions: cleanValues(emp.provisions),
    earnings: cleanValues(emp.earnings),
    deductions: cleanValues(emp.deductions),
    netPayable: (emp.netPayable === null || emp.netPayable === undefined) ? 0 : emp.netPayable,
    netCalculated: !(emp.netPayable === null || emp.netPayable === undefined),
    status: emp.status || '',
    checkerStatus: emp.checkerStatus || '',
    remarks: emp.remarks || '',
    transactionId: emp.transactionId || '',
    version: emp.version || '',
  }
}

/* ========== CHECKER STATUS PILL ========== */
const checkerPill = (s) => {
  const u = (s || '').toString().trim().toUpperCase()
  if (!u) return null
  const byApprover = u.startsWith('APPROVER')
  if (u.includes('REJECT')) return { label: byApprover ? 'APPR. REJECTED' : 'REJECTED', bg: '#dc2626' }
  if (u.includes('HOLD')) return { label: byApprover ? 'APPR. HOLD' : 'HOLD', bg: '#ea580c' }
  if (u.includes('VERIF')) return { label: byApprover ? 'APPR. VERIFIED' : 'VERIFIED', bg: '#16a34a' }
  if (u.includes('APPROV')) {
    return byApprover
      ? { label: 'APPROVED', bg: '#1d4ed8' }
      : { label: 'APPROVE PENDING', bg: '#7c3aed' }
  }
  return null
}

/* ========== STATUS VIEW CONFIG ========== */
const STATUS_VIEW_LABELS = {
  all: 'ALL EMPLOYEES',
  verify: 'VERIFIED',
  reject: 'REJECTED',
  hold: 'ON HOLD',
  approve: 'APPROVED',
}

/* ========== CATEGORY CONFIG ========== */
const CATEGORIES = ['CL', 'NAPS']

const CATEGORY_SKILLS = {
  CL: ['E1', 'Semi Skilled', 'Semi Skilled Level-2', 'Skilled', 'Un Skilled'],
  NAPS: ['E1', 'Semi Skilled', 'Semi Skilled Level-2', 'Trainee', 'Un Skilled'],
}

const SUMMARY_COLS = [
  { key: 'present', name: 'Present', width: '80px' },
  { key: 'halfPresent', name: 'Half Day', width: '75px' },
  { key: 'outPending', name: 'Out Pend.', width: '80px' },
  { key: 'absent', name: 'Absent', width: '80px' },
  { key: 'lop', name: 'LOP', width: '65px', style: { fontWeight: 600, color: '#dc2626' } },
  { key: 'whOff', name: 'WH Off', width: '70px' },
  { key: 'holiday', name: 'Holiday', width: '80px' },
  { key: 'paidDays', name: 'Paid Days', width: '90px', style: { fontWeight: 600, color: '#16a34a' } },
  { key: 'otHrs', name: 'OT Hrs', width: '70px' },
]

const CL_SUMMARY_COLS = [
  { key: 'present', name: 'Present', width: '80px' },
  { key: 'halfPresent', name: 'Half Day', width: '75px' },
  { key: 'outPending', name: 'Out Pend.', width: '80px' },
  { key: 'absent', name: 'Absent', width: '80px' },
  { key: 'lop', name: 'LOP', width: '65px', style: { fontWeight: 600, color: '#dc2626' } },
  { key: 'whOff', name: 'Wk Off', width: '70px' },
  { key: 'holiday', name: 'HLD', width: '80px' },
  { key: 'availDays', name: 'TWD', width: '130px', style: { fontWeight: 600, color: '#16a34a' } },
  { key: 'otHrs', name: 'OT Hrs', width: '70px' },
]

const CATEGORY_CONFIG = {
  CL: {
    summary: CL_SUMMARY_COLS,
    provisions: [
      { key: 'referalBonus', name: 'Referal Bonus', width: '130px' },
      { key: 'splAllow', name: 'Spl Allow', width: '110px' },
      { key: 'kaizen', name: 'Kaizen', width: '100px' },
      { key: 'gpaGmc', name: 'GPA & GMC', width: '120px' },
    ],
    earnings: [
      { key: 'payDaysFull', name: 'Pay/Days (Full)', width: '130px', style: { fontWeight: 600 } },
      { key: 'payDaysHalf', name: 'Pay/Days (Half)', width: '130px', style: { fontWeight: 600 } },
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
    summary: SUMMARY_COLS,
    provisions: [
      { key: 'referalBonus', name: 'Referal Bonus', width: '140px' },
      { key: 'kaizen', name: 'Kaizen', width: '110px' },
    ],
    earnings: [
      { key: 'payDaysFull', name: 'Pay/Days (Full)', width: '130px', style: { fontWeight: 600 } },
      { key: 'payDaysHalf', name: 'Pay/Days (Half)', width: '130px', style: { fontWeight: 600 } },
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

const normSkill = (v) => (v || '').toString().trim().toLowerCase()
const canonSkill = (v) => normSkill(v).replace(/[\s-]+/g, '')
const skillFilterKey = (v) => {
  const raw = (v || '').toString().trim()
  return raw ? canonSkill(raw) : '__none__'
}

const SKILL_COLORS = {
  'un skilled': { bg: '#e0f2fe', color: '#0369a1' },
  'unskilled': { bg: '#e0f2fe', color: '#0369a1' },
  'semi skilled': { bg: '#fef3c7', color: '#92400e' },
  'semi-skilled': { bg: '#fef3c7', color: '#92400e' },
  'semi skilled level-2': { bg: '#fce7f3', color: '#be185d' },
  'semi skilled lv.2': { bg: '#fce7f3', color: '#be185d' },
  'semi-skilled lv.2': { bg: '#fce7f3', color: '#be185d' },
  'skilled': { bg: '#d1fae5', color: '#047857' },
  'trainee': { bg: '#fef08a', color: '#78350f' },
  'e1': { bg: '#e0e7ff', color: '#4c1d95' },
  'telewheel': { bg: '#e0e7ff', color: '#4c1d95' },
  'disabled': { bg: '#f3e8ff', color: '#6b21a8' },
}
const SKILL_COLOR_FALLBACK = { bg: '#f3f4f6', color: '#4b5563' }

const customStyles = {
  rows: { style: { minHeight: '32px' } },
  headCells: {
    style: {
      fontSize: '9px', fontWeight: '700',
      paddingTop: '8px', paddingBottom: '8px', paddingLeft: '8px', paddingRight: '8px',
      background: '#f1f4f9', textTransform: 'uppercase',
      whiteSpace: 'normal', overflow: 'visible', textOverflow: 'unset',
      wordBreak: 'break-word', lineHeight: '1.2', minHeight: '40px',
      display: 'flex', alignItems: 'center', boxSizing: 'border-box',
    },
  },
  cells: {
    style: {
      justifyContent: 'center', fontSize: '12px',
      paddingTop: '2px', paddingBottom: '2px', paddingLeft: '8px', paddingRight: '8px',
      boxSizing: 'border-box',
    },
  },
}

const HOLIDAY_STYLES = {
  PH: { bg: '#3b82f6', label: 'Public Holiday' },
  PM: { bg: '#f59e0b', label: 'Production Maintenance Leave' },
  WO: { bg: '#8b5cf6', label: 'Weekly Off' },
}

const LEGEND_ITEMS = [
  { value: 1, label: 'Present' },
  { value: 'HP', label: 'Half Day' },
  { value: 'OP', label: 'Update Out Time' },
  { value: 0, label: 'Absent' },
  { value: 'RS', label: 'Resigned (after DOL)' },
  ...Object.entries(HOLIDAY_STYLES).map(([code, h]) => ({
    value: code, label: h.label, holidayTitle: h.label,
  })),
]

/**
 * Tooltip shows clean "OT 2:10" without seconds or decimal brackets
 */
const buildTooltip = (statusLabel, info) => {
  if (!info) return statusLabel || undefined
  const bits = []
  if (info.shiftStart && info.shiftEnd) bits.push(`Shift ${info.shiftStart}-${info.shiftEnd}`)
  if (info.workedHours) bits.push(`Worked ${info.workedHours}`)
  if (info.otHours && info.otHours > 0) {
    const totalMins = Math.round(Number(info.otHours) * 60)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    bits.push(`OT ${h}:${m < 10 ? '0' : ''}${m}`)
  }
  if (!statusLabel && bits.length === 0) return undefined
  return [statusLabel, ...bits].filter(Boolean).join(' · ')
}

const AttendanceBadge = ({ value, holidayTitle, info, onEmptyClick, mini = false }) => {
  const baseStyle = mini ? {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '22px', height: '16px', lineHeight: '16px',
    padding: '0 3px',
    flexShrink: 0, textAlign: 'center', borderRadius: '4px', fontSize: '9px', fontWeight: 800,
  } : {
    display: 'inline-block', width: '34px', height: '22px', lineHeight: '22px',
    flexShrink: 0, textAlign: 'center', borderRadius: '5px', fontSize: '11px', fontWeight: 700,
  }

  if (value === 1) return <span title={buildTooltip('Present', info)} style={{ ...baseStyle, background: '#16a34a', color: '#fff' }}>P</span>
  if (value === 'HP') return (
    <span title={buildTooltip('Half Day', info)} style={{ ...baseStyle, color: '#fff', background: 'linear-gradient(to right, #16a34a 50%, #d1d5db 50%)' }}>HP</span>
  )
  if (value === 'OP') return <span title={buildTooltip('Update Out Time', info)} style={{ ...baseStyle, background: '#f97316', color: '#fff' }}>OP</span>
  if (value === 0) return (
    <span title={onEmptyClick ? `${buildTooltip('Absent', info) || 'Absent'} · Click to raise resignation query` : buildTooltip('Absent', info)} onClick={onEmptyClick}
      style={{ ...baseStyle, background: '#dc2626', color: '#fff', cursor: onEmptyClick ? 'pointer' : 'default' }}>A</span>
  )
  if (value === 'RS') return (
    <span title="Resigned – after Date of Leaving (not counted in payroll)"
      style={{ ...baseStyle, background: '#7f1d1d', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 'normal' }}>
      <FaUserSlash size={mini ? 9 : 11} />
    </span>
  )
  const hol = HOLIDAY_STYLES[value]
  if (hol) {
    const tip = holidayTitle && holidayTitle.toUpperCase() !== hol.label.toUpperCase() ? `${hol.label} - ${holidayTitle}` : hol.label
    return (
      <span title={onEmptyClick ? `${tip} · Click to raise resignation query` : tip} onClick={onEmptyClick}
        style={{ ...baseStyle, background: hol.bg, color: '#fff', cursor: onEmptyClick ? 'pointer' : 'default' }}>{value}</span>
    )
  }
  return (
    <span title={onEmptyClick ? 'Click to raise resignation query' : undefined} onClick={onEmptyClick}
      style={{ ...baseStyle, background: '#e5e7eb', color: '#6b7280', cursor: onEmptyClick ? 'pointer' : 'default' }}>-</span>
  )
}

/* ========== TABLE BUILDER ========== */
const FROZEN_TOTAL = FROZEN_COL_1_WIDTH + FROZEN_COL_NAME_WIDTH + FROZEN_COL_VENDOR_WIDTH
const COLLAPSED_W = 64
const NET_W = 110

const sumWidth = (cols) => cols.reduce((a, c) => a + parseInt(c.width, 10), 0)
const fixedW = (px) => ({ width: `${px}px`, minWidth: `${px}px`, maxWidth: `${px}px` })

const sortRows = (rows, field, direction) => {
  if (!field) return rows
  const copy = [...rows]
  copy.sort((a, b) => {
    const av = (a[field] || '').toString().toLowerCase()
    const bv = (b[field] || '').toString().toLowerCase()
    if (av < bv) return direction === 'asc' ? -1 : 1
    if (av > bv) return direction === 'asc' ? 1 : -1
    return 0
  })
  return copy
}

const buildSkillStats = (rows, category, loading) => {
  const counts = {}
  for (const p of rows) {
    const k = skillFilterKey(p.skillCat)
    counts[k] = (counts[k] || 0) + 1
  }

  const categories = (CATEGORY_SKILLS[category] || []).map((label) => {
    const key = canonSkill(label)
    return {
      key, label,
      colors: SKILL_COLORS[normSkill(label)] || SKILL_COLOR_FALLBACK,
      count: counts[key] || 0,
    }
  })

  return [
    { label: 'Total Employees', value: loading ? '…' : rows.length, icon: FaUsers, bg: '#e9edfd', fg: '#4e73df', filterValue: 'ALL' },
    ...categories.map((c) => ({
      label: c.label, value: loading ? '…' : c.count, icon: FaUsers,
      bg: c.colors.bg, fg: c.colors.color, filterValue: c.key,
    })),
  ]
}

const buildTable = ({
  periodObj, isPrev, startIdx, collapsed, containerWidth, category,
  minDays = 0, onEmptyClick, attendanceOnly = false,
}) => {
  const days = periodObj ? buildDays(periodObj.fromDate, periodObj.toDate) : []

  const frozenCols = [
    { name: 'S.No', selector: (_, i) => startIdx + i + 1, ...fixedW(FROZEN_COL_1_WIDTH), center: true, grow: 0 },
    {
      name: 'Employee Name', selector: (row) => row.empNm, sortable: true, sortField: 'empNm',
      ...fixedW(FROZEN_COL_NAME_WIDTH),
      style: { justifyContent: 'flex-start', whiteSpace: 'nowrap' },
      cell: (row) => {
        const pill = checkerPill(row.checkerStatus)
        return (
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, padding: '3px 0' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 500, fontSize: '12px', color: '#1f2937' }}>{row.empNm}</span>
              {row.leavingDate && (
                <span title={`Resigned – Date of Leaving: ${fmtDate(String(row.leavingDate).slice(0, 10))}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.2px', color: '#fff', background: '#dc2626', borderRadius: '10px', padding: '0 6px', lineHeight: '14px', flexShrink: 0 }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                  RESIGNED
                </span>
              )}
              {pill && !isPrev && (
                <span title={`Checker status: ${pill.label}`}
                  style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.2px', color: '#fff', background: pill.bg, borderRadius: '10px', padding: '0 6px', lineHeight: '14px', flexShrink: 0 }}>
                  {pill.label}
                </span>
              )}
            </span>
            <span style={{ fontSize: '9.5px', color: '#8b8fa3', fontWeight: 500 }}>
              {row.empId}{row.skillCat ? ` | ${row.skillCat}` : ''}
            </span>
            {isPrev && periodObj && (
              <span title={`Previous period: ${fmtDate(periodObj.fromDate)} to ${fmtDate(periodObj.toDate)}`}
                style={{ alignSelf: 'flex-start', marginTop: '2px', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.2px', color: '#b45309', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '4px', padding: '0 5px', lineHeight: '14px' }}>
                PREVIOUS · {fmtShort(periodObj.fromDate)} – {fmtShort(periodObj.toDate)}
              </span>
            )}
          </div>
        )
      },
      grow: 0,
    },
    {
      name: 'Vendor', selector: (row) => row.vendorName, sortable: true, sortField: 'vendorName',
      ...fixedW(FROZEN_COL_VENDOR_WIDTH),
      style: { justifyContent: 'flex-start', fontWeight: 500, whiteSpace: 'nowrap' },
      cell: (row) => row.vendorName ? row.vendorName : <span style={{ color: '#9ca3af' }}>-</span>,
      grow: 0,
    },
  ]

  const WORKED_VALUES = [1, 'HP', 'OP']
  const lastWorkedIdx = (row) => {
    for (let i = days.length - 1; i >= 0; i--) {
      if (WORKED_VALUES.includes(row.attendance[days[i].key])) return i
    }
    return -1
  }

  const dayCols = days.map((dy, dayIdx) => ({
    name: <span title={fmtDate(dy.key)}>{dy.day}</span>,
    selector: (row) => row.attendance[dy.key],
    ...fixedW(DAY_COL_W), center: true, compact: true,
    style: { paddingLeft: 0, paddingRight: 0 },
    cell: (row) => {
      const v = row.attendance[dy.key]
      const isCandidate = v === null || v === undefined || v === 0 || HOLIDAY_CODES.includes(v)
      const canClick = !isPrev && !!onEmptyClick && isCandidate && dayIdx > lastWorkedIdx(row)
      return (
        <AttendanceBadge value={v} holidayTitle={row.holidayNames[dy.key]} info={row.dayInfo[dy.key]}
          onEmptyClick={canClick ? (e) => onEmptyClick(e, row, dy.key) : undefined} />
      )
    },
  }))

  const padCount = Math.max(0, minDays - days.length)
  const fillerCols = Array.from({ length: padCount }, () => ({
    name: '', selector: () => '', ...fixedW(DAY_COL_W), center: true, compact: true,
    style: { paddingLeft: 0, paddingRight: 0 }, cell: () => null,
  }))

  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.CL
  const mkCols = (group, defs) => defs.map((d) => {
    const w = parseInt(d.width, 10)
    return {
      name: d.name,
      selector: (r) => {
        const v = r[group] && r[group][d.key]
        return (v === undefined || v === null) ? 0 : v
      },
      ...fixedW(w), center: true,
      cell: (r) => {
        const raw = r[group] && r[group][d.key]
        if (raw === undefined || raw === null) return <span style={{ color: '#9ca3af' }}>-</span>
        return raw
      },
      ...(d.style ? { style: d.style } : {}),
    }
  })
  const summaryCols = mkCols('attendanceSummary', cfg.summary)
  const provisionCols = mkCols('provisions', cfg.provisions)
  const earningCols = mkCols('earnings', cfg.earnings)
  const deductionCols = mkCols('deductions', cfg.deductions)

  const netCols = [{
    name: cfg.netName, selector: (r) => r.netPayable, ...fixedW(NET_W), center: true,
    cell: (row) => row.netPayable
      ? <span style={{ fontWeight: 700, color: '#6b4fa1' }}>₹{row.netPayable.toLocaleString()}</span>
      : <span style={{ color: '#9ca3af' }}>-</span>,
  }]

  const remarksCols = [{
    name: 'Remarks', selector: (r) => r.remarks, ...fixedW(REMARKS_W),
    style: { justifyContent: 'flex-start', whiteSpace: 'normal' },
    cell: (row) => row.remarks ? <span title={row.remarks}>{row.remarks}</span> : <span style={{ color: '#9ca3af' }}>-</span>,
  }]

  const groups = [
    {
      key: 'attendance', label: 'DAILY ATTENDANCE', short: 'ATTEND.',
      sub: periodObj ? `(${fmtShort(periodObj.fromDate)} – ${fmtShort(periodObj.toDate)})` : undefined,
      bg: '#6d28d9', color: '#fff',
      cols: [...dayCols, ...fillerCols],
    },
    { key: 'summary', label: 'ATTENDANCE SUMMARY', short: 'SUMMARY', bg: '#ea580c', color: '#fff', cols: summaryCols },
    { key: 'provisions', label: 'VARIABLE INPUTS (UPLOAD / EDIT)', short: 'VARIABLE', bg: '#b91c1c', color: '#fff', cols: provisionCols },
    { key: 'earnings', label: 'EARNINGS', short: 'EARNINGS', bg: '#15803d', color: '#fff', cols: earningCols },
    { key: 'deductions', label: 'DEDUCTIONS', short: 'DEDUCT.', bg: '#d97706', color: '#fff', cols: deductionCols },
  ].filter((g) => g.cols.length > 0 && (!attendanceOnly || g.key === 'attendance' || g.key === 'summary'))

  const scalable = []
  groups.forEach((g) => { if (!collapsed[g.key]) scalable.push(...g.cols) })
  if (!attendanceOnly) scalable.push(...netCols)
  const collapsedCount = groups.filter((g) => collapsed[g.key]).length
  const baseScalable = sumWidth(scalable)
  const tailW = attendanceOnly ? 0 : REMARKS_W
  const baseTotal = FROZEN_TOTAL + collapsedCount * COLLAPSED_W + baseScalable + tailW
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
  const defs = [{ key: 'emp', label: 'EMPLOYEE DETAILS', width: FROZEN_TOTAL, bg: '#ede9fe', color: '#5b21b6', sticky: true }]

  groups.forEach((g) => {
    const isCollapsed = !!collapsed[g.key]
    if (isCollapsed) {
      allCols.push({
        name: '', selector: () => '', ...fixedW(COLLAPSED_W), center: true, compact: true,
        cell: () => null, style: { backgroundColor: 'rgba(0,0,0,0.035)' },
      })
    } else {
      allCols.push(...g.cols)
    }
    defs.push({
      key: g.key, label: g.label, short: g.short, sub: g.sub,
      width: isCollapsed ? COLLAPSED_W : sumWidth(g.cols),
      bg: g.bg, color: g.color, collapsible: true, collapsed: isCollapsed,
    })
  })

  if (!attendanceOnly) {
    allCols.push(...netCols)
    defs.push({ key: 'net', label: 'Net Payable', width: sumWidth(netCols), bg: '#1e3a8a', color: '#fff' })

    allCols.push(...remarksCols)
    defs.push({ key: 'remarks', label: 'Remarks', width: REMARKS_W, bg: '#334155', color: '#fff' })
  }

  return {
    columns: allCols, groupDefs: defs,
    TOTAL_WIDTH: defs.reduce((a, d) => a + d.width, 0),
  }
}

const FilterChip = ({ label, value, onRemove }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: '#ede9fe', color: '#4c1d95', border: '1px solid #ddd6fe',
    borderRadius: '999px', padding: '4px 6px 4px 12px', fontSize: '12px', fontWeight: 600, maxWidth: '260px',
  }}>
    <span style={{ color: '#7c6bb5', fontWeight: 600 }}>{label}:</span>
    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
    <button type="button" onClick={onRemove} title={`Remove ${label}`}
      style={{ border: 'none', background: '#ddd6fe', color: '#5b21b6', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
      <FaTimes size={9} />
    </button>
  </span>
)

const UploadIssuesToast = ({ title, issues }) => (
  <div>
    <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
    <div style={{ maxHeight: 220, overflowY: 'auto', fontSize: 12, lineHeight: 1.4 }}>
      {issues.map((i, idx) => (
        <div key={`${i.rowNumber}-${idx}`} style={{ padding: '4px 0', borderTop: idx ? '1px solid rgba(0,0,0,0.12)' : 'none' }}>
          <b>{i.employeeId || '(blank ID)'}</b>
          {i.employeeName ? ` – ${i.employeeName}` : ''}{' '}
          <span style={{ opacity: 0.7 }}>{i.rowNumber > 0 ? `(Row ${i.rowNumber})` : '(Not in Excel)'}</span>
          <div>{i.reason}</div>
        </div>
      ))}
    </div>
  </div>
)

/* ============================================================
   MULTI-STAGE STATUS SUMMARY LABEL
   ============================================================ */
const STAGE_HEAD = {
  PENDING:         { label: 'PENDING',         color: '#9a3412' },
  VERIFYING:       { label: 'VERIFYING',       color: '#1d4ed8' },
  APPROVE_PENDING: { label: 'APPROVE PENDING', color: '#7c3aed' },
  APPROVING:       { label: 'APPROVING',       color: '#047857' },
}

const STAGE_ORDER = { PENDING: 1, VERIFYING: 2, APPROVE_PENDING: 3, APPROVING: 4 }

const badgeBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: '20px', height: '18px', padding: '0 4px',
  borderRadius: '4px', fontWeight: 800, fontSize: '10.5px',
  border: 'none', outline: 'none',
  transition: 'transform .12s ease, box-shadow .12s ease',
}

const StatusSummaryLabel = ({ status, loading, activeFilter, onSelect }) => {
  if (loading)
    return <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.85)' }}>Loading status…</p>

  const safeStatus = status || {}

  const stages = (Array.isArray(safeStatus.stages) && safeStatus.stages.length > 0)
    ? safeStatus.stages
    : [{
        stage: safeStatus.stage || 'PENDING',
        total: safeStatus.totalEmployees ?? 0,
        verify: safeStatus.verifyCount ?? 0,
        hold: safeStatus.holdCount ?? 0,
        reject: safeStatus.rejectCount ?? 0,
        approve: safeStatus.approveCount ?? 0,
      }]

  const ordered = [...stages].sort(
    (a, b) => (STAGE_ORDER[a.stage] || 99) - (STAGE_ORDER[b.stage] || 99)
  )

  const sep = { color: '#9ca3af', fontWeight: 700, margin: '0 2px', fontSize: '10px' }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
      {ordered.map((s) => {
        const head = STAGE_HEAD[s.stage] || STAGE_HEAD.PENDING
        const showApprove = s.stage === 'APPROVE_PENDING'

        const items = [
          { filter: 'all',    label: 'Total',  count: s.total ?? 0,   bg: '#f3f4f6', fg: '#111827' },
          { filter: 'verify', label: 'Verify', count: s.verify ?? 0,  bg: '#dcfce7', fg: '#16a34a' },
          { filter: 'hold',   label: 'Hold',   count: s.hold ?? 0,    bg: '#ffedd5', fg: '#ea580c' },
          { filter: 'reject', label: 'Reject', count: s.reject ?? 0,  bg: '#fee2e2', fg: '#dc2626' },
          ...(showApprove
            ? [{ filter: 'approve', label: 'Approve', count: s.approve ?? 0, bg: '#dbeafe', fg: '#1d4ed8' }]
            : []),
        ]

        return (
          <div key={s.stage} style={{ margin: 0, display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            <span
              title={`${head.label} · Total: ${s.total} · Verify: ${s.verify} · Hold: ${s.hold} · Reject: ${s.reject}${showApprove ? ` · Approve: ${s.approve}` : ''}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 8px', borderRadius: '6px',
                fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.2px',
                color: head.color, background: '#ffffff', border: '1px solid #ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: head.color }}>{head.label} -</span>
              {items.map((it, idx) => {
                const activeKey = `${s.stage}:${it.filter}`
                const isActive = activeFilter === activeKey
                const disabled = it.count === 0 && !isActive
                return (
                  <React.Fragment key={it.filter}>
                    {idx > 0 && <span style={sep}>/</span>}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelect && onSelect({ stage: s.stage, bucket: it.filter })}
                      title={
                        disabled
                          ? `No ${it.label.toLowerCase()} records`
                          : (isActive
                              ? `Showing ${it.label} — click to go back`
                              : `Show ${it.label} employees in the grid`)
                      }
                      style={{
                        ...badgeBase,
                        background: it.bg,
                        color: it.fg,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.5 : 1,
                        boxShadow: isActive ? `0 0 0 2px #fff, 0 0 0 4px ${it.fg}` : 'none',
                        transform: isActive ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      {it.count}
                    </button>
                  </React.Fragment>
                )
              })}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ============================================================================================
   MAIN COMPONENT
   ============================================================================================ */
const PayrollMaker = () => {
  const [viewMode, setViewMode] = useState('live')
  const [category, setCategory] = useState('CL')

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [activeCardFilter, setActiveCardFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [rpp, setRpp] = useState(10)
  const [sortField, setSortField] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')

  const [collapsed, setCollapsed] = useState({})
  const [containerWidth, setContainerWidth] = useState(0)
  const [isTableScrolled, setIsTableScrolled] = useState(false)
  const toggleGroup = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))

  const [liveRows, setLiveRows] = useState([])
  const [livePeriod, setLivePeriod] = useState(null)
  const [liveLoading, setLiveLoading] = useState(true)
  const liveReq = useRef(0)

  const [payrollRows, setPayrollRows] = useState([])
  const [payrollPeriod, setPayrollPeriod] = useState(null)
  const [payrollLoading, setPayrollLoading] = useState(false)

  const [settingsPeriod, setSettingsPeriod] = useState(null)

  /* STATUS VIEW — bucket + stage */
  const [statusFilter, setStatusFilter] = useState(null)
  const [statusStage, setStatusStage] = useState(null)
  const [statusRows, setStatusRows] = useState([])
  const [statusRowsLoading, setStatusRowsLoading] = useState(false)
  const statusFilterRef = useRef(null)
  const statusStageRef = useRef(null)
  const statusRowsReq = useRef(0)
  const changeStatusFilter = (v) => { statusFilterRef.current = v; setStatusFilter(v) }
  const changeStatusStage = (v) => { statusStageRef.current = v; setStatusStage(v) }

  const [statusSummary, setStatusSummary] = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const statusReq = useRef(0)

  const [submitSuccessModal, setSubmitSuccessModal] = useState(null)

  const [analysisMode, setAnalysisMode] = useState(false)
  const [analysisSections, setAnalysisSections] = useState([])
  const [analysisQuery, setAnalysisQuery] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [anaPeriodKeys, setAnaPeriodKeys] = useState([])
  const [anaSkill, setAnaSkill] = useState('')
  const [anaVendor, setAnaVendor] = useState('')
  const [anaFilterOpen, setAnaFilterOpen] = useState(false)
  const anaFilterRef = useRef(null)
  const [prevPage, setPrevPage] = useState(1)
  const [prevRpp, setPrevRpp] = useState(10)

  const [periods, setPeriods] = useState([])
  const [periodsLoading, setPeriodsLoading] = useState(false)

  const [lastSynced, setLastSynced] = useState(null)
  const [syncing, setSyncing] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const tableScrollRef = useRef(null)
  const fileInputRef = useRef(null)

  const [resignPopup, setResignPopup] = useState(null)
  const [resignRemarks, setResignRemarks] = useState('')
  const [resignSending, setResignSending] = useState(false)
  const popupRef = useRef(null)

  const isLive = viewMode === 'live'
  const isHistory = viewMode === 'history'
  const isPayroll = viewMode === 'payroll'

  const isStatusView = isPayroll && !!statusFilter
  const statusLocked = isStatusView && statusFilter !== 'reject'
  const locked = analysisMode || isHistory || statusLocked

  const activeRows = isLive ? liveRows : (isStatusView ? statusRows : payrollRows)
  const activePeriod = isLive ? livePeriod : payrollPeriod
  const activeLoading = isLive
    ? liveLoading
    : (isStatusView ? (statusRowsLoading || payrollLoading) : payrollLoading)

  const hasUploadedData = useMemo(
    () => payrollRows.some((p) =>
      Object.keys(p.provisions || {}).length > 0 ||
      Object.keys(p.earnings || {}).length > 0 ||
      Object.keys(p.deductions || {}).length > 0 ||
      !!p.netPayable
    ),
    [payrollRows]
  )

  const displayPeriod = useMemo(() => {
    if (isHistory && payrollPeriod?.fromDate && payrollPeriod?.toDate) {
      return { fromDate: payrollPeriod.fromDate, toDate: payrollPeriod.toDate }
    }
    if (settingsPeriod?.fromDate && settingsPeriod?.toDate) {
      return { fromDate: settingsPeriod.fromDate, toDate: settingsPeriod.toDate }
    }
    if (statusSummary?.fromDate && statusSummary?.toDate) {
      return { fromDate: statusSummary.fromDate, toDate: statusSummary.toDate }
    }
    return null
  }, [isHistory, payrollPeriod, settingsPeriod, statusSummary])

  /* ============ RESIGN ============ */
  const openResignPopup = useCallback((e, row, dateKey) => {
    const r = e.currentTarget.getBoundingClientRect()
    const W = 290, H = 250
    let x = r.right + 10
    if (x + W > window.innerWidth - 8) x = r.left - W - 10
    const y = Math.min(Math.max(8, r.top - 24), window.innerHeight - H - 8)
    setResignRemarks('')
    setResignPopup({ x, y, empId: row.empId, empNm: row.empNm, vendor: row.vendorName, leavingDate: row.leavingDate || '', dateKey })
  }, [])

  const closeResignPopup = useCallback(() => setResignPopup(null), [])

  useEffect(() => {
    if (!resignPopup) return undefined
    const onDown = (e) => { if (popupRef.current && !popupRef.current.contains(e.target)) setResignPopup(null) }
    const onKey = (e) => { if (e.key === 'Escape') setResignPopup(null) }
    const onScroll = (e) => { if (!popupRef.current || !popupRef.current.contains(e.target)) setResignPopup(null) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', closeResignPopup)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', closeResignPopup)
    }
  }, [resignPopup, closeResignPopup])

  const handleSendResign = async () => {
    if (!resignPopup) return
    try {
      setResignSending(true)
      const res = await fetch(`${API_BASE_URL}/PayrollEmployee/resign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: resignPopup.empId, employeeName: resignPopup.empNm,
          category, vendor: resignPopup.vendor, remarks: resignRemarks.trim(),
          resignDate: resignPopup.dateKey,
        }),
      })
      if (!res.ok) { const t = await res.text(); throw new Error(t || `Request failed (${res.status})`) }
      const result = await res.json()
      toast.success(result.message || 'Query sent to Admin')
      setResignPopup(null)
    } catch (err) {
      console.error(err); toast.error(`Failed: ${err.message}`)
    } finally { setResignSending(false) }
  }

  /* ============ SYNC ============ */
  const loadLastSynced = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/AttendanceSync/last-sync`)
      if (!res.ok) return
      const data = await res.json()
      setLastSynced(data.lastUpdated || null)
    } catch (err) { console.error(err) }
  }

  /* ============ STATUS SUMMARY ============ */
  const loadStatusSummary = async (cat = category) => {
    const reqId = ++statusReq.current
    setStatusLoading(true)
    try {
      const url = `${API_BASE_URL}/PayrollEmployee/status-summary?category=${encodeURIComponent(cat)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data = await res.json()
      if (reqId !== statusReq.current) return
      setStatusSummary(data || null)
    } catch (err) {
      console.error('[status-summary] failed:', err)
      if (reqId === statusReq.current) setStatusSummary(null)
    } finally {
      if (reqId === statusReq.current) setStatusLoading(false)
    }
  }

  /* ============ STATUS VIEW ROWS (with stage) ============ */
  const loadStatusRows = async (filter, stage = null, cat = category) => {
    if (!filter) return
    const reqId = ++statusRowsReq.current
    setStatusRowsLoading(true)
    try {
      const params = new URLSearchParams({ category: cat, status: filter })
      if (stage) params.set('stage', stage)
      const res = await fetch(`${API_BASE_URL}/PayrollEmployee/by-status?${params.toString()}`)
      if (!res.ok) {
        const t = await res.text(); throw new Error(t || `Request failed (${res.status})`)
      }
      const data = await res.json()
      if (reqId !== statusRowsReq.current) return
      const mapped = (data.employees || []).map((e) => buildPayrollRow(e, data.period))
      setStatusRows(mapped)
    } catch (err) {
      console.error(err)
      if (reqId === statusRowsReq.current) {
        setStatusRows([])
        toast.error(`Failed to load ${STATUS_VIEW_LABELS[filter] || 'status'} records: ${err.message}`)
      }
    } finally {
      if (reqId === statusRowsReq.current) setStatusRowsLoading(false)
    }
  }

  /* ============ LIVE ============ */
  const loadLive = async (cat = category) => {
    const reqId = ++liveReq.current
    setLiveLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/PayrollEmployee/live?category=${encodeURIComponent(cat)}`)
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data = await res.json()
      if (reqId !== liveReq.current) return
      setLivePeriod(data.period || null)
      const mapped = (data.employees || []).map((e) => buildPayrollRow(e, data.period))
      setLiveRows(mapped)
      loadLastSynced()
      loadPeriods(cat)
    } catch (err) {
      console.error(err)
      if (reqId === liveReq.current) toast.error('Failed to load live attendance')
    } finally {
      if (reqId === liveReq.current) setLiveLoading(false)
    }
  }

  const handleManualSync = async () => {
    if (syncing) return
    try {
      setSyncing(true)
      const res = await fetch(`${API_BASE_URL}/AttendanceSync/manual-sync`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Sync failed (${res.status})`)
      setLastSynced(data.lastUpdated || null)
      toast.success(data.message || 'Attendance synced')
      if (isLive) await loadLive(category)
      await loadStatusSummary(category)
    } catch (err) {
      console.error(err); toast.error(`Sync failed: ${err.message}`)
    } finally { setSyncing(false) }
  }

  /* ============ PERIODS / PAYROLL ============ */
  const loadPeriods = async (cat = category) => {
    setPeriodsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/PayrollEmployee/periods?category=${encodeURIComponent(cat)}`)
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data = await res.json()
      setPeriods(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err); toast.error('Failed to load payroll periods')
    } finally { setPeriodsLoading(false) }
  }

  const loadPayroll = async (cat = category) => {
    setPayrollLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/PayrollEmployee?category=${encodeURIComponent(cat)}`)
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data = await res.json()
      setPayrollPeriod(data.period || null)

      if (data?.period?.fromDate && data?.period?.toDate) {
        setSettingsPeriod({ fromDate: data.period.fromDate, toDate: data.period.toDate })
      }

      const mapped = (data.employees || []).map((e) => buildPayrollRow(e, data.period))
      setPayrollRows(mapped)
      loadStatusSummary(cat)
      loadPeriods(cat)

      if (statusFilterRef.current)
        loadStatusRows(statusFilterRef.current, statusStageRef.current, cat)
    } catch (err) {
      console.error(err); toast.error('Failed to load payroll data')
    } finally { setPayrollLoading(false) }
  }

  /* ============ NAVIGATION ============ */
  const handleReadyForPayroll = async () => {
    setResignPopup(null)
    changeStatusFilter(null)
    changeStatusStage(null)
    setViewMode('payroll')
    setPage(1); setSortField(null); setSortDirection('asc'); setActiveCardFilter('ALL')
    await Promise.all([loadPayroll(category), loadStatusSummary(category)])
  }

  const handleGoLive = async () => {
    exitAnalysis()
    changeStatusFilter(null)
    changeStatusStage(null)
    setAnaPeriodKeys([]); setAnaSkill(''); setAnaVendor('')
    setResignPopup(null)
    setViewMode('live')
    setPage(1); setSortField(null); setSortDirection('asc'); setActiveCardFilter('ALL')
    setSearchInput(''); setSearch('')
    await Promise.all([loadLive(category), loadPeriods(category)])
  }

  const handlePeriodClick = async (p) => {
    const key = periodKey(p)
    if (!key) return
    if (key === periodKey(payrollPeriod) && isPayroll && !statusFilterRef.current) return
    exitAnalysis()
    changeStatusFilter(null)
    changeStatusStage(null)
    setResignPopup(null)
    try {
      setViewMode('history')
      setPayrollLoading(true)
      setPage(1); setSortField(null); setSortDirection('asc'); setActiveCardFilter('ALL')
      const res = await fetch(
        `${API_BASE_URL}/PayrollEmployee/history?category=${encodeURIComponent(category)}` +
        `&from=${encodeURIComponent(p.fromDate)}&to=${encodeURIComponent(p.toDate)}`
      )
      if (!res.ok) {
        const t = await res.text(); throw new Error(t || `History failed (${res.status})`)
      }
      const data = await res.json()
      const periodObj = data.period || { fromDate: p.fromDate, toDate: p.toDate }
      const rows = (data.employees || []).map((e) => buildPayrollRow(e, periodObj))
      setPayrollPeriod(periodObj)
      setPayrollRows(rows)
      if (rows.length === 0) {
        toast.info('No records found for this period')
      }
    } catch (err) {
      console.error(err); toast.error(`Failed to load period: ${err.message}`)
    } finally { setPayrollLoading(false) }
  }

  /* ============ BADGE CLICK (stage + bucket) ============ */
  const handleStatusCardClick = async (payload) => {
    if (!payload) return
    const bucket = typeof payload === 'string' ? payload : payload.bucket
    const stage  = typeof payload === 'string' ? null    : payload.stage
    if (!bucket) return

    exitAnalysis()
    setResignPopup(null)
    setPage(1); setSortField(null); setSortDirection('asc'); setActiveCardFilter('ALL')
    setSearchInput(''); setSearch('')

    const sameAgain = isPayroll
      && statusFilterRef.current === bucket
      && statusStageRef.current  === stage
    const nextBucket = sameAgain ? null : bucket
    const nextStage  = sameAgain ? null : stage

    changeStatusFilter(nextBucket)
    changeStatusStage(nextStage)

    if (!isPayroll) {
      setViewMode('payroll')
      await loadPayroll(category)
      return
    }
    if (nextBucket) await loadStatusRows(nextBucket, nextStage, category)
    else {
      setStatusRows([])
      setStatusRowsLoading(false)
    }
  }

  /* ============ ANALYSIS ============ */
  const exitAnalysis = () => {
    setAnalysisMode(false)
    setAnalysisSections([])
    setAnalysisQuery('')
  }

  const handleAnalysis = async () => {
    const q = searchInput.trim()
    if (anaPeriodKeys.length === 0) {
      toast.info('Select at least one period for analysis')
      setAnaFilterOpen(true); return
    }
    if (!q && !anaSkill && !anaVendor) {
      if (analysisMode) exitAnalysis()
      else toast.info('Enter a search, or select a Skill / Vendor for analysis')
      return
    }
    try {
      setAnalysisLoading(true)
      const results = await Promise.all(anaPeriodKeys.map(async (pk) => {
        const params = new URLSearchParams({ category })
        if (q) params.set('search', q)
        if (anaSkill) params.set('skill', anaSkill)
        if (anaVendor) params.set('vendor', anaVendor)
        const [f, t] = pk.split('|')
        params.set('from', f); params.set('to', t)
        const res = await fetch(`${API_BASE_URL}/PayrollEmployee/analysis?${params.toString()}`)
        if (!res.ok) {
          const t2 = await res.text(); throw new Error(t2 || `Analysis failed (${res.status})`)
        }
        const data = await res.json()
        return {
          key: pk, period: data.period,
          rows: (data.employees || []).map((e) => buildPayrollRow(e, data.period)),
        }
      }))
      const sections = results
        .filter((r) => r.period && r.rows.length > 0)
        .sort((a, b) => (a.period.fromDate < b.period.fromDate ? 1 : a.period.fromDate > b.period.fromDate ? -1 : 0))
      if (sections.length === 0) {
        toast.info('No data found for the selected period(s) / filters')
        if (analysisMode) exitAnalysis()
        return
      }
      setAnalysisSections(sections)
      setAnalysisQuery(q)
      setAnalysisMode(true)
    } catch (err) {
      console.error(err); toast.error(`Analysis failed: ${err.message}`)
    } finally { setAnalysisLoading(false) }
  }

  /* ============ EFFECTS ============ */
  useEffect(() => {
    setSearchInput(''); setSearch('')
    setPage(1); setSortField(null); setSortDirection('asc'); setActiveCardFilter('ALL')
    setAnaPeriodKeys([]); setAnaSkill(''); setAnaVendor('')
    exitAnalysis()
    changeStatusFilter(null)
    changeStatusStage(null)
    setStatusRows([])
    setResignPopup(null)

    loadStatusSummary(category)
    loadPeriods(category)
    if (viewMode === 'live') {
      loadLive(category)
    } else if (viewMode === 'history') {
      setViewMode('payroll')
      loadPayroll(category)
    } else {
      loadPayroll(category)
    }

    fetch(`${API_BASE_URL}/PayrollEmployee?category=${encodeURIComponent(category)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.period?.fromDate && data?.period?.toDate) {
          setSettingsPeriod({ fromDate: data.period.fromDate, toDate: data.period.toDate })
        }
      })
      .catch(() => {})

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  useEffect(() => {
    loadLive(category)
    loadLastSynced()
    loadPeriods(category)
    loadStatusSummary(category)

    fetch(`${API_BASE_URL}/PayrollEmployee?category=${encodeURIComponent(category)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.period?.fromDate && data?.period?.toDate) {
          setSettingsPeriod({ fromDate: data.period.fromDate, toDate: data.period.toDate })
        }
      })
      .catch(() => {})

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (analysisMode && searchInput.trim() !== analysisQuery) exitAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  useEffect(() => {
    if (!analysisMode) return
    if (anaPeriodKeys.length === 0) { exitAnalysis(); return }
    handleAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anaPeriodKeys, anaSkill, anaVendor])

  useEffect(() => {
    if (!anaFilterOpen) return undefined
    const onDown = (e) => { if (anaFilterRef.current && !anaFilterRef.current.contains(e.target)) setAnaFilterOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setAnaFilterOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [anaFilterOpen])

  useEffect(() => {
    const el = tableScrollRef.current
    if (!el) return undefined
    const onScroll = (e) => setIsTableScrolled(e.target.scrollLeft > 0)
    el.addEventListener('scroll', onScroll, true)
    return () => el.removeEventListener('scroll', onScroll, true)
  }, [])

  useEffect(() => {
    const el = tableScrollRef.current
    if (!el) return undefined
    const update = () => setContainerWidth(Math.floor(el.clientWidth))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ============ FILTER / SORT / PAGER ============ */
  const filtered = useMemo(() => {
    let rows = activeRows
    if (activeCardFilter !== 'ALL') rows = rows.filter((p) => skillFilterKey(p.skillCat) === activeCardFilter)
    if (analysisMode) {
      if (anaSkill) rows = rows.filter((p) => skillFilterKey(p.skillCat) === canonSkill(anaSkill))
      if (anaVendor) {
        const v = anaVendor.trim().toLowerCase()
        rows = rows.filter((p) => (p.vendorName || '').trim().toLowerCase() === v)
      }
    }
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((p) => p.empId.toLowerCase().includes(q) || p.empNm.toLowerCase().includes(q))
  }, [activeRows, search, activeCardFilter, analysisMode, anaSkill, anaVendor])

  const sortedFiltered = useMemo(
    () => sortRows(filtered, sortField, sortDirection),
    [filtered, sortField, sortDirection]
  )

  const sortedPrevSections = useMemo(
    () => (analysisMode
      ? analysisSections.map((sec) => ({ ...sec, rows: sortRows(sec.rows, sortField, sortDirection) }))
      : []),
    [analysisMode, analysisSections, sortField, sortDirection]
  )

  const prevTotal = sortedPrevSections.reduce((m, sec) => Math.max(m, sec.rows.length), 0)
  const prevEffRpp = prevRpp === 'All' ? (prevTotal || 1) : prevRpp
  const prevPages = Math.max(1, Math.ceil(prevTotal / prevEffRpp))
  const prevStart = (prevPage - 1) * prevEffRpp
  const prevEnd = Math.min(prevStart + prevEffRpp, prevTotal)
  const prevPaginated = useMemo(
    () => sortedPrevSections.map((sec) => sec.rows.slice(prevStart, prevEnd)),
    [sortedPrevSections, prevStart, prevEnd]
  )

  useEffect(() => { setPrevPage(1) }, [analysisSections, prevRpp, sortField, sortDirection])
  useEffect(() => { setPage(1) }, [search, rpp, category, activeCardFilter, sortField, sortDirection, viewMode, anaSkill, anaVendor, analysisMode, statusFilter, statusStage])

  const effectiveRowsPerPage = rpp === 'All' ? (sortedFiltered.length || 1) : rpp
  const totalRows = sortedFiltered.length
  const totalPages = Math.max(1, Math.ceil(totalRows / effectiveRowsPerPage))
  const startIndex = (page - 1) * effectiveRowsPerPage
  const endIndex = Math.min(startIndex + effectiveRowsPerPage, totalRows)
  const paginatedData = useMemo(
    () => sortedFiltered.slice(startIndex, endIndex),
    [sortedFiltered, startIndex, endIndex]
  )

  const vendorOptions = useMemo(
    () => Array.from(new Set(activeRows.map((p) => (p.vendorName || '').trim()).filter(Boolean))).sort(),
    [activeRows]
  )
  const skillOptions = CATEGORY_SKILLS[category] || []
  const hasAnalysisCriteria = !!(searchInput.trim() || anaSkill || anaVendor)

  const hasAllProvisions = (row, cfg) =>
    cfg.provisions.every((col) => row.provisions[col.key] !== null && row.provisions[col.key] !== undefined)

  const hasBlankAttendance = (row) => {
    if (!payrollPeriod?.fromDate || !payrollPeriod?.toDate) return false
    const days = buildDays(payrollPeriod.fromDate, payrollPeriod.toDate)
    return days.some((d) => {
      const v = row.attendance[d.key]
      return v === null || v === undefined
    })
  }

  const isRowReadyToSubmit = (row, cfg) => {
    if (row.status !== 'Pending') return false
    if (!row.netCalculated) return false
    if (!hasAllProvisions(row, cfg)) return false
    if ((row.attendanceSummary?.outPending || 0) > 0) return false
    if (hasBlankAttendance(row)) return false
    const earningsComplete = cfg.earnings.every((col) => row.earnings[col.key] !== null && row.earnings[col.key] !== undefined)
    const deductionsComplete = cfg.deductions.every((col) => row.deductions[col.key] !== null && row.deductions[col.key] !== undefined)
    return earningsComplete && deductionsComplete
  }

  const opEmployeeCount = useMemo(
    () => payrollRows.filter((p) => (p.attendanceSummary?.outPending || 0) > 0).length,
    [payrollRows]
  )

  const blankEmployeeCount = useMemo(
    () => payrollRows.filter((p) => hasBlankAttendance(p)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payrollRows, payrollPeriod]
  )

  const canSubmit = useMemo(() => {
    if (analysisMode || isHistory || statusLocked) return false
    if (opEmployeeCount > 0 || blankEmployeeCount > 0) return false
    const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.CL
    const pendingRows = payrollRows.filter((p) => p.status === 'Pending')
    return pendingRows.length > 0 && pendingRows.every((p) => isRowReadyToSubmit(p, cfg))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payrollRows, category, analysisMode, isHistory, statusLocked, opEmployeeCount, blankEmployeeCount])

  const pendingCount = useMemo(
    () => payrollRows.filter((p) => p.status === 'Pending').length,
    [payrollRows]
  )

  const missingProvisionCount = useMemo(() => {
    const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.CL
    return payrollRows.filter((p) => p.status === 'Pending' && !hasAllProvisions(p, cfg)).length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payrollRows, category])

  const missingInputsCount = useMemo(() => {
    const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.CL
    return payrollRows.filter((p) => !hasAllProvisions(p, cfg)).length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payrollRows, category])

  const canCalculate = payrollRows.length > 0 && missingInputsCount === 0

  const summaryCards = useMemo(
    () => buildSkillStats(activeRows, category, activeLoading),
    [activeRows, category, activeLoading]
  )

  const livePeriodKeyForBadges = useMemo(() => {
    return periodKey(payrollPeriod) || periodKey(livePeriod)
  }, [payrollPeriod, livePeriod])

  const periodCards = useMemo(() => {
    const curKey = livePeriodKeyForBadges
    const list = periods.map((p) => ({ ...p }))
    list.sort((a, b) => (a.fromDate < b.fromDate ? 1 : a.fromDate > b.fromDate ? -1 : 0))

    const base = (payrollPeriod && payrollPeriod.fromDate) ? parseKey(payrollPeriod.fromDate)
      : (livePeriod && livePeriod.fromDate) ? parseKey(livePeriod.fromDate) : new Date()
    let previousAssigned = false
    return list.map((p) => {
      const key = periodKey(p)
      const isCurrent = key === curKey
      const pFrom = p?.fromDate ? parseKey(p.fromDate) : null
      const diffDays = pFrom ? Math.round((base - pFrom) / 86400000) : 0
      let badge
      if (isCurrent) badge = 'CURRENT'
      else if (diffDays > 0 && !previousAssigned) { badge = 'PREVIOUS'; previousAssigned = true }
      else if (diffDays >= 330) {
        const yrs = Math.round(diffDays / 365)
        badge = `${yrs} YEAR${yrs > 1 ? 'S' : ''} AGO`
      } else if (diffDays > 0) {
        const mths = Math.max(1, Math.round(diffDays / 30.44))
        badge = `${mths} MONTH${mths > 1 ? 'S' : ''} AGO`
      } else badge = 'LATER'
      return { ...p, key, isCurrent, badge }
    })
  }, [periods, payrollPeriod, livePeriod, livePeriodKeyForBadges])

  const analysisPeriodOptions = useMemo(
    () => periodCards.filter((p) => !p.isCurrent),
    [periodCards]
  )

  const selectedPeriodKey = useMemo(() => {
    if (isHistory && payrollPeriod) return periodKey(payrollPeriod)
    return periodKey(livePeriod) || periodKey(payrollPeriod)
  }, [isHistory, payrollPeriod, livePeriod])

  /* ============ EXPORT ============ */
  const handleExport = () => {
    if (sortedFiltered.length === 0) { toast.warning('No data to export'); return }

    let headers; let rows
    if (category === 'NAPS') {
      headers = ['S.No','Emp ID','Name','Skill','Vendor','Present','Half Day','Absent','LOP','Total Working Days','OT Hours','Pay/Days (Full)','Pay/Days (Half)','Attendance Bonus','Earned Wages','OT Earning','Handling Charge','Hostel Fee YMIN Deduction','Net Payable','Status','Checker Status','Transaction ID','Version','Remarks']
      rows = sortedFiltered.map((p, idx) => [
        idx + 1, p.empId, p.empNm, p.skillCat, p.vendorName,
        p.attendanceSummary.present, p.attendanceSummary.halfPresent,
        p.attendanceSummary.absent, p.attendanceSummary.lop, p.attendanceSummary.availDays,
        p.attendanceSummary.otHrs,
        p.earnings.payDaysFull, p.earnings.payDaysHalf,
        p.earnings.attnBonus, p.earnings.earnedWages,
        p.earnings.otEarning, p.earnings.handlingCharge,
        p.deductions.hostelFee, p.netPayable, p.status, p.checkerStatus, p.transactionId, p.version, p.remarks,
      ])
    } else {
      headers = ['S.No','Emp ID','Name','Skill','Vendor','Present','Half Day','Absent','LOP','Total Working Days','OT Hours','Pay/Days (Full)','Pay/Days (Half)','Attendance Bonus','Earned Basic+DA','Earned HRA','OT Amount','Gross','EPF','ESI','Bonus','Ser/char','LWF','Total','Hostel Deduction','PF Deduction','ESI Deduction','Net Payable','Status','Checker Status','Transaction ID','Version','Remarks']
      rows = sortedFiltered.map((p, idx) => [
        idx + 1, p.empId, p.empNm, p.skillCat, p.vendorName,
        p.attendanceSummary.present, p.attendanceSummary.halfPresent,
        p.attendanceSummary.absent, p.attendanceSummary.lop, p.attendanceSummary.availDays,
        p.attendanceSummary.otHrs,
        p.earnings.payDaysFull, p.earnings.payDaysHalf, p.earnings.attnBonus,
        p.earnings.earnedBasicDa, p.earnings.earnedHra, p.earnings.otAmount, p.earnings.gross,
        p.earnings.pf, p.earnings.esi, p.earnings.bonus, p.earnings.serChar,
        p.earnings.lwf, p.earnings.total,
        p.deductions.hostelDeduction, p.deductions.pf, p.deductions.esi,
        p.netPayable, p.status, p.checkerStatus, p.transactionId, p.version, p.remarks,
      ])
    }

    let csv = headers.join(',') + '\n'
    rows.forEach((row) => { csv += row.map((c) => `"${c === undefined || c === null ? '' : c}"`).join(',') + '\n' })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const statusPart = isStatusView ? `_${statusStage || ''}_${statusFilter}` : ''
    a.download = `payroll_${category}${statusPart}_${activePeriod?.fromDate || displayPeriod?.fromDate || new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a); a.click()
    window.URL.revokeObjectURL(url); document.body.removeChild(a)
    toast.success('Payroll exported successfully')
  }

  const handleDownloadTemplate = () => {
    if (payrollRows.length === 0) { toast.warning('No employees to build the template'); return }
    const provCols = (CATEGORY_CONFIG[category] || CATEGORY_CONFIG.CL).provisions
    const headers = ['Emp ID', 'Name', ...provCols.map((c) => c.name)]
    const rows = payrollRows.map((p) => [p.empId, p.empNm, ...provCols.map(() => '')])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll')
    XLSX.writeFile(wb, `payroll_template_${category}${payrollPeriod?.fromDate ? '_' + payrollPeriod.fromDate : ''}.xlsx`)
    toast.success('Template downloaded')
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (locked) return
    if (!/\.(xlsx|xls)$/i.test(file.name)) { toast.error('Please select an Excel (.xlsx / .xls) file'); return }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)
      formData.append('createdBy', getLoggedInUserName())
      const res = await fetch(`${API_BASE_URL}/PayrollEmployee/upload`, { method: 'POST', body: formData })

      if (!res.ok) {
        const raw = await res.text()
        let msg = raw || `Upload failed (${res.status})`
        let issues = []
        try {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') {
            msg = parsed.message || msg
            issues = Array.isArray(parsed.issues) ? parsed.issues : []
          }
        } catch { /* plain text */ }
        const err = new Error(msg); err.issues = issues; throw err
      }

      const result = await res.json()
      if (Array.isArray(result.issues) && result.issues.length > 0) {
        toast.warning(<UploadIssuesToast title={result.message || 'Some rows were not uploaded'} issues={result.issues} />,
          { autoClose: false, closeOnClick: false })
      } else {
        toast.success(result.message || 'Payroll data uploaded successfully')
      }
      await loadPayroll(category)
    } catch (err) {
      console.error(err)
      if (err.issues && err.issues.length > 0) {
        toast.error(<UploadIssuesToast title={`Upload failed: ${err.message}`} issues={err.issues} />,
          { autoClose: false, closeOnClick: false })
      } else {
        toast.error(`Upload failed: ${err.message}`)
      }
    } finally { setUploading(false) }
  }

  const handleCalculatePayroll = async () => {
    if (locked || !canCalculate) {
      if (missingInputsCount > 0)
        toast.warning(`${missingInputsCount} employee(s) still have no Variable Inputs — upload all before calculating`)
      return
    }
    try {
      setCalculating(true)
      const res = await fetch(
        `${API_BASE_URL}/PayrollEmployee/calculate?category=${encodeURIComponent(category)}&user=${encodeURIComponent(getLoggedInUserName())}`,
        { method: 'POST' }
      )
      if (!res.ok) { const t = await res.text(); throw new Error(t || `Calculation failed (${res.status})`) }
      const result = await res.json()
      toast.success(result.message || 'Payroll calculated successfully')
      await Promise.all([loadPayroll(category), loadStatusSummary(category)])
    } catch (err) {
      console.error(err); toast.error(`Calculate payroll failed: ${err.message}`)
    } finally { setCalculating(false) }
  }

  const handleSubmitPayroll = async () => {
    if (!canSubmit || submitting || locked) return
    setSubmitting(true)
    try {
      const res = await fetch(
        `${API_BASE_URL}/PayrollEmployee/submit?category=${encodeURIComponent(category)}&user=${encodeURIComponent(getLoggedInUserName())}`,
        { method: 'POST', headers: { Accept: 'application/json' } }
      )

      let data = {}
      const text = await res.text()
      try { data = text ? JSON.parse(text) : {} } catch { data = {} }

      if (!res.ok || !data.success) {
        const errMsg = (data && data.message) || text || `Submit failed (${res.status})`
        toast.error(typeof errMsg === 'string' ? errMsg : `Submit failed (${res.status})`)
        return
      }

      const txn = (data.transactionId || '').trim()
      const ver = (data.version || 'V1').trim()
      const displayId = txn
        ? (ver ? `${txn}-${ver}` : txn)
        : ''

      setSubmitSuccessModal({
        transactionId: displayId || '—',
        count: data.rowsProcessed || pendingCount || 0,
      })

      await loadPayroll(category)
      await loadStatusSummary(category)
    } catch (err) {
      toast.error(err?.message || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitSuccessOk = async () => {
    setSubmitSuccessModal(null)
    await Promise.all([loadPayroll(category), loadStatusSummary(category), loadPeriods(category)])
  }

  /* ============ analysis helpers ============ */
  const anaFilterCount = anaPeriodKeys.length + (anaSkill ? 1 : 0) + (anaVendor ? 1 : 0)
  const analysisReady = anaPeriodKeys.length > 0 && hasAnalysisCriteria
  const periodLabel = (key) => { const [f, t] = key.split('|'); return `${fmtShort(f)} – ${fmtShort(t)}` }
  const pickLatestPeriods = (n) => setAnaPeriodKeys(analysisPeriodOptions.slice(0, n).map((p) => p.key))
  const toggleAnaPeriod = (key) => setAnaPeriodKeys((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])
  const clearAnaFilters = () => { setAnaPeriodKeys([]); setAnaSkill(''); setAnaVendor('') }
  const runAnalysis = () => { setAnaFilterOpen(false); handleAnalysis() }
  const sectionBadge = (sec) => {
    const c = periodCards.find((x) => x.key === periodKey(sec.period))
    if (!c || !c.badge || c.badge === 'PREVIOUS') return 'PREVIOUS PERIOD'
    return c.badge
  }

  const maxDays = useMemo(() => {
    if (!analysisMode || !payrollPeriod || analysisSections.length === 0) return 0
    return Math.max(
      buildDays(payrollPeriod.fromDate, payrollPeriod.toDate).length,
      ...analysisSections.map((sec) => buildDays(sec.period.fromDate, sec.period.toDate).length)
    )
  }, [analysisMode, payrollPeriod, analysisSections])

  const activeTable = useMemo(() => buildTable({
    periodObj: activePeriod,
    isPrev: false,
    startIdx: startIndex,
    collapsed,
    containerWidth,
    category,
    minDays: maxDays,
    onEmptyClick: locked ? undefined : openResignPopup,
    attendanceOnly: isLive,
  }), [activePeriod, startIndex, collapsed, containerWidth, category, maxDays, openResignPopup, locked, isLive])

  const previousTables = useMemo(
    () => (analysisMode
      ? analysisSections.map((sec) => buildTable({
        periodObj: sec.period, isPrev: true, startIdx: prevStart, collapsed, containerWidth, category,
        minDays: maxDays,
      }))
      : []),
    [analysisMode, analysisSections, collapsed, containerWidth, category, maxDays, prevStart]
  )

  const OUTER_WIDTH = Math.max(activeTable.TOTAL_WIDTH, ...previousTables.map((t) => t.TOTAL_WIDTH))

  const pageBtnStyle = (disabled) => ({
    background: 'transparent', border: 'none',
    color: disabled ? '#d1d5db' : '#4b5563',
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '4px 6px', display: 'flex', alignItems: 'center', fontSize: 14,
  })

  const renderPager = ({ pageN, setPageN, rppN, setRppN, total, pages, start, end }) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', padding: '14px 8px 4px', fontSize: '12px', color: '#4b5563' }}>
      <span style={{ color: '#6b7280' }}>Rows per page</span>
      <select value={rppN}
        onChange={(e) => { const v = e.target.value; setRppN(v === 'All' ? 'All' : Number(v)) }}
        style={{ border: 'none', background: 'transparent', fontSize: '12px', color: '#4b5563', cursor: 'pointer', outline: 'none', paddingRight: '4px' }}>
        <option value={10}>10</option>
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
        <option value="All">All</option>
      </select>
      <span style={{ color: '#6b7280', minWidth: '80px', textAlign: 'center' }}>
        {total === 0 ? '0-0' : `${start + 1}-${end}`} of {total}
      </span>
      <button style={pageBtnStyle(pageN === 1)} disabled={pageN === 1} onClick={() => setPageN(1)}><FaAngleDoubleLeft /></button>
      <button style={pageBtnStyle(pageN === 1)} disabled={pageN === 1} onClick={() => setPageN((p) => Math.max(1, p - 1))}><FaAngleLeft /></button>
      <button style={pageBtnStyle(pageN >= pages)} disabled={pageN >= pages} onClick={() => setPageN((p) => Math.min(pages, p + 1))}><FaAngleRight /></button>
      <button style={pageBtnStyle(pageN >= pages)} disabled={pageN >= pages} onClick={() => setPageN(pages)}><FaAngleDoubleRight /></button>
    </div>
  )

  const renderGroupHeader = (groupDefs, totalWidth) => (
    <div className="payroll-group-header" style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}>
      {groupDefs.map((g) => (
        <div key={g.key}
          className={`group-cell${g.sticky ? ' group-cell--sticky' : ''}${g.collapsible ? ' group-cell--toggle' : ''}`}
          onClick={g.collapsible ? () => toggleGroup(g.key) : undefined}
          title={g.collapsible ? `${g.collapsed ? 'Expand' : 'Collapse'} ${g.label}` : undefined}
          style={{ width: `${g.width}px`, minWidth: `${g.width}px`, maxWidth: `${g.width}px`, background: g.bg, color: g.color }}>
          {g.collapsed ? (
            <><FaPlusSquare size={11} /><span className="group-cell__short">{g.short}</span></>
          ) : (
            <>
              <span className="group-cell__row">{g.collapsible && <FaMinusSquare size={11} />}{g.label}</span>
              {g.sub && <span className="group-cell__sub">{g.sub}</span>}
            </>
          )}
        </div>
      ))}
    </div>
  )

  const renderSectionLabel = (text, periodObj, isPrev) => (
    <div style={{
      position: 'sticky', left: 0, zIndex: 25,
      width: containerWidth ? `${containerWidth}px` : '100%', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', margin: '6px 0',
      borderRadius: '8px',
      background: isPrev ? '#fffbeb' : '#f5f3ff',
      border: isPrev ? '1px solid #fcd34d' : '1px solid #ddd6fe',
      fontSize: '12.5px', color: '#1f2937',
    }}>
      <span style={{ background: isPrev ? '#f59e0b' : '#6d28d9', color: '#fff', fontWeight: 700, fontSize: '10.5px', letterSpacing: '0.4px', borderRadius: '6px', padding: '3px 10px' }}>
        {text}
      </span>
      {periodObj && (
        <>
          <span><span style={{ color: '#6b7280', fontWeight: 600 }}>From:</span> <b>{fmtDate(periodObj.fromDate)}</b></span>
          <span><span style={{ color: '#6b7280', fontWeight: 600 }}>To:</span> <b>{fmtDate(periodObj.toDate)}</b></span>
        </>
      )}
    </div>
  )

  const renderSummaryCards = (cards, activeFilter, onCardClick, extraStyle = {}) => (
    <div className="summary-stats-wrapper" style={{
      display: 'flex', gap: '16px', alignItems: 'center',
      background: '#fff', padding: '18px 20px', borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px', flexWrap: 'wrap',
      ...extraStyle,
    }}>
      {cards.map(({ label, value, icon: Icon, bg, fg, filterValue }) => {
        const isClickable = !!filterValue
        const isActive = isClickable && activeFilter === filterValue
        return (
          <div key={filterValue} onClick={() => onCardClick(filterValue)}
            style={{
              flex: 1, minWidth: '150px', background: bg, borderRadius: '10px',
              padding: '14px 16px',
              cursor: isClickable ? 'pointer' : 'default',
              border: isActive ? `2px solid ${fg}` : '2px solid transparent',
              boxShadow: isActive ? `0 0 0 3px ${fg}22` : 'none',
              transition: 'all 0.15s ease-in-out',
            }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#3f4a6b' }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>{value}</span>
              <Icon size={18} color={fg} />
            </div>
          </div>
        )
      })}
    </div>
  )

  const categoryToggle = (
    <div style={{
      display: 'inline-flex', alignItems: 'center', background: '#f3f4f6',
      borderRadius: '6px', padding: '2px', height: '32px', minHeight: '32px', maxHeight: '32px',
      boxSizing: 'border-box', border: '1px solid #e5e7eb',
    }}>
      {CATEGORIES.map((c) => {
        const active = category === c
        return (
          <button key={c} type="button" onClick={() => setCategory(c)}
            style={{
              border: 'none', cursor: 'pointer', minWidth: '58px', padding: '0 12px',
              fontSize: '11.5px', fontWeight: 700, borderRadius: '4px',
              background: active ? '#5b21b6' : 'transparent',
              color: active ? '#ffffff' : '#6b7280',
              transition: 'background 0.15s, color 0.15s',
              height: '26px', lineHeight: '26px',
              boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {c}
          </button>
        )
      })}
    </div>
  )

  const viewTitle = isLive ? 'LIVE ATTENDANCE' : (isHistory ? 'PREVIOUS PERIOD (HISTORY)' : 'PAYROLL CALCULATION')
  const viewBadgeBg = isLive ? '#16a34a' : (isHistory ? '#f59e0b' : '#5b21b6')
  const viewBadgeLabel = isLive ? 'LIVE' : (isHistory ? 'HISTORY' : 'PAYROLL')

  const STATUS_CHIP_COLORS = {
    all: { bg: '#f3f4f6', fg: '#111827', bd: '#d1d5db' },
    verify: { bg: '#dcfce7', fg: '#15803d', bd: '#86efac' },
    reject: { bg: '#fee2e2', fg: '#b91c1c', bd: '#fca5a5' },
    hold: { bg: '#ffedd5', fg: '#c2410c', bd: '#fdba74' },
    approve: { bg: '#dbeafe', fg: '#1d4ed8', bd: '#93c5fd' },
  }

  const anaLabelStyle = { display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }
  const anaSelectStyle = { width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', fontSize: '13px', color: '#1f2937', padding: '0 10px', outline: 'none', cursor: 'pointer' }

  const filterButton = (
    <div ref={anaFilterRef} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setAnaFilterOpen((v) => !v)} aria-expanded={anaFilterOpen} title="Analysis filters"
        style={{
          position: 'relative', height: '32px', minHeight: '32px', maxHeight: '32px',
          padding: '0 12px', borderRadius: '6px',
          border: anaFilterOpen || anaFilterCount ? '1px solid #7c3aed' : '1px solid #d1d5db',
          background: anaFilterOpen ? '#ede9fe' : '#ffffff',
          color: anaFilterOpen || anaFilterCount ? '#5b21b6' : '#475569',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontWeight: 600, fontSize: '12px', cursor: 'pointer',
          boxSizing: 'border-box', lineHeight: 'normal',
        }}>
        <FaFilter size={11} /> Filter
        {anaFilterCount > 0 && (
          <span style={{ minWidth: '17px', height: '17px', borderRadius: '999px', background: '#5b21b6', color: '#fff', fontSize: '9.5px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', boxSizing: 'border-box' }}>
            {anaFilterCount}
          </span>
        )}
      </button>

      {anaFilterOpen && (
        <div style={{ position: 'absolute', top: '38px', left: 0, zIndex: 60, width: 'min(340px, 90vw)', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 28px rgba(0,0,0,0.16)', padding: '14px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1f2937' }}>Analysis filters</span>
            <button type="button" onClick={() => setAnaFilterOpen(false)} title="Close" style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 4, display: 'flex' }}>
              <FaTimes size={12} />
            </button>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>PERIOD <span style={{ color: '#dc2626' }}>*</span></span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: anaPeriodKeys.length ? '#5b21b6' : '#dc2626' }}>
                {anaPeriodKeys.length ? `${anaPeriodKeys.length} selected` : 'Required'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {[['Previous', 1], ['Last 2', 2], ['Last 3', 3]].map(([label, n]) => (
                <button key={label} type="button" disabled={analysisPeriodOptions.length === 0} onClick={() => pickLatestPeriods(n)}
                  style={{ border: '1px solid #ddd6fe', background: '#f5f3ff', color: '#5b21b6', borderRadius: '999px', padding: '3px 12px', fontSize: '11.5px', fontWeight: 600, cursor: analysisPeriodOptions.length === 0 ? 'not-allowed' : 'pointer', opacity: analysisPeriodOptions.length === 0 ? 0.5 : 1 }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: '170px', overflowY: 'auto', border: '1px solid #ece8f8', borderRadius: '10px', padding: '4px' }}>
              {analysisPeriodOptions.length === 0 ? (
                <div style={{ padding: '10px', fontSize: '12px', color: '#94a3b8' }}>No previous periods available</div>
              ) : analysisPeriodOptions.map((p) => {
                const on = anaPeriodKeys.includes(p.key)
                return (
                  <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px', borderRadius: '8px', cursor: 'pointer', fontSize: '12.5px', background: on ? '#ede9fe' : 'transparent', color: on ? '#4c1d95' : '#374151', fontWeight: on ? 700 : 500 }}>
                    <input type="checkbox" checked={on} onChange={() => toggleAnaPeriod(p.key)} style={{ accentColor: '#5b21b6', cursor: 'pointer' }} />
                    <span style={{ flex: 1 }}>{fmtDate(p.fromDate)} – {fmtDate(p.toDate)}</span>
                    <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.3px', color: '#7c6bb5', background: '#f5f3ff', borderRadius: '6px', padding: '1px 6px', whiteSpace: 'nowrap' }}>{p.badge}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={anaLabelStyle}>SKILL CATEGORY</label>
            <select value={anaSkill} onChange={(e) => setAnaSkill(e.target.value)} style={anaSelectStyle}>
              <option value="">All skill categories</option>
              {skillOptions.map((sk) => <option key={sk} value={sk}>{sk}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={anaLabelStyle}>VENDOR</label>
            <select value={anaVendor} onChange={(e) => setAnaVendor(e.target.value)} style={anaSelectStyle}>
              <option value="">All vendors</option>
              {vendorOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div style={{ fontSize: '11.5px', marginBottom: '12px', padding: '8px 10px', borderRadius: '8px', background: analysisReady ? '#ecfdf5' : '#fffbeb', color: analysisReady ? '#047857' : '#92400e', border: `1px solid ${analysisReady ? '#a7f3d0' : '#fde68a'}` }}>
            {anaPeriodKeys.length === 0
              ? 'Please select at least one period.'
              : !hasAnalysisCriteria
                ? 'Step 2: pick a Skill / Vendor, or type Emp ID / Name in the search box.'
                : 'Ready — click Run Analysis.'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" onClick={clearAnaFilters} disabled={!anaFilterCount}
              style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 600, color: anaFilterCount ? '#b91c1c' : '#cbd5e1', cursor: anaFilterCount ? 'pointer' : 'not-allowed', padding: '4px 2px' }}>
              Clear all
            </button>
            <CButton onClick={runAnalysis} disabled={!analysisReady || analysisLoading}
              style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', height: '36px', padding: '0 18px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '12.5px', opacity: (!analysisReady || analysisLoading) ? 0.5 : 1, cursor: (!analysisReady || analysisLoading) ? 'not-allowed' : 'pointer' }}>
              <FaChartLine size={12} /> {analysisLoading ? 'Loading...' : 'Run Analysis'}
            </CButton>
          </div>
        </div>
      )}
    </div>
  )

  const filterChips = anaFilterCount > 0 && (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%', marginTop: '10px', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>Filters:</span>
      {anaPeriodKeys.map((k) => <FilterChip key={k} label="Period" value={periodLabel(k)} onRemove={() => toggleAnaPeriod(k)} />)}
      {anaSkill && <FilterChip label="Skill" value={anaSkill} onRemove={() => setAnaSkill('')} />}
      {anaVendor && <FilterChip label="Vendor" value={anaVendor} onRemove={() => setAnaVendor('')} />}
      {anaPeriodKeys.length === 0 && <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#dc2626' }}>Please select at least one period</span>}
      <button type="button" onClick={clearAnaFilters} style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 600, color: '#b91c1c', cursor: 'pointer', padding: '4px 2px' }}>
        Clear all
      </button>
      <CButton onClick={analysisMode ? exitAnalysis : handleAnalysis} disabled={analysisLoading || (!analysisMode && !analysisReady)}
        style={{ marginLeft: 'auto', background: analysisMode ? '#f59e0b' : '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', height: '34px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '12.5px', opacity: (analysisLoading || (!analysisMode && !analysisReady)) ? 0.5 : 1, cursor: (analysisLoading || (!analysisMode && !analysisReady)) ? 'not-allowed' : 'pointer' }}>
        {analysisMode ? <FaTimes size={12} /> : <FaChartLine size={13} />}
        {analysisLoading ? 'Loading...' : (analysisMode ? 'Exit Analysis' : 'Run Analysis')}
      </CButton>
    </div>
  )

  const handleRefresh = async () => {
    if (isLive) {
      await Promise.all([loadLive(category), loadPeriods(category)])
    } else if (isHistory) {
      await handleReadyForPayroll()
    } else {
      await Promise.all([loadPayroll(category), loadStatusSummary(category)])
    }
  }

  return (
    <div className="user-master-page" style={{ paddingBottom: isPayroll ? '90px' : '24px' }}>
      <style>{`
        .legend-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 2px 7px 2px 3px;
          background: #ffffff; border: 1px solid #ece8f8; border-radius: 999px;
          font-size: 10px; font-weight: 500; color: #475569; white-space: nowrap;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }

        @keyframes topCardBlink {
          0%, 100% {
            box-shadow: 0 6px 18px rgba(194, 65, 12, 0.35),
                        0 0 0 0 rgba(249, 115, 22, 0.55);
            filter: brightness(1);
          }
          50% {
            box-shadow: 0 6px 24px rgba(194, 65, 12, 0.55),
                        0 0 0 10px rgba(249, 115, 22, 0);
            filter: brightness(1.08);
          }
        }
        .payroll-top-card {
          animation: topCardBlink 1.8s ease-in-out infinite;
          will-change: box-shadow, filter;
        }

        .payroll-group-header { display: flex; box-sizing: border-box; }
        .payroll-group-header .group-cell {
          height: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center;
          font-size: 10.5px; font-weight: 700; letter-spacing: .3px; text-transform: uppercase;
          border-right: 2px solid #ffffff; box-sizing: border-box; white-space: nowrap; padding: 0 6px; flex-shrink: 0;
        }
        .payroll-group-header .group-cell:last-child { border-right: none; }
        .payroll-group-header .group-cell__sub { font-size: 8px; font-weight: 600; opacity: .9; }
        .payroll-group-header .group-cell--toggle { cursor: pointer; user-select: none; transition: filter .15s; }
        .payroll-group-header .group-cell--toggle:hover { filter: brightness(1.1); }
        .payroll-group-header .group-cell__row { display: flex; align-items: center; gap: 6px; }
        .payroll-group-header .group-cell__short { font-size: 8px; font-weight: 700; }
        .payroll-group-header .group-cell--sticky { position: sticky; left: 0; z-index: 20; }

        .payroll-frozen-table .rdt_Table, .payroll-frozen-table .rdt_TableBody,
        .payroll-frozen-table .rdt_TableHead, .payroll-frozen-table .rdt_TableHeadRow,
        .payroll-frozen-table .rdt_TableRow { overflow: visible !important; }
        .payroll-frozen-table .rdt_TableCol, .payroll-frozen-table .rdt_TableCell {
          flex-grow: 0 !important; flex-shrink: 0 !important; box-sizing: border-box !important;
        }
        .payroll-frozen-table .rdt_TableCol, .payroll-frozen-table .rdt_TableCol * { overflow: visible !important; text-overflow: unset !important; }
        .payroll-frozen-table .rdt_TableCol:nth-child(-n+3), .payroll-frozen-table .rdt_TableCol:nth-child(-n+3) * { white-space: nowrap !important; }
        .payroll-frozen-table .rdt_TableCell, .payroll-frozen-table .rdt_TableCell * { text-overflow: unset !important; }
        .payroll-frozen-table .rdt_TableCol:nth-child(-n+3), .payroll-frozen-table .rdt_TableCell:nth-child(-n+3) { position: sticky !important; }
        .payroll-frozen-table .rdt_TableCol:nth-child(-n+3) { background-color: #f1f4f9 !important; z-index: 5 !important; }
        .payroll-frozen-table .rdt_TableRow .rdt_TableCell:nth-child(-n+3) { background-color: #ffffff !important; z-index: 3 !important; }
        .payroll-frozen-table .rdt_TableRow:nth-of-type(odd) .rdt_TableCell:nth-child(-n+3) { background-color: #fafafa !important; }
        .payroll-frozen-table .rdt_TableRow:hover .rdt_TableCell:nth-child(-n+3) { background-color: #eeeeee !important; }
        .payroll-frozen-table .rdt_TableCol:nth-child(1), .payroll-frozen-table .rdt_TableCell:nth-child(1) { left: 0px !important; }
        .payroll-frozen-table .rdt_TableCol:nth-child(2), .payroll-frozen-table .rdt_TableCell:nth-child(2) { left: ${FROZEN_COL_1_WIDTH}px !important; }
        .payroll-frozen-table .rdt_TableCol:nth-child(3), .payroll-frozen-table .rdt_TableCell:nth-child(3) { left: ${FROZEN_COL_1_WIDTH + FROZEN_COL_NAME_WIDTH}px !important; }
        .payroll-frozen-table.is-scrolled .rdt_TableCol:nth-child(3), .payroll-frozen-table.is-scrolled .rdt_TableCell:nth-child(3) {
          border-right: 2px solid #000 !important; box-shadow: 3px 0 6px -3px rgba(0,0,0,.25) !important;
        }
        .payroll-frozen-table::-webkit-scrollbar { height: 8px; width: 8px; }
        .payroll-frozen-table::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        .payroll-frozen-table::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        .payroll-frozen-table::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
        .payroll-frozen-table { scrollbar-width: thin; scrollbar-color: #c1c1c1 #f1f1f1; }

        @keyframes livePulse {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,.75); }
          70% { box-shadow: 0 0 0 7px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
        .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #16a34a; display: inline-block; animation: livePulse 1.6s infinite; }

        @keyframes modalPop {
          0% { opacity: 0; transform: scale(.92) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-pop { animation: modalPop .22s cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes overlayFade { from { opacity: 0 } to { opacity: 1 } }
        .overlay-fade { animation: overlayFade .18s ease-out both; }
      `}</style>

      {/* ===================== TOP CARD — ORANGE (BLINKING) ===================== */}
      <div className="payroll-top-card" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 55%, #c2410c 100%)',
        padding: '12px 14px', borderRadius: '8px',
        boxShadow: '0 3px 12px rgba(194, 65, 12, 0.35)',
        marginBottom: '12px', flexWrap: 'wrap', gap: '10px 14px',
        border: '1px solid #9a3412', width: '100%', boxSizing: 'border-box',
      }}>
        {/* LEFT SECTION: Live badge + Period */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexShrink: 0, whiteSpace: 'nowrap' }}>
          <span style={{
            background: '#ffffff',
            color: viewBadgeBg,
            fontWeight: 800, fontSize: '10.5px', letterSpacing: '0.4px',
            borderRadius: '5px', padding: '3px 8px',
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            flexShrink: 0,
          }}>
            {isLive && <span className="live-dot" />}
            {viewBadgeLabel}
          </span>

          {displayPeriod ? (
            <span style={{ fontSize: '11.5px', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <span>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>From:</span>{' '}
                <b style={{ color: '#fff' }}>{fmtDate(displayPeriod.fromDate)}</b>
              </span>
              <span>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>To:</span>{' '}
                <b style={{ color: '#fff' }}>{fmtDate(displayPeriod.toDate)}</b>
              </span>
            </span>
          ) : (
            <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.9)' }}>
              {activeLoading || statusLoading ? 'Loading period...' : 'No Period'}
            </span>
          )}
        </div>

        {/* CENTER SECTION: Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
          <StatusSummaryLabel
            status={statusSummary}
            loading={statusLoading}
            activeFilter={isPayroll && statusFilter ? `${statusStage || ''}:${statusFilter}` : null}
            onSelect={handleStatusCardClick}
          />
        </div>

        {/* RIGHT SECTION: Last Updated + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexShrink: 0, flexWrap: 'wrap', whiteSpace: 'nowrap' }}>
          <span style={{
            fontSize: '11px', color: 'rgba(255,255,255,0.95)',
            flexShrink: 0, whiteSpace: 'nowrap',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
          }}>
            <span style={{ fontWeight: 600, opacity: 0.9 }}>Updated:</span>{' '}
            <b style={{ color: '#ffffff' }}>{lastSynced ? fmtDateTime(lastSynced) : '—'}</b>
          </span>

          <CButton onClick={handleManualSync} disabled={syncing || activeLoading}
            title="Fetch latest attendance now from source database"
            style={{
              background: '#ffffff', color: '#c2410c',
              border: '1px solid #ffffff',
              borderRadius: '6px', height: '30px', padding: '0 10px',
              display: 'flex', alignItems: 'center', gap: '5px',
              fontWeight: 700, fontSize: '11.5px',
              opacity: (syncing || activeLoading) ? 0.65 : 1,
              cursor: (syncing || activeLoading) ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}>
            <FaCloudDownloadAlt size={12} /> {syncing ? 'Syncing...' : 'Manual Sync'}
          </CButton>

          <CButton
            onClick={handleRefresh}
            disabled={activeLoading}
            title="Refresh data"
            style={{
              background: 'rgba(255,255,255,0.18)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.55)',
              borderRadius: '6px', height: '30px', width: '30px', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: activeLoading ? 0.6 : 1,
              flexShrink: 0,
            }}>
            <FaSyncAlt size={11} />
          </CButton>

          {isLive ? (
            <CButton onClick={handleReadyForPayroll} disabled={payrollLoading}
              style={{
                background: '#1e3a8a', color: '#fff',
                border: '1px solid #1e3a8a',
                borderRadius: '6px', height: '30px', padding: '0 12px',
                display: 'flex', alignItems: 'center', gap: '5px',
                fontWeight: 800, fontSize: '11.5px',
                opacity: payrollLoading ? 0.6 : 1,
                cursor: payrollLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                flexShrink: 0, whiteSpace: 'nowrap',
              }}>
              <FaArrowRight size={10} /> {payrollLoading ? 'Loading...' : 'Ready for Payroll'}
            </CButton>
          ) : isHistory ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CButton onClick={handleReadyForPayroll} disabled={payrollLoading}
                title="Return to current active payroll calculation"
                style={{
                  background: '#1e3a8a', color: '#fff',
                  border: '1px solid #1e3a8a',
                  borderRadius: '6px', height: '30px', padding: '0 12px',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontWeight: 800, fontSize: '11.5px',
                  opacity: payrollLoading ? 0.6 : 1,
                  cursor: payrollLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                <FaArrowRight size={10} /> {payrollLoading ? 'Loading...' : 'Current Payroll'}
              </CButton>
              <CButton onClick={handleGoLive} disabled={liveLoading}
                style={{
                  background: '#ffffff', color: '#047857',
                  border: '1px solid #ffffff',
                  borderRadius: '6px', height: '30px', padding: '0 12px',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontWeight: 800, fontSize: '11.5px',
                  opacity: liveLoading ? 0.6 : 1,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                <span className="live-dot" /> Back to Live
              </CButton>
            </div>
          ) : (
            <CButton onClick={handleGoLive} disabled={liveLoading}
              style={{
                background: '#ffffff', color: '#047857',
                border: '1px solid #ffffff',
                borderRadius: '6px', height: '30px', padding: '0 12px',
                display: 'flex', alignItems: 'center', gap: '5px',
                fontWeight: 800, fontSize: '11.5px',
                opacity: liveLoading ? 0.6 : 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                flexShrink: 0, whiteSpace: 'nowrap',
              }}>
              <span className="live-dot" /> Back to Live
            </CButton>
          )}
        </div>
      </div>

      {/* ===================== SKILL SUMMARY CARDS ===================== */}
      {renderSummaryCards(summaryCards, activeCardFilter, (v) => {
        if (!v) return
        setActiveCardFilter((prev) => (prev === v ? 'ALL' : v))
      })}

      {/* ===================== SINGLE GRID CARD ===================== */}
      <CCard>
        <CCardBody>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h5 style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: '#1f2937', letterSpacing: '0.2px' }}>
                {viewTitle}
              </h5>

              {(() => {
                const gridPeriod = isLive ? livePeriod : payrollPeriod
                const loadingDates = isLive ? liveLoading : payrollLoading
                const isHist = isHistory

                return (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '10.5px', color: '#475569',
                  }}>
                    {gridPeriod?.fromDate && gridPeriod?.toDate ? (
                      <>
                        <span style={{ color: '#94a3b8' }}>From:</span>
                        <b style={{ color: '#1e293b' }}>{fmtDate(gridPeriod.fromDate)}</b>
                        <span style={{ color: '#cbd5e1', margin: '0 1px' }}>–</span>
                        <span style={{ color: '#94a3b8' }}>To:</span>
                        <b style={{ color: '#1e293b' }}>{fmtDate(gridPeriod.toDate)}</b>

                        {isLive && gridPeriod.toDate === toKey(new Date()) && (
                          <span style={{
                            marginLeft: '2px',
                            background: '#7c3aed', color: '#fff',
                            fontWeight: 700, fontSize: '8px', letterSpacing: '0.3px',
                            borderRadius: '3px', padding: '0 4px', lineHeight: '13px',
                          }}>TODAY</span>
                        )}
                        {isHist && (
                          <span style={{
                            marginLeft: '2px',
                            background: '#f59e0b', color: '#fff',
                            fontWeight: 700, fontSize: '8px', letterSpacing: '0.3px',
                            borderRadius: '3px', padding: '0 4px', lineHeight: '13px',
                          }}>READ-ONLY</span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                        {loadingDates ? 'Loading dates...' : 'No dates'}
                      </span>
                    )}
                  </span>
                )
              })()}

              {analysisMode && (
                <span style={{ background: '#1d4ed8', color: '#fff', fontWeight: 700, fontSize: '9px', letterSpacing: '0.3px', borderRadius: '3px', padding: '1px 5px', lineHeight: '13px' }}>
                  ANALYSIS
                </span>
              )}

              {isStatusView && !analysisMode && (() => {
                const c = STATUS_CHIP_COLORS[statusFilter] || STATUS_CHIP_COLORS.all
                const stageLabel = statusStage ? `${STAGE_HEAD[statusStage]?.label || statusStage} · ` : ''
                return (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: c.bg, color: c.fg, border: `1px solid ${c.bd}`,
                    borderRadius: '4px', padding: '0 5px',
                    fontSize: '9.5px', fontWeight: 700, lineHeight: '16px',
                  }}>
                    <span>{stageLabel}{STATUS_VIEW_LABELS[statusFilter]} ({statusRows.length})</span>
                    <button type="button" title="Back to normal grid"
                      onClick={() => handleStatusCardClick({ bucket: statusFilter, stage: statusStage })}
                      style={{ border: 'none', background: 'transparent', color: c.fg, width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, opacity: 0.8 }}>
                      <FaTimes size={7.5} />
                    </button>
                  </span>
                )
              })()}
              {statusLocked && !analysisMode && (
                <span title="Upload, Calculate and Submit are disabled for this view. Open the Reject badge to re-work rejected records."
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '9px', letterSpacing: '0.2px', borderRadius: '3px', padding: '0 5px', lineHeight: '16px' }}>
                  <FaLock size={7.5} /> READ-ONLY
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              {isPayroll && !analysisMode && (
                <>
                  {!hasUploadedData && (
                    <CButton onClick={handleDownloadTemplate} disabled={uploading || locked}
                      style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '6px', height: '32px', minHeight: '32px', maxHeight: '32px', padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500, fontSize: '12px', boxSizing: 'border-box', opacity: (uploading || locked) ? 0.6 : 1 }}>
                      <FaDownload size={11} /> Download Template
                    </CButton>
                  )}
                  <CButton onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={uploading || locked}
                    title={statusLocked ? 'Disabled while viewing Verify / Hold / Total' : undefined}
                    style={{ background: '#5b21b6', color: '#fff', border: '1px solid #5b21b6', borderRadius: '6px', height: '32px', minHeight: '32px', maxHeight: '32px', padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '12px', boxSizing: 'border-box', opacity: (uploading || locked) ? 0.6 : 1, cursor: (uploading || locked) ? 'not-allowed' : 'pointer' }}>
                    <FaUpload size={11} /> {uploading ? 'Uploading...' : (hasUploadedData ? 'Reupload Variable' : 'Upload Variable')}
                  </CButton>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileSelected} disabled={uploading || locked} />
                  {hasUploadedData && (
                    <CButton onClick={handleCalculatePayroll}
                      disabled={calculating || uploading || locked || !canCalculate}
                      title={statusLocked
                        ? 'Disabled while viewing Verify / Hold / Total'
                        : (canCalculate ? 'Calculate payroll' : `${missingInputsCount} employee(s) still missing Variable Inputs`)}
                      style={{
                        background: (!canCalculate || calculating || locked) ? '#9ca3af' : '#16a34a',
                        color: '#fff',
                        border: `1px solid ${(!canCalculate || calculating || locked) ? '#9ca3af' : '#16a34a'}`,
                        borderRadius: '6px', height: '32px', minHeight: '32px', maxHeight: '32px', padding: '0 12px',
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontWeight: 700, fontSize: '12px', boxSizing: 'border-box',
                        opacity: (calculating || locked) ? 0.6 : 1,
                        cursor: (!canCalculate || calculating || locked) ? 'not-allowed' : 'pointer',
                      }}>
                      <FaCalculator size={11} /> {calculating ? 'Calculating...' : 'Calculate Payroll'}
                    </CButton>
                  )}
                </>
              )}

              <CButton size="sm" onClick={handleExport}
                style={{
                  background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  height: '32px', minHeight: '32px', maxHeight: '32px',
                  padding: '0 12px', fontWeight: 600, fontSize: '12px', boxSizing: 'border-box',
                }}>
                <FaDownload size={12} /> Export CSV
              </CButton>

              {filterButton}

              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', height: '32px' }}>
                <FaSearch style={{ position: 'absolute', left: '10px', color: '#9ca3af', fontSize: '12px', pointerEvents: 'none' }} />
                <CFormInput placeholder="Search by Emp ID or Name..." value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && analysisReady && !analysisLoading) handleAnalysis() }}
                  style={{
                    paddingLeft: '30px', paddingRight: searchInput ? '28px' : '10px',
                    paddingTop: 0, paddingBottom: 0,
                    minWidth: '200px', height: '32px', minHeight: '32px', maxHeight: '32px',
                    fontSize: '12px', lineHeight: '32px',
                    borderRadius: '6px', border: '1px solid #d1d5db',
                    boxSizing: 'border-box',
                  }} />
                {searchInput && (
                  <FaTimes onClick={() => { setSearchInput(''); setSearch('') }} style={{ position: 'absolute', right: '10px', color: '#9ca3af', fontSize: '12px', cursor: 'pointer' }} />
                )}
              </div>

              {categoryToggle}
            </div>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'flex-end',
            alignItems: 'center', gap: '6px', flexWrap: 'wrap',
            padding: '5px 8px', marginBottom: '10px',
            background: '#faf9ff', border: '1px solid #e9e4f7', borderRadius: '8px',
          }}>
            {LEGEND_ITEMS.map((item) => (
              <span key={item.label} className="legend-chip">
                <AttendanceBadge value={item.value} holidayTitle={item.holidayTitle} mini />
                <span>{item.label}</span>
              </span>
            ))}
          </div>

          {filterChips}

          <div ref={tableScrollRef} className={`payroll-frozen-table${isTableScrolled ? ' is-scrolled' : ''}`} style={{ overflowX: 'auto', width: '100%' }}>
            <div style={{ width: `${OUTER_WIDTH}px` }}>
              {analysisMode && renderSectionLabel('CURRENT PERIOD', payrollPeriod, false)}
              <div style={{ width: `${activeTable.TOTAL_WIDTH}px` }}>
                {renderGroupHeader(activeTable.groupDefs, activeTable.TOTAL_WIDTH)}

                <DataTable
                  columns={activeTable.columns}
                  data={paginatedData}
                  striped
                  highlightOnHover
                  pointerOnHover
                  dense
                  responsive={false}
                  progressPending={activeLoading}
                  progressComponent={<div style={{ padding: 24, color: '#94a3b8' }}>Loading {isStatusView ? (STATUS_VIEW_LABELS[statusFilter] || '').toLowerCase() : viewTitle.toLowerCase()}...</div>}
                  customStyles={customStyles}
                  sortServer
                  onSort={(column, direction) => {
                    if (column.sortField) {
                      setSortField(column.sortField)
                      setSortDirection(direction)
                    }
                  }}
                  noDataComponent={<div style={{ padding: 24, color: '#94a3b8' }}>
                    {isStatusView ? `No ${(STATUS_VIEW_LABELS[statusFilter] || '').toLowerCase()} records found` : 'No records found'}
                  </div>}
                />
              </div>

              {analysisMode && previousTables.map((pt, idx) => {
                const sec = sortedPrevSections[idx]
                return (
                  <div key={sec.key} style={{ marginTop: '18px' }}>
                    {renderSectionLabel(sectionBadge(sec), sec.period, true)}
                    <div style={{ width: `${pt.TOTAL_WIDTH}px` }}>
                      {renderGroupHeader(pt.groupDefs, pt.TOTAL_WIDTH)}
                      <DataTable
                        columns={pt.columns}
                        data={prevPaginated[idx] || []}
                        striped highlightOnHover pointerOnHover dense responsive={false}
                        customStyles={customStyles}
                        sortServer
                        onSort={(column, direction) => {
                          if (column.sortField) { setSortField(column.sortField); setSortDirection(direction) }
                        }}
                        noDataComponent={<div style={{ padding: 24, color: '#94a3b8' }}>No previous period records found</div>}
                      />
                    </div>
                  </div>
                )
              })}

              {analysisMode && previousTables.length > 0 && renderPager({
                pageN: prevPage, setPageN: setPrevPage, rppN: prevRpp, setRppN: setPrevRpp,
                total: prevTotal, pages: prevPages, start: prevStart, end: prevEnd,
              })}
            </div>
          </div>

          {renderPager({
            pageN: page, setPageN: setPage, rppN: rpp, setRppN: setRpp,
            total: totalRows, pages: totalPages, start: startIndex, end: endIndex,
          })}
        </CCardBody>
      </CCard>

      {/* ===================== PERIOD TIMELINE ===================== */}
      <CCard className="mt-3">
        <CCardBody>
          <PeriodTimeline
            periods={periodCards}
            selectedKey={selectedPeriodKey}
            loading={activeLoading}
            listLoading={periodsLoading}
            onSelect={handlePeriodClick}
          />
        </CCardBody>
      </CCard>

      {/* ===================== BOTTOM SUBMIT BAR ===================== */}
      {isPayroll && !analysisMode && (
        <div style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px',
          padding: '14px 20px', background: '#fff', boxShadow: '0 -2px 10px rgba(0,0,0,0.08)',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: (isHistory || statusLocked) ? '#b45309' : (canSubmit ? '#16a34a' : '#9ca3af') }}>
            {statusLocked
              ? `${STATUS_VIEW_LABELS[statusFilter]} view (read-only) — Upload, Calculate & Submit disabled`
              : isHistory
                ? 'History view (selected period, read-only) — Submit disabled'
                : canSubmit
                  ? `${pendingCount} Pending records ready to submit`
                  : opEmployeeCount > 0
                    ? `${opEmployeeCount} employee(s) still have Out-Pending (OP) punches — update out-time first`
                    : blankEmployeeCount > 0
                      ? `${blankEmployeeCount} employee(s) still have missing attendance (-) — fix attendance first`
                      : missingProvisionCount > 0
                        ? `${missingProvisionCount} pending record(s) have no Variable Inputs — upload variable inputs & calculate to enable Submit`
                        : `${pendingCount} pending — calculate & verify all rows to enable Submit`}
          </span>
          <CButton onClick={handleSubmitPayroll} disabled={!canSubmit || submitting || locked}
            style={{ background: (!canSubmit || submitting || locked) ? '#9ca3af' : '#1e3a8a', color: '#fff', border: 'none', borderRadius: '10px', height: '46px', padding: '0 36px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '14px', cursor: (!canSubmit || submitting || locked) ? 'not-allowed' : 'pointer' }}>
            <FaPaperPlane size={14} /> {submitting ? 'Submitting...' : 'Submit'}
          </CButton>
        </div>
      )}

      {/* ===================== SUBMIT SUCCESS MODAL ===================== */}
      {submitSuccessModal && (
        <div
          className="overlay-fade"
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            className="modal-pop"
            style={{
              width: '100%', maxWidth: 420,
              background: '#fff', borderRadius: 16,
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              padding: '28px 26px 22px',
              boxSizing: 'border-box',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: 68, height: 68, borderRadius: '50%',
              background: '#ecfdf5',
              border: '3px solid #16a34a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <FaCheckCircle size={34} color="#16a34a" />
            </div>

            <div style={{ fontSize: 17, fontWeight: 800, color: '#065f46', marginBottom: 6 }}>
              Successfully submitted!
            </div>
            <div style={{ fontSize: 13, color: '#374151', marginBottom: 18, lineHeight: 1.5 }}>
              The payroll data has been submitted to the <b>Checker</b> successfully.
              {submitSuccessModal.count > 0 && (
                <> &nbsp;<b>{submitSuccessModal.count}</b> record(s) sent.</>
              )}
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#f5f3ff', border: '1px solid #ddd6fe',
              color: '#5b21b6',
              borderRadius: 10, padding: '10px 16px',
              fontSize: 13, fontWeight: 700, letterSpacing: '0.3px',
              marginBottom: 22,
            }}>
              <span style={{ color: '#7c6bb5', fontWeight: 600 }}>Transaction ID:</span>
              <span style={{ fontFamily: 'monospace', color: '#5b21b6', fontSize: 14 }}>
                {submitSuccessModal.transactionId}
              </span>
            </div>

            <CButton
              onClick={handleSubmitSuccessOk}
              style={{
                width: '100%', height: 44,
                background: '#1e3a8a', color: '#fff', border: 'none',
                borderRadius: 10, fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              OK
            </CButton>
          </div>
        </div>
      )}

      {/* ===================== RESIGN POPUP ===================== */}
      {resignPopup && (
        <div ref={popupRef} style={{ position: 'fixed', left: resignPopup.x, top: resignPopup.y, width: 290, zIndex: 9999, background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{resignPopup.empNm}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{resignPopup.empId} · {fmtDate(resignPopup.dateKey)}</div>
          {resignPopup.leavingDate && (
            <div style={{ fontSize: 11, fontWeight: 600, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '3px 8px', marginBottom: 8 }}>
              Already marked resigned · DOL: {fmtDate(String(resignPopup.leavingDate).slice(0, 10))}
            </div>
          )}
          <div style={{ fontSize: 12, fontWeight: 600, color: '#b91c1c', marginBottom: 6 }}>Raise resignation query to Admin</div>
          <textarea value={resignRemarks} onChange={(e) => setResignRemarks(e.target.value)} placeholder="Remarks (e.g. Employee resigned on ...)" rows={3}
            style={{ width: '100%', resize: 'none', fontSize: 12, padding: 8, border: '1px solid #d1d5db', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
            <button type="button" onClick={closeResignPopup}
              style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="button" onClick={handleSendResign} disabled={resignSending}
              style={{ border: 'none', background: '#b91c1c', color: '#fff', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, opacity: resignSending ? 0.6 : 1, cursor: resignSending ? 'not-allowed' : 'pointer' }}>
              {resignSending ? 'Sending...' : 'Send to Admin'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PayrollMaker