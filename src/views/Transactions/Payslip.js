import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import DataTable from 'react-data-table-component'
import {
  CButton,
  CFormInput,
  CCard,
  CCardBody,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import {
  FaUsers,
  FaSearch,
  FaTimes,
  FaDownload,
  FaCalendarAlt,
  FaFileInvoiceDollar,
  FaPrint,
  FaSyncAlt,
  FaCheckCircle,
  FaBuilding,
  FaEye,
  FaIdBadge,
  FaUser,
  FaIdCard,
  FaPlusCircle,
  FaUniversity,
  FaShieldAlt,
  FaCreditCard,
  FaCalendarCheck,
  FaWallet,
  FaHandHoldingUsd,
  FaCoins,
  FaFilter,
  FaEnvelope,
  FaFilePdf,
  FaFileExcel,
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import * as XLSX from 'xlsx'
import '../../assets/CSS/user.css'
import payslipBg from '../../assets/images/PAYSLIP.png'
import API from '../../api.js'

const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL)
const CURRENT_USER = (window.APP_CONFIG && window.APP_CONFIG.currentUser) || 'System'

/* ========================================================================= */
/* GRID STYLES & PAGINATION - IDENTICAL TO USER MASTER (users.js)            */
/* ========================================================================= */
const customStyles = {
  rows: { style: { minHeight: '38px' } },
  headCells: {
    style: {
      justifyContent: 'flex-start',
      fontSize: '13px',
      fontWeight: '600',
      paddingTop: '4px',
      paddingBottom: '4px',
      background: '#f1f4f9',
      textTransform: 'uppercase',
      flex: '1 1 auto',
      position: 'relative',
      whiteSpace: 'nowrap',
      overflow: 'visible',
    },
  },
  cells: {
    style: {
      justifyContent: 'flex-start',
      fontSize: '13px',
      paddingTop: '0px',
      paddingBottom: '0px',
      flex: '1 1 auto',
    },
  },
  table: {
    style: {
      tableLayout: 'fixed',
    },
  },
}

const paginationRowsPerPageOptions = [10, 25, 50, 100]
const paginationComponentOptions = {
  rowsPerPageText: 'Rows per page',
  rangeSeparatorText: 'of',
  selectAllRowsItem: true,
  selectAllRowsItemText: 'All',
}

const normSkill = (v) => (v || '').toString().trim().toLowerCase()
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtNumber = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDays = (n) => {
  if (n === null || n === undefined) return '0'
  const num = Number(n)
  if (Number.isNaN(num)) return '0'
  return Number.isInteger(num) ? num.toString() : num.toFixed(1)
}

const toDateString = (val) => {
  if (!val) return ''
  const str = String(val).trim()
  if (str.length >= 10 && str[4] === '-' && str[7] === '-') {
    return str.slice(0, 10)
  }
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return str.slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fmtDate = (val) => {
  if (!val) return '-'
  const clean = toDateString(val)
  const d = new Date(clean)
  if (Number.isNaN(d.getTime())) return clean
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const fmtPeriodLabel = (fromVal, toVal) => {
  const fromClean = toDateString(fromVal)
  const toClean = toDateString(toVal)
  const from = fromClean ? new Date(fromClean) : null
  const to = toClean ? new Date(toClean) : null
  if (!from || Number.isNaN(from.getTime())) return null
  if (to && !Number.isNaN(to.getTime())) {
    const sameMonth = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()
    if (!sameMonth) return `${fmtDate(fromClean)} – ${fmtDate(toClean)}`
  }
  return from.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

const fmtPeriodOption = (fromVal, toVal) => {
  if (!fromVal || !toVal) return 'Select Period'
  const f = fmtDate(fromVal)
  const t = fmtDate(toVal)
  const clean = toDateString(fromVal)
  const monthName = new Date(clean).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  return `${f} – ${t} (${monthName})`
}

const getMonthYearLabel = (fromVal, toVal) => {
  const target = toVal || fromVal
  if (!target) return 'CURRENT MONTH'
  const clean = toDateString(target)
  const d = new Date(clean)
  if (Number.isNaN(d.getTime())) return 'CURRENT MONTH'
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase()
}

const numberToWordsIndian = (num) => {
  if (!num || isNaN(num)) return 'Zero Rupees Only'
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ]
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const n = Math.floor(Math.abs(num))
  if (n === 0) return 'Zero Rupees Only'

  const formatTens = (val) => {
    if (val < 20) return a[val]
    return b[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + a[val % 10] : '')
  }

  const formatHundreds = (val) => {
    let str = ''
    if (Math.floor(val / 100) > 0) {
      str += a[Math.floor(val / 100)] + ' Hundred '
    }
    const rem = val % 100
    if (rem > 0) {
      str += (str !== '' ? 'and ' : '') + formatTens(rem)
    }
    return str.trim()
  }

  let result = ''
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const hundred = n % 1000

  if (crore > 0) result += formatHundreds(crore) + ' Crore '
  if (lakh > 0) result += formatHundreds(lakh) + ' Lakh '
  if (thousand > 0) result += formatHundreds(thousand) + ' Thousand '
  if (hundred > 0) result += formatHundreds(hundred)

  return (result.trim() + ' Rupees Only')
}

const CATEGORIES = ['CL', 'NAPS']

const SkillCatBadge = ({ skillCat }) => {
  const normalized = normSkill(skillCat)
  if (!skillCat || skillCat === '-' || normalized === 'cl' || normalized === 'naps') {
    return <span style={{ color: '#9ca3af' }}>-</span>
  }
  const palettes = {
    'un skilled': { background: '#e0f2fe', color: '#0369a1' },
    unskilled: { background: '#e0f2fe', color: '#0369a1' },
    'semi skilled': { background: '#fef3c7', color: '#92400e' },
    'semi-skilled': { background: '#fef3c7', color: '#92400e' },
    'semi skilled level-2': { background: '#fce7f3', color: '#be185d' },
    skilled: { background: '#dcfce7', color: '#166534' },
    trainee: { background: '#fef08a', color: '#78350f' },
    e1: { background: '#e0e7ff', color: '#4c1d95' },
  }
  const s = palettes[normalized] || { background: '#f3f4f6', color: '#4b5563' }
  return (
    <span
      style={{
        ...s,
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        display: 'inline-block',
        whiteSpace: 'nowrap',
      }}
    >
      {skillCat}
    </span>
  )
}

/* ========================================================================= */
/* EXCEL-STYLE COLUMN FILTER POPUP (LIKE EMPLOYEE MASTER)                    */
/* ========================================================================= */
const ColumnFilterPopup = ({ uniqueValues, selectedValues, onApply, onClose, position }) => {
  const [tempSelected, setTempSelected] = useState(new Set(selectedValues))
  const [searchText, setSearchText] = useState('')
  const popupRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const filteredValues = useMemo(() => {
    if (!searchText.trim()) return uniqueValues
    return uniqueValues.filter((v) => String(v).toLowerCase().includes(searchText.toLowerCase()))
  }, [uniqueValues, searchText])

  const allChecked = filteredValues.length > 0 && filteredValues.every((v) => tempSelected.has(v))
  const someChecked = filteredValues.some((v) => tempSelected.has(v))

  const toggleAll = () => {
    const next = new Set(tempSelected)
    if (allChecked) {
      filteredValues.forEach((v) => next.delete(v))
    } else {
      filteredValues.forEach((v) => next.add(v))
    }
    setTempSelected(next)
  }

  const toggleOne = (val) => {
    const next = new Set(tempSelected)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    setTempSelected(next)
  }

  return (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999,
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        border: '1px solid #cbd5e1',
        width: '260px',
        maxHeight: '340px',
        display: 'flex',
        flexDirection: 'column',
        animation: 'filterPopupIn 0.18s ease-out',
      }}
    >
      <style>
        {`
          @keyframes filterPopupIn {
            from { opacity: 0; transform: translateY(-6px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>

      {/* Header title & search */}
      <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#4915af', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <FaFilter size={10} /> Filter by Vendor
        </div>
        <div style={{ position: 'relative' }}>
          <FaSearch style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 11 }} />
          <input
            type="text"
            placeholder="Search vendor..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: '100%',
              padding: '5px 8px 5px 26px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Select All */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          background: '#fafafa',
        }}
        onClick={toggleAll}
      >
        <input type="checkbox" checked={allChecked} ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked }} readOnly />
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Select All Vendors</span>
      </div>

      {/* Vendor List */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0', maxHeight: '180px' }}>
        {filteredValues.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>No vendors found</div>
        ) : (
          filteredValues.map((val) => (
            <div
              key={val}
              style={{
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
              onClick={() => toggleOne(val)}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <input type="checkbox" checked={tempSelected.has(val)} readOnly />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1f2937', fontWeight: 500 }}>
                {val === '' || val == null ? '(Blank)' : String(val)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer buttons */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px', justifyContent: 'flex-end', background: '#f8fafc' }}>
        <button
          onClick={onClose}
          style={{
            padding: '5px 12px',
            fontSize: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            color: '#475569',
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => onApply(Array.from(tempSelected))}
          style={{
            padding: '5px 14px',
            fontSize: '12px',
            border: 'none',
            borderRadius: '6px',
            background: '#4915af',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Apply
        </button>
      </div>
    </div>
  )
}

const Payslip = () => {
  const [payrollData, setPayrollData] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('CL')

  // Period management
  const [periods, setPeriods] = useState([])
  const [selectedPeriodKey, setSelectedPeriodKey] = useState('')
  const [periodsLoading, setPeriodsLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [selectedRowIds, setSelectedRowIds] = useState([])
  const [generating, setGenerating] = useState(false)
  const [emailStatusMap, setEmailStatusMap] = useState({})

  // Vendor Filter State (Employee Master Pattern)
  const [selectedVendors, setSelectedVendors] = useState([])
  const [showVendorFilterPopup, setShowVendorFilterPopup] = useState(false)
  const [filterPopupPosition, setFilterPopupPosition] = useState({ top: 0, left: 0 })
  const filterBtnRef = useRef(null)
  const vendorHeaderRef = useRef(null)

  // Printable Payslip Modal (Yamaha Branded Background)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [selectedSlipEmp, setSelectedSlipEmp] = useState(null)

  // Send Payslip Format Selection Modal (Doc / PDF vs Excel)
  const [showFormatModal, setShowFormatModal] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState('PDF') // 'PDF' (Doc) or 'EXCEL'

  // Sequence counter ref to prevent race conditions when toggling categories/periods
  const reqSeqRef = useRef(0)

  // 1. Fetch payslip email delivery status
  const loadEmailStatus = useCallback(async (targetCat, targetPeriodKey) => {
    const [fromDate, toDate] = targetPeriodKey ? targetPeriodKey.split('|') : ['', '']
    try {
      const queryParams = new URLSearchParams({ category: targetCat })
      if (fromDate) queryParams.set('fromDate', fromDate)
      if (toDate) queryParams.set('toDate', toDate)

      const res = await fetch(`${API_BASE_URL}/Payslip/email-status?${queryParams.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const map = {}
        if (Array.isArray(data)) {
          data.forEach((item) => {
            const key = (item.employeeId || item.emp_Id || '').toString().trim().toUpperCase()
            if (key) {
              map[key] = {
                mailSentStatus: (item.mailSentStatus || item.mail_Sent_Status || '').toUpperCase(),
                mailSentOn: item.mailSentOn || item.mail_Sent_On,
                vendorEmail: item.vendorEmail || item.vendor_Email,
                remarks: item.remarks,
              }
            }
          })
        }
        setEmailStatusMap(map)
      }
    } catch (e) {
      console.warn('Failed to load email status', e)
    }
  }, [])

  // 2. Fetch approved records for target category + period
  const fetchPayrollData = useCallback(async (targetCat, targetPeriodKey, seq) => {
    setLoading(true)
    setSelectedRowIds([])

    const [fromDate, toDate] = targetPeriodKey ? targetPeriodKey.split('|') : ['', '']

    try {
      let rawList = []

      try {
        const queryParams = new URLSearchParams({ category: targetCat })
        if (fromDate) queryParams.set('fromDate', fromDate)
        if (toDate) queryParams.set('toDate', toDate)

        const res = await fetch(`${API_BASE_URL}/Payslip/approved?${queryParams.toString()}`)
        if (res.ok) {
          const data = await res.json()
          rawList = data.employees || data || []
        }
      } catch (err) {
        console.warn('Payslip/approved API failed, using fallback', err)
      }

      if (rawList.length === 0 && fromDate && toDate) {
        try {
          const res = await fetch(
            `${API_BASE_URL}/PayrollEmployee/history?category=${encodeURIComponent(targetCat)}&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`
          )
          if (res.ok) {
            const data = await res.json()
            rawList = data.employees || data || []
          }
        } catch (err) {
          console.warn('PayrollEmployee/history API failed', err)
        }
      }

      if (rawList.length === 0 && !targetPeriodKey) {
        try {
          const res = await fetch(`${API_BASE_URL}/PayrollEmployee?category=${encodeURIComponent(targetCat)}`)
          if (res.ok) {
            const data = await res.json()
            rawList = data.employees || data || []
          }
        } catch (err) {
          console.warn('PayrollEmployee API failed', err)
        }
      }

      // Ignore stale responses if a newer request has started
      if (seq !== undefined && seq < reqSeqRef.current) {
        return
      }

      let masterMap = {}
      let masterNameMap = {}
      let vendorNameToIdMap = {}
      try {
        const mRes = await fetch(`${API_BASE_URL}/EmployeeMaster`)
        if (mRes.ok) {
          const mData = await mRes.json()
          const arr = Array.isArray(mData) ? mData : (mData.data || mData.employees || [])
          arr.forEach((m) => {
            const k = (m.empId || m.emp_Id || m.employeeId || m.EmployeeId || '').toString().trim().toUpperCase()
            if (k) masterMap[k] = m
            const nm = (m.empNm || m.empName || m.employeeName || m.EmployeeName || '').toString().trim().toUpperCase()
            if (nm) masterNameMap[nm] = m

            const vName = (m.vendor || m.vendorName || '').toString().trim().toUpperCase()
            const vId = (m.vendorId || m.vendor_Id || m.VendorId || '').toString().trim()
            if (vName && vId && !vendorNameToIdMap[vName]) {
              vendorNameToIdMap[vName] = vId
            }
          })
        }
      } catch (mErr) {
        console.warn('EmployeeMaster fetch error', mErr)
      }

      try {
        const vRes = await fetch(`${API_BASE_URL}/EmployeeMaster/vendors`)
        if (vRes.ok) {
          const vData = await vRes.json()
          const vArr = Array.isArray(vData) ? vData : (vData.data || [])
          vArr.forEach((v) => {
            const vId = (v.vendorId || v.vendor_Id || v.id || '').toString().trim()
            const vNm = (v.vendorName || v.vendor || v.name || '').toString().trim().toUpperCase()
            if (vNm && vId) {
              vendorNameToIdMap[vNm] = vId
            }
          })
        }
      } catch (vErr) {
        console.warn('Vendors fetch error', vErr)
      }

      let provMap = {}
      try {
        const pRes = await fetch(`${API_BASE_URL}/Payslip/provisions?category=${encodeURIComponent(targetCat)}`)
        if (pRes.ok) {
          const pData = await pRes.json()
          const arr = Array.isArray(pData) ? pData : []
          arr.forEach((p) => {
            const k = (p.employeeId || p.emp_Id || p.empId || '').toString().trim().toUpperCase()
            if (k) {
              if (!provMap[k] || (p.id && p.id > provMap[k].id)) {
                provMap[k] = p
              }
            }
          })
        }
      } catch (pErr) {
        console.warn('Provisions fetch fallback error', pErr)
      }

      if (seq !== undefined && seq < reqSeqRef.current) {
        return
      }

      const isNaps = targetCat === 'NAPS'
      const approvedOnly = rawList
        .filter((emp) => {
          const ctg = (emp.category || emp.ctgCode || emp.ctg_Code || emp.categoryCode || '').toString().trim().toUpperCase()
          const targetCtg = targetCat.toUpperCase()
          if (ctg && ctg !== targetCtg) return false

          const appStatus = (emp.approverStatus || emp.ApproverStatus || '').toString().trim().toUpperCase()
          const chkStatus = (emp.checkerStatus || emp.CheckerStatus || '').toString().trim().toUpperCase()
          const genStatus = (emp.status || emp.Status || '').toString().trim().toUpperCase()

          return (
            appStatus === 'APPROVER-APPROVED' ||
            appStatus === 'APPROVED' ||
            genStatus === 'APPROVER-APPROVED' ||
            (chkStatus === 'CHECKER-APPROVED' && appStatus === 'APPROVED')
          )
        })
        .map((emp, idx) => {
          const rawEmpId =
            emp.employeeId ?? emp.EmployeeId ??
            emp.empId ?? emp.EmpId ??
            emp.emp_Id ?? emp.Emp_Id ??
            emp.employee_Id ?? emp.Employee_Id ?? ''
          let empId = String(rawEmpId || '').trim()

          const rawEmpNm =
            emp.empNm ?? emp.emp_Nm ??
            emp.employeeName ?? emp.EmployeeName ??
            emp.empName ?? emp.EmpName ?? ''
          const empNm = String(rawEmpNm || '').trim()

          // If empId is empty, try to match by employee name from Employee Master
          let m = (empId ? masterMap[empId.toUpperCase()] : null) || masterNameMap[empNm.toUpperCase()] || {}
          if (!empId && (m.empId || m.emp_Id || m.employeeId)) {
            empId = String(m.empId || m.emp_Id || m.employeeId).trim()
          }

          const rawQualification =
            m.qualify ?? m.Qualify ?? m.qualification ?? m.Qualification ??
            emp.qualification ?? emp.Qualification ?? emp.qualify ?? emp.Qualify ?? ''
          const qualification = rawQualification && String(rawQualification).trim() !== '-'
            ? String(rawQualification).trim()
            : ''

          const rawDesignation =
            m.designation ?? m.Designation ?? m.desigination ?? m.Desigination ??
            m.designationName ?? m.DesignationName ??
            emp.designation ?? emp.Designation ?? emp.desigination ?? emp.Desigination ?? ''
          const fallbackDesignation = rawDesignation && String(rawDesignation).trim() !== '-'
            ? String(rawDesignation).trim()
            : ''

          const finalDesignation = qualification || fallbackDesignation || '-'

          const pfNo = m.pfNo || m.pf_No || m.pfNumber || emp.pfNo || emp.pf_No || emp.epfNo || '-'
          const esiNo = m.esiNo || m.esi_No || m.esiNumber || emp.esiNo || emp.esi_No || '-'
          const panNo = m.panNo || m.pan_No || m.panNumber || emp.panNo || emp.pan_No || '-'
          const uanNo = m.uanNo || m.uan_No || m.uanNumber || emp.uanNo || emp.uan_No || '-'
          const dateOfJoining = m.dateOfJoining || m.doj || m.date_Of_Joining || emp.dateOfJoining || emp.doj || null
          const leavingDate = m.leavingDate || m.leaving_Date || emp.leavingDate || m.dol || null

          // Skill Category extraction - MUST NEVER fall back to 'CL' or 'NAPS'
          const candidateSkills = [
            m.skillCat,
            m.skillCategory,
            m.SkillCat,
            emp.skillCategory,
            emp.SkillCategory,
            emp.skillCat,
            emp.SkillCat,
            emp.skill_Cat,
            emp.Skill_Cat,
          ]
          let finalSkillCat = '-'
          for (const cand of candidateSkills) {
            if (cand && typeof cand === 'string') {
              const tr = cand.trim()
              const up = tr.toUpperCase()
              if (tr !== '' && tr !== '-' && up !== 'CL' && up !== 'NAPS') {
                finalSkillCat = tr
                break
              }
            }
          }

          const ern = emp.earnings || {}
          const ded = emp.deductions || {}
          const prov = emp.provisions || {}

          const attnBonus = Number(emp.attnBonus ?? emp.Attn_Bonus ?? ern.attnBonus ?? 0)
          const earnedBasicDa = Number(emp.earnedBasicDa ?? emp.Earned_Basic_DA ?? ern.earnedBasicDa ?? 0)
          const earnedHra = Number(emp.earnedHra ?? emp.Earned_HRA ?? ern.earnedHra ?? 0)
          const otAmount = Number(emp.otAmount ?? emp.OT_Amount ?? ern.otAmount ?? 0)
          const epf = Number(emp.epf ?? emp.EPF ?? ern.epf ?? 0)
          const esi = Number(emp.esi ?? emp.ESI ?? ern.esi ?? 0)
          const bonusDed = Number(emp.bonusDed ?? emp.Bonus_Ded ?? ern.bonus ?? 0)
          const serChar = Number(emp.serChar ?? emp.Ser_Char ?? ern.serChar ?? 0)
          const lwf = Number(emp.lwf ?? emp.LWF ?? ern.lwf ?? 0)

          const earnedWages = Number(emp.earnedWages ?? emp.Earned_Wages ?? ern.earnedWages ?? 0)
          const otEarning = Number(emp.otEarning ?? emp.OT_Earning ?? ern.otEarning ?? 0)
          const handlingCharge = Number(emp.handlingCharge ?? emp.Handling_Charge ?? ern.handlingCharge ?? 0)

          const pfDed = Number(emp.pfDed ?? emp.PF_Ded ?? ded.pf ?? 0)
          const esiDed = Number(emp.esiDed ?? emp.ESI_Ded ?? ded.esi ?? 0)
          const hostelDed = Number(emp.hostelDed ?? emp.Hostel_Ded ?? ded.hostelFee ?? ded.hostelDed ?? ded.hostelDeduction ?? 0)

          // Gross calculation:
          // User Requirement for NAPS: Gross = Earned Wages + OT Earning + Handling Charge
          const gross = isNaps
            ? ((earnedWages + otEarning + handlingCharge) > 0 ? (earnedWages + otEarning + handlingCharge) : Number(emp.gross ?? emp.Gross ?? 0))
            : Number(emp.gross ?? emp.Gross ?? ern.gross ?? 0)

          // Deductions calculation:
          // User Requirement for NAPS: Deductions is ONLY Hostel_Ded
          const totalDeductions = isNaps
            ? hostelDed
            : (pfDed + esiDed + hostelDed)

          const totalDed = isNaps ? hostelDed : Number(emp.totalDed ?? emp.Total_Ded ?? ern.total ?? 0)

          // Provisions / Variable Total
          const pFallback = provMap[empId.toUpperCase()] || {}
          const refBon = Number(
            emp.refBon ?? emp.Ref_Bon ?? emp.RefBon ??
            prov.referalBonus ?? prov.ReferalBonus ??
            pFallback.referalBonus ?? pFallback.referal_Bonus ?? pFallback.refBon ?? pFallback.Ref_Bon ?? 0
          )
          const splAllw = Number(
            emp.splAllw ?? emp.Spl_Allw ?? emp.SplAllw ??
            prov.splAllow ?? prov.SplAllow ??
            pFallback.splAllow ?? pFallback.spl_Allow ?? pFallback.splAllw ?? pFallback.Spl_Allw ?? 0
          )
          const kaizen = Number(
            emp.kaizen ?? emp.Kaizen ??
            prov.kaizen ?? prov.Kaizen ??
            pFallback.kaizen ?? pFallback.Kaizen ?? 0
          )
          const gpaGmc = Number(
            emp.gpaGmc ?? emp.GPA_GMC ?? emp.GpaGmc ??
            prov.gpaGmc ?? prov.GpaGmc ??
            pFallback.gpaGmc ?? pFallback.gpa_Gmc ?? pFallback.GPA_GMC ?? 0
          )
          const calcVarTotal = refBon + splAllw + kaizen + gpaGmc
          const variableTotal = calcVarTotal > 0 ? calcVarTotal : Number(emp.variableTotal ?? emp.VariableTotal ?? 0)

          // Net Payable
          const netPayable = (gross + variableTotal - totalDeductions)

          const payFull = Number(emp.payDaysFull ?? emp.Pay_Days_Full ?? emp.pay_Days_Full ?? 0)
          const payHalf = Number(emp.payDaysHalf ?? emp.Pay_Days_Half ?? emp.pay_Days_Half ?? 0)
          const calcWorkedDays = payFull + payHalf

          const rawVendor = (emp.vendor || emp.Vendor || m.vendor || '').trim()
          const rawVendorId =
            m.vendorId ?? m.vendor_Id ?? m.VendorId ?? m.Vendor_Id ??
            emp.vendorId ?? emp.VendorId ?? emp.vendor_Id ??
            vendorNameToIdMap[rawVendor.toUpperCase()] ?? ''
          const vendorId = String(rawVendorId || '').trim()

          return {
            id: emp.id || emp.Id || `${empId}-${idx}`,
            empId: empId || (m.empId ? String(m.empId).trim() : '-'),
            empNm: empNm || m.empNm || m.empName || '-',
            skillCat: finalSkillCat,
            vendor: rawVendor || '-',
            vendorId: vendorId,
            fromDate: toDateString(emp.fromDate || emp.from_Dt || fromDate),
            toDate: toDateString(emp.toDate || emp.to_Dt || toDate),
            designation: finalDesignation,
            qualification: finalDesignation,
            dateOfJoining,
            leavingDate,
            pfNo,
            esiNo,
            panNo,
            uanNo,
            workingDays: calcWorkedDays,
            periodDays: Number(emp.periodDays ?? emp.Period_Days ?? emp.period_Days ?? 0),
            payDaysFull: payFull,
            payDaysHalf: payHalf,
            otHrs: Number(emp.otHrs ?? emp.OT_Hrs ?? emp.ot_Hrs ?? 0),
            variableTotal,
            gross,
            totalDed,
            totalDeductions,
            netPayable,
            attnBonus,
            earnedBasicDa,
            earnedHra,
            otAmount,
            epf,
            esi,
            bonusDed,
            serChar,
            lwf,
            earnedWages,
            otEarning,
            handlingCharge,
            pfDed,
            esiDed,
            hostelDed,
            refBon,
            splAllw,
            kaizen,
            gpaGmc,
            earnings: isNaps
              ? {
                  earnedWages,
                  otEarning,
                  handlingCharge,
                  total: gross,
                }
              : emp.earnings || {},
            deductions: isNaps
              ? {
                  hostelDed,
                  hostelFee: hostelDed,
                  hostelDeduction: hostelDed,
                  total: totalDeductions,
                }
              : emp.deductions || {},
            provisions: {
              referalBonus: refBon,
              splAllow: splAllw,
              kaizen: kaizen,
              gpaGmc: gpaGmc,
            },
            status: 'approved',
            approverStatus: emp.approverStatus || emp.ApproverStatus || 'APPROVER-APPROVED',
            checkerStatus: emp.checkerStatus || emp.CheckerStatus || 'CHECKER-APPROVED',
            transactionId: emp.transactionId || emp.Transaction_ID || '-',
            version: emp.version || emp.Version || 'V1',
            createdOn: emp.createdOn || emp.CreatedOn || null,
          }
        })

      if (seq !== undefined && seq < reqSeqRef.current) {
        return
      }

      setPayrollData(approvedOnly)
    } catch (err) {
      if (seq === undefined || seq >= reqSeqRef.current) {
        console.error(err)
        toast.error('Failed to load approved records')
      }
    } finally {
      if (seq === undefined || seq >= reqSeqRef.current) {
        setLoading(false)
      }
    }
  }, [])

  // 3. Load periods for target category, pick active period, and fetch data
  const loadPeriodsAndData = useCallback(
    async (targetCat, preferPeriodKey) => {
      setPeriodsLoading(true)
      const currentSeq = ++reqSeqRef.current
      try {
        let cleanPeriods = []
        try {
          const res = await fetch(`${API_BASE_URL}/Payslip/periods?category=${encodeURIComponent(targetCat)}`)
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data) && data.length > 0) {
              cleanPeriods = data
                .filter((p) => (p.fromDate || p.from_Dt || p.FromDate || p.From_Dt) && (p.toDate || p.to_Dt || p.ToDate || p.To_Dt))
                .map((p) => {
                  const f = toDateString(p.fromDate || p.from_Dt || p.FromDate || p.From_Dt)
                  const t = toDateString(p.toDate || p.to_Dt || p.ToDate || p.To_Dt)
                  return { fromDate: f, toDate: t, key: `${f}|${t}`, count: p.employeeCount || p.emp_Count || p.EmployeeCount || p.Emp_Count || 0 }
                })
            }
          }
        } catch (e) {
          console.warn('Payslip/periods not available, trying fallback', e)
        }

        if (cleanPeriods.length === 0) {
          try {
            const res = await fetch(`${API_BASE_URL}/PayrollEmployee/periods?category=${encodeURIComponent(targetCat)}`)
            if (res.ok) {
              const data = await res.json()
              if (Array.isArray(data) && data.length > 0) {
                cleanPeriods = data
                  .filter((p) => (p.fromDate || p.from_Dt || p.FromDate || p.From_Dt) && (p.toDate || p.to_Dt || p.ToDate || p.To_Dt))
                  .map((p) => {
                    const f = toDateString(p.fromDate || p.from_Dt || p.FromDate || p.From_Dt)
                    const t = toDateString(p.toDate || p.to_Dt || p.ToDate || p.To_Dt)
                    return { fromDate: f, toDate: t, key: `${f}|${t}`, count: p.employeeCount || p.emp_Count || p.EmployeeCount || p.Emp_Count || 0 }
                  })
              }
            }
          } catch (e) {
            console.warn('PayrollEmployee/periods fallback failed', e)
          }
        }

        const seen = new Set()
        const uniquePeriods = []
        for (const p of cleanPeriods) {
          if (p.fromDate && p.toDate && !seen.has(p.key)) {
            seen.add(p.key)
            uniquePeriods.push(p)
          }
        }
        uniquePeriods.sort((a, b) => (b.fromDate > a.fromDate ? 1 : b.fromDate < a.fromDate ? -1 : 0))

        if (currentSeq < reqSeqRef.current) return

        setPeriods(uniquePeriods)

        let activeKey = ''
        if (preferPeriodKey && uniquePeriods.some((p) => p.key === preferPeriodKey)) {
          activeKey = preferPeriodKey
        } else if (uniquePeriods.length > 0) {
          activeKey = uniquePeriods[0].key
        }

        setSelectedPeriodKey(activeKey)

        fetchPayrollData(targetCat, activeKey, currentSeq)
        loadEmailStatus(targetCat, activeKey)
      } catch (err) {
        console.error('Failed to load periods:', err)
        if (currentSeq >= reqSeqRef.current) {
          fetchPayrollData(targetCat, '', currentSeq)
        }
      } finally {
        if (currentSeq >= reqSeqRef.current) {
          setPeriodsLoading(false)
        }
      }
    },
    [fetchPayrollData, loadEmailStatus]
  )

  // Direct handlers for category switch, period change, and manual refresh
  const handleCategoryChange = (newCat) => {
    if (newCat === category) return
    setCategory(newCat)
    setSelectedVendors([])
    setShowVendorFilterPopup(false)
    setSelectedRowIds([])
    loadPeriodsAndData(newCat)
  }

  const handlePeriodChange = (newKey) => {
    setSelectedPeriodKey(newKey)
    setSelectedVendors([])
    setShowVendorFilterPopup(false)
    setSelectedRowIds([])
    const seq = ++reqSeqRef.current
    fetchPayrollData(category, newKey, seq)
    loadEmailStatus(category, newKey)
  }

  const handleRefresh = () => {
    loadPeriodsAndData(category, selectedPeriodKey)
  }

  // Initial load on component mount
  useEffect(() => {
    loadPeriodsAndData('CL')
  }, [loadPeriodsAndData])

  // Unique vendors list extracted from payroll data
  const uniqueVendors = useMemo(() => {
    const set = new Set()
    payrollData.forEach((row) => {
      const v = (row.vendor || '').trim()
      if (v && v !== '-') set.add(v)
    })
    return Array.from(set).sort()
  }, [payrollData])

  // Filtered rows by search and vendor filter
  const filtered = useMemo(() => {
    let rows = payrollData

    // 1. Vendor Filter
    if (selectedVendors.length > 0) {
      rows = rows.filter((r) => {
        const v = (r.vendor || '').trim()
        return selectedVendors.includes(v)
      })
    }

    // 2. Search query filter
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (r) =>
          (r.empId || '').toLowerCase().includes(q) ||
          (r.empNm || '').toLowerCase().includes(q) ||
          (r.vendor || '').toLowerCase().includes(q) ||
          (r.vendorId || '').toLowerCase().includes(q) ||
          (r.skillCat || '').toLowerCase().includes(q) ||
          (r.designation || '').toLowerCase().includes(q)
      )
    }
    return rows
  }, [payrollData, search, selectedVendors])

  // Current period object
  const currentPeriodObj = useMemo(() => {
    if (selectedPeriodKey) {
      const [f, t] = selectedPeriodKey.split('|')
      return { fromDate: f, toDate: t }
    }
    const row = payrollData.find((p) => p.fromDate && p.toDate)
    return row ? { fromDate: row.fromDate, toDate: row.toDate } : null
  }, [selectedPeriodKey, payrollData])

  // Checkbox handlers
  const handleToggleRow = (row) => {
    setSelectedRowIds((prev) =>
      prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]
    )
  }

  const isAllSelected = filtered.length > 0 && selectedRowIds.length === filtered.length

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIds([])
    } else {
      setSelectedRowIds(filtered.map((r) => r.id))
    }
  }

  const canGenerate = !loading && !generating && selectedRowIds.length > 0

  // Vendor Filter Handlers
  const handleOpenVendorFilterPopup = (e, triggerRef) => {
    e.stopPropagation()
    const targetEl = triggerRef?.current || filterBtnRef.current
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect()
      setFilterPopupPosition({
        top: rect.bottom + 4,
        left: Math.min(rect.left, window.innerWidth - 270),
      })
    }
    setShowVendorFilterPopup((prev) => !prev)
  }

  const handleApplyVendorFilter = (selectedList) => {
    if (!selectedList || selectedList.length === 0) {
      setSelectedVendors([])
      setSelectedRowIds([])
      setShowVendorFilterPopup(false)
      return
    }

    const isAll = uniqueVendors.length > 1 && selectedList.length === uniqueVendors.length
    const activeVendors = isAll ? [] : selectedList
    setSelectedVendors(activeVendors)

    const q = search.trim().toLowerCase()
    const matchingRows = payrollData.filter((r) => {
      const v = (r.vendor || '').trim()
      const vendorMatch = selectedList.includes(v)
      if (!vendorMatch) return false
      if (!q) return true
      return (
        (r.empId || '').toLowerCase().includes(q) ||
        (r.empNm || '').toLowerCase().includes(q) ||
        (r.vendor || '').toLowerCase().includes(q) ||
        (r.vendorId || '').toLowerCase().includes(q) ||
        (r.skillCat || '').toLowerCase().includes(q) ||
        (r.designation || '').toLowerCase().includes(q)
      )
    })

    const autoSelectedIds = matchingRows.map((r) => r.id)
    setSelectedRowIds(autoSelectedIds)

    if (autoSelectedIds.length > 0) {
      const vendorLabel = selectedList.length === 1 ? selectedList[0] : `${selectedList.length} vendors`
      toast.info(`Selected all ${autoSelectedIds.length} employee(s) for ${vendorLabel}`)
    }

    setShowVendorFilterPopup(false)
  }

  const handleClearVendorFilter = () => {
    setSelectedVendors([])
    setShowVendorFilterPopup(false)
    setSelectedRowIds([])
  }

  // Bulk Generate Payslips & Dispatch Email to Vendors
  const handleGeneratePayslip = async (chosenFormat = 'PDF') => {
    if (!canGenerate) return
    setGenerating(true)
    setShowFormatModal(false)

    const selectedEmployees = payrollData.filter((r) => selectedRowIds.includes(r.id))
    const [fromDate, toDate] = selectedPeriodKey ? selectedPeriodKey.split('|') : ['', '']

    try {
      // 1. Send Payslips Grouped by Vendor to Vendor Email in chosen format (Doc / PDF or Excel)
      let emailResult = null
      try {
        const emailPayload = {
          category,
          fromDate: fromDate || null,
          toDate: toDate || null,
          fileFormat: chosenFormat,
          employeeIds: selectedEmployees.map((e) => e.empId),
          employees: selectedEmployees.map((e) => ({
            id: typeof e.id === 'number' ? e.id : 0,
            employeeId: e.empId,
            employeeName: e.empNm,
            skillCategory: e.skillCat,
            designation: e.designation,
            qualification: e.qualification,
            vendor: e.vendor,
            vendorId: e.vendorId,
            fromDate: e.fromDate,
            toDate: e.toDate,
            dateOfJoining: e.dateOfJoining,
            leavingDate: e.leavingDate,
            pfNo: e.pfNo,
            esiNo: e.esiNo,
            panNo: e.panNo,
            uanNo: e.uanNo,
            workingDays: e.workingDays,
            periodDays: e.periodDays,
            payDaysFull: e.payDaysFull,
            payDaysHalf: e.payDaysHalf,
            otHrs: e.otHrs,
            variableTotal: e.variableTotal,
            refBon: e.refBon,
            splAllw: e.splAllw,
            kaizen: e.kaizen,
            gpaGmc: e.gpaGmc,
            gross: e.gross,
            totalDed: e.totalDed,
            totalDeductions: e.totalDeductions,
            netPayable: e.netPayable,
            earnings: e.earnings || {},
            deductions: e.deductions || {},
            provisions: e.provisions || {},
          })),
          sentBy: CURRENT_USER,
        }

        const emailRes = await fetch(`${API_BASE_URL}/Payslip/send-vendor-emails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload),
        })

        if (emailRes.ok) {
          emailResult = await emailRes.json()
        }
      } catch (err) {
        console.error('Failed to send vendor emails:', err)
      }

      // 2. Mark Payslip Generation in DB
      try {
        const payload = {
          category,
          generatedBy: CURRENT_USER,
          fromDate: currentPeriodObj ? currentPeriodObj.fromDate : '',
          toDate: currentPeriodObj ? currentPeriodObj.toDate : '',
          employeeIds: selectedRowIds,
          records: selectedEmployees.map((e) => ({
            empId: e.empId,
            empNm: e.empNm,
            vendor: e.vendor,
            gross: e.gross,
            netPayable: e.netPayable,
            periodDays: e.periodDays,
            workingDays: e.workingDays,
            otHrs: e.otHrs,
          })),
        }

        await fetch(`${API_BASE_URL}/Payslip/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (err) {
        console.error('Failed to record payslip generation:', err)
      }

      // 3. Reload email status & show feedback
      await loadEmailStatus(category, selectedPeriodKey)

      const formatLabel = chosenFormat === 'EXCEL' ? 'Excel workbook' : 'Doc (PDF)'
      if (emailResult && emailResult.success) {
        toast.success(
          emailResult.message ||
            `Generated payslips & emailed consolidated ${formatLabel} to ${emailResult.successfulVendors} vendor(s)!`
        )
      } else if (emailResult && !emailResult.success) {
        toast.warning(emailResult.message || 'Payslips generated, but some vendor emails could not be sent')
      } else {
        toast.success(`Generated payslips for ${selectedEmployees.length} employee(s) successfully!`)
      }

      setSelectedRowIds([])
      handleRefresh()
    } catch (err) {
      console.error(err)
      toast.error('An error occurred during payslip generation')
    } finally {
      setGenerating(false)
    }
  }

  // Excel Export
  const handleExport = () => {
    if (filtered.length === 0) {
      toast.warning('No data to export')
      return
    }

    const rowsToExport =
      selectedRowIds.length > 0
        ? filtered.filter((r) => selectedRowIds.includes(r.id))
        : filtered

    const isNaps = category === 'NAPS'
    const exportData = rowsToExport.map((r, i) => {
      const base = {
        'S.No': i + 1,
        'Employee ID': r.empId,
        'Employee Name': r.empNm,
        'Skill Category': r.skillCat,
        'Designation': r.qualification || r.designation || '-',
        'Date of Joining': r.dateOfJoining ? fmtDate(r.dateOfJoining) : '-',
        'Days in Month': r.periodDays || 0,
        'Worked Days (Pay Full + Half)': r.workingDays || 0,
        'PF No': r.pfNo || '-',
        'ESI No': r.esiNo || '-',
        'PAN No': r.panNo || '-',
        'UAN No': r.uanNo || '-',
        'Vendor Name': r.vendorId ? `${r.vendor} | ${r.vendorId}` : r.vendor,
        'Vendor ID': r.vendorId || '-',
      }

      if (isNaps) {
        return {
          ...base,
          'Earned Wages (₹)': r.earnedWages || 0,
          'OT Earning (₹)': r.otEarning || 0,
          'Handling Charge (₹)': r.handlingCharge || 0,
          'Gross Salary (₹)': r.gross || 0,
          'Hostel Deduction (₹)': r.hostelDed || 0,
          'Total Deductions (₹)': r.totalDeductions || 0,
          'Ref Bonus (₹)': r.refBon || 0,
          'Spl Allow (₹)': r.splAllw || 0,
          'Kaizen (₹)': r.kaizen || 0,
          'GPA/GMC (₹)': r.gpaGmc || 0,
          'Variable Inputs Total (₹)': r.variableTotal || 0,
          'Net Payable (₹)': r.netPayable || 0,
          'Period From': r.fromDate ? fmtDate(r.fromDate) : '',
          'Period To': r.toDate ? fmtDate(r.toDate) : '',
        }
      }

      return {
        ...base,
        'Ref Bonus (₹)': r.refBon || 0,
        'Spl Allow (₹)': r.splAllw || 0,
        'Kaizen (₹)': r.kaizen || 0,
        'GPA/GMC (₹)': r.gpaGmc || 0,
        'Variable Inputs Total (₹)': r.variableTotal || 0,
        'Gross Salary (₹)': r.gross || 0,
        'Total Deductions (₹)': r.totalDeductions || 0,
        'Net Payable (₹)': r.netPayable || 0,
        'Period From': r.fromDate ? fmtDate(r.fromDate) : '',
        'Period To': r.toDate ? fmtDate(r.toDate) : '',
      }
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Payslips_${category}`)
    XLSX.writeFile(wb, `Payslips_Approved_${category}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success(`Exported ${exportData.length} records to Excel`)
  }

  const handleOpenSlipModal = (empRow) => {
    setSelectedSlipEmp(empRow)
    setPreviewModalOpen(true)
  }

  const handlePrintSlip = () => {
    const slipElem = document.getElementById('printablePayslip')
    if (!slipElem) {
      window.print()
      return
    }

    const existing = document.getElementById('payslipPrintIframe')
    if (existing) {
      existing.remove()
    }

    const iframe = document.createElement('iframe')
    iframe.id = 'payslipPrintIframe'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    iframe.style.visibility = 'hidden'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Yamaha Official Payslip - ${selectedSlipEmp?.empId || ''} - ${selectedSlipEmp?.empNm || ''}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0mm;
            }
            *, *::before, *::after {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              width: 100%;
              height: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            }
            #printablePayslip {
              width: 744px !important;
              min-width: 744px !important;
              max-width: 744px !important;
              height: 1024px !important;
              min-height: 1024px !important;
              max-height: 1024px !important;
              position: relative !important;
              background: #ffffff !important;
              box-shadow: none !important;
              overflow: hidden !important;
              margin: 38px auto !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              break-after: avoid !important;
              break-inside: avoid !important;
            }
            #printablePayslip img {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 744px !important;
              height: 1024px !important;
              object-fit: fill !important;
              display: block !important;
            }
            table {
              border-collapse: collapse;
            }
          </style>
        </head>
        <body>
          ${slipElem.outerHTML}
        </body>
      </html>
    `)
    doc.close()

    iframe.contentWindow.focus()
    setTimeout(() => {
      iframe.contentWindow.print()
      setTimeout(() => {
        iframe.remove()
      }, 1000)
    }, 500)
  }

  // Payslip Data Formatter
  const getSlipData = (emp) => {
    if (!emp) return { earnings: [], deductions: [], totalEarnings: 0, totalDeductions: 0, netPay: 0, variableTotal: 0 }

    const isNaps = category === 'NAPS'
    const ern = emp.earnings || {}
    const ded = emp.deductions || {}
    const prov = emp.provisions || {}

    let earnings = []
    let deductions = []

    if (isNaps) {
      const earnedWages = Number(emp.earnedWages ?? ern.earnedWages ?? 0)
      const otEarning = Number(emp.otEarning ?? ern.otEarning ?? 0)
      const handlingCharge = Number(emp.handlingCharge ?? ern.handlingCharge ?? 0)

      earnings = [
        { name: 'Earned Wages', amount: earnedWages },
        { name: 'OT Earning', amount: otEarning },
        { name: 'Handling Charge', amount: handlingCharge },
      ]

      const hostelDed = Number(emp.hostelDed ?? ded.hostelFee ?? ded.hostelDed ?? ded.hostelDeduction ?? 0)

      deductions = [
        { name: 'Hostel Deduction', amount: hostelDed },
      ]
    } else {
      const attnBonus = Number(emp.attnBonus ?? ern.attnBonus ?? 0)
      const earnedBasicDa = Number(emp.earnedBasicDa ?? ern.earnedBasicDa ?? 0)
      const earnedHra = Number(emp.earnedHra ?? ern.earnedHra ?? 0)
      const otAmount = Number(emp.otAmount ?? ern.otAmount ?? 0)
      const epf = Number(emp.epf ?? ern.epf ?? 0)
      const esi = Number(emp.esi ?? ern.esi ?? 0)
      const bonus = Number(emp.bonusDed ?? ern.bonus ?? 0)
      const serChar = Number(emp.serChar ?? ern.serChar ?? 0)
      const lwf = Number(emp.lwf ?? ern.lwf ?? 0)

      earnings = [
        { name: 'Attendance Bonus', amount: attnBonus },
        { name: 'Basic + DA', amount: earnedBasicDa },
        { name: 'HRA', amount: earnedHra },
        { name: 'OT Amount', amount: otAmount },
        { name: 'EPF', amount: epf },
        { name: 'ESI', amount: esi },
        { name: 'Bonus', amount: bonus },
        { name: 'Service Charge', amount: serChar },
        { name: 'LWF', amount: lwf },
      ]

      const pfDed = Number(emp.pfDed ?? ded.pf ?? 0)
      const esiDed = Number(emp.esiDed ?? ded.esi ?? 0)
      const hostelDed = Number(emp.hostelDed ?? ded.hostelDeduction ?? 0)

      deductions = [
        { name: 'PF', amount: pfDed },
        { name: 'ESI', amount: esiDed },
        { name: 'Hostel Deduction', amount: hostelDed },
      ]
    }

    const refBon = Number(prov.referalBonus ?? emp.refBon ?? emp.Ref_Bon ?? emp.RefBon ?? 0)
    const splAllw = Number(prov.splAllow ?? emp.splAllw ?? emp.Spl_Allw ?? emp.SplAllw ?? 0)
    const kaizen = Number(prov.kaizen ?? emp.kaizen ?? emp.Kaizen ?? 0)
    const gpaGmc = Number(prov.gpaGmc ?? emp.gpaGmc ?? emp.GPA_GMC ?? emp.GpaGmc ?? 0)
    const calcVarTotal = refBon + splAllw + kaizen + gpaGmc

    const variableTotal = calcVarTotal > 0 ? calcVarTotal : (Number(emp.variableTotal) || 0)

    const sumEarnings = earnings.reduce((acc, curr) => acc + curr.amount, 0)
    const totalEarnings = isNaps
      ? sumEarnings
      : (category === 'CL' && Number(emp.totalDed) > 0 ? Number(emp.totalDed) : (Number(emp.gross) || sumEarnings))

    const totalDeductions = deductions.reduce((acc, curr) => acc + curr.amount, 0)
    const netPay = (totalEarnings + variableTotal - totalDeductions)

    return { earnings, deductions, totalEarnings, totalDeductions, netPay, variableTotal, refBon, splAllw, kaizen, gpaGmc }
  }

  /* ========================================================================= */
  /* TABLE COLUMNS - ALIGNED WITH USER MASTER (users.js)                       */
  /* ========================================================================= */
  const columns = useMemo(() => {
    const isVendorFiltered = selectedVendors.length > 0

    return [
      {
        name: (
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={handleToggleSelectAll}
            title={isAllSelected ? 'Deselect All' : 'Select All'}
            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
          />
        ),
        cell: (row) => (
          <input
            type="checkbox"
            checked={selectedRowIds.includes(row.id)}
            onChange={() => handleToggleRow(row)}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
          />
        ),
        width: '5%',
        style: { flex: '0 0 5%', justifyContent: 'center' },
        center: true,
      },
      {
        name: 'S.No',
        selector: (_, i) => i + 1,
        width: '6%',
        style: { flex: '0 0 6%', justifyContent: 'center' },
        center: true,
      },
      {
        name: 'Employee ID',
        selector: (row) => row.empId,
        sortable: true,
        width: '14%',
        style: { flex: '0 0 14%' },
        cell: (row) => {
          const empKey = (row.empId || '').trim().toUpperCase()
          const emailInfo = emailStatusMap[empKey]
          const isSent = emailInfo?.mailSentStatus === 'SENT'

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isSent ? (
                <FaEnvelope
                  size={13}
                  color="#16a34a"
                  title={`Mail Sent on ${emailInfo.mailSentOn ? fmtDate(emailInfo.mailSentOn) : 'Success'} to ${emailInfo.vendorEmail || 'Vendor'}`}
                  style={{ flexShrink: 0, cursor: 'help' }}
                />
              ) : (
                <FaEnvelope
                  size={13}
                  color="#ef4444"
                  title={emailInfo ? `Mail Not Sent: ${emailInfo.remarks || 'Failed'}` : 'Mail Not Sent Yet (Select & click Generate Payslip)'}
                  style={{ flexShrink: 0, cursor: 'help' }}
                />
              )}
              <span className="emp-code" style={{ fontSize: '13px', fontWeight: 600 }}>
                {row.empId || '-'}
              </span>
            </div>
          )
        },
      },
      {
        name: 'Employee Name',
        selector: (row) => row.empNm,
        sortable: true,
        width: '18%',
        style: { flex: '0 0 18%' },
        cell: (row) => (
          <span style={{ fontWeight: 600, color: '#1f2937', fontSize: '13px' }}>
            {row.empNm}
          </span>
        ),
      },
      {
        name: 'Skill Category',
        selector: (row) => row.skillCat,
        sortable: true,
        width: '14%',
        style: { flex: '0 0 14%' },
        cell: (row) => <SkillCatBadge skillCat={row.skillCat} />,
      },
      {
        name: (
          <div
            ref={vendorHeaderRef}
            onClick={(e) => handleOpenVendorFilterPopup(e, vendorHeaderRef)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              userSelect: 'none',
              width: '100%',
            }}
            title="Click to filter by Vendor"
          >
            <span
              style={{
                color: isVendorFiltered ? '#4915af' : 'inherit',
                fontWeight: isVendorFiltered ? 800 : 600,
              }}
            >
              Vendor Name
            </span>
            <FaFilter
              size={11}
              style={{
                color: isVendorFiltered ? '#4915af' : '#9ca3af',
                flexShrink: 0,
              }}
            />
          </div>
        ),
        selector: (row) => row.vendor,
        sortable: true,
        width: '15%',
        style: { flex: '0 0 15%' },
        cell: (row) => {
          const vName = (row.vendor && row.vendor !== '-') ? row.vendor : '-'
          const vId = row.vendorId ? String(row.vendorId).trim() : ''
          const displayVendor = (vName !== '-' && vId) ? `${vName} | ${vId}` : (vName !== '-' ? vName : (vId || '-'))

          return (
            <span
              style={{ color: '#1f2937', fontWeight: 600, fontSize: '13px' }}
              title={vId ? `Vendor: ${vName} | ID: ${vId}` : vName}
            >
              {displayVendor}
            </span>
          )
        },
      },
      {
        name: 'Net Payable',
        selector: (row) => row.netPayable || 0,
        sortable: true,
        width: '14%',
        style: { flex: '0 0 14%', justifyContent: 'flex-end' },
        right: true,
        cell: (row) => (
          <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '13px' }}>
            {money(row.netPayable)}
          </span>
        ),
      },
      {
        name: 'Actions',
        center: true,
        width: '15%',
        style: { flex: '0 0 15%', justifyContent: 'center' },
        cell: (row) => (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            <button
              className="table-action-btn vview-btn"
              onClick={(e) => {
                e.stopPropagation()
                handleOpenSlipModal(row)
              }}
              title="View & Print Payslip"
              style={{
                width: 'auto',
                padding: '0 10px',
                height: '28px',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <FaEye /> View Slip
            </button>
          </div>
        ),
      },
    ]
  }, [isAllSelected, selectedRowIds, selectedVendors, emailStatusMap])

  const totalApprovedCount = payrollData.length
  const totalSelectedCount = selectedRowIds.length

  const totalSentCount = useMemo(() => {
    return payrollData.filter((r) => {
      const k = (r.empId || '').trim().toUpperCase()
      return emailStatusMap[k]?.mailSentStatus === 'SENT'
    }).length
  }, [payrollData, emailStatusMap])

  const summaryCards = [
    {
      label: 'Approved Records',
      value: selectedVendors.length > 0 ? `${filtered.length} of ${totalApprovedCount}` : totalApprovedCount,
      icon: FaCheckCircle,
      bg: '#e3f6ea',
      fg: '#16a34a',
    },
    {
      label: 'Selected For Payslip',
      value: totalSelectedCount,
      icon: FaUsers,
      bg: '#e9edfd',
      fg: '#4e73df',
    },
    {
      label: 'Vendor Mails Sent',
      value: `${totalSentCount} of ${totalApprovedCount}`,
      icon: FaEnvelope,
      bg: '#e0f2fe',
      fg: '#0284c7',
    },
    {
      label: 'Category & Period',
      value: `${category} · ${currentPeriodObj ? fmtPeriodLabel(currentPeriodObj.fromDate, currentPeriodObj.toDate) : 'No period'}`,
      icon: FaBuilding,
      bg: '#fef3c7',
      fg: '#b45309',
    },
  ]

  const slipData = selectedSlipEmp ? getSlipData(selectedSlipEmp) : null

  return (
    <div className="user-master-page" style={{ paddingBottom: '90px' }}>
      {/* Hidden container style for print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printablePayslip, #printablePayslip * {
            visibility: visible !important;
          }
          #printablePayslip {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 744px !important;
            min-width: 744px !important;
            max-width: 744px !important;
            height: 1024px !important;
            min-height: 1024px !important;
            max-height: 1024px !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            z-index: 999999 !important;
          }
        }
      `}</style>

      {/* Summary KPI Cards (identical to user-master-page) */}
      <div
        className="summary-stats-wrapper"
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          background: '#fff',
          padding: '18px 20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        {summaryCards.map(({ label, value, icon: Icon, bg, fg }) => (
          <div
            key={label}
            style={{
              flex: 1,
              minWidth: '180px',
              background: bg,
              borderRadius: '10px',
              padding: '14px 16px',
              border: '2px solid transparent',
              transition: 'all 0.15s ease-in-out',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#3f4a6b' }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: typeof value === 'number' ? '24px' : '15px', fontWeight: 700, color: '#1f2937' }}>
                {value}
              </span>
              <Icon size={22} color={fg} />
            </div>
          </div>
        ))}
      </div>

      {/* Data Table Card (styled with user.css .table-card & .table-header) */}
      <CCard className="mt-3 table-card">
        <CCardBody>
          <div className="table-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div className="table-title">PAYSLIP LIST</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Category Toggle */}
              <div
                style={{
                  display: 'inline-flex',
                  background: '#f1f4f9',
                  padding: '3px',
                  borderRadius: '6px',
                  border: '1px solid #d8deed',
                }}
              >
                {CATEGORIES.map((c) => {
                  const active = category === c
                  return (
                    <button
                      key={c}
                      onClick={() => handleCategoryChange(c)}
                      style={{
                        border: 'none',
                        background: active ? '#4915af' : 'transparent',
                        color: active ? '#fff' : '#5b6475',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '4px 14px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>

              {/* Period Dropdown */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#5b6475',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    margin: 0,
                  }}
                >
                  <FaCalendarAlt size={12} color="#4915af" /> Period:
                </label>
                <select
                  value={selectedPeriodKey}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  disabled={periodsLoading}
                  style={{
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '4px',
                    border: '1px solid #c4d3ea',
                    background: '#fff',
                    fontWeight: 600,
                    fontSize: '12px',
                    color: '#1f2937',
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '200px',
                  }}
                >
                  {periods.length === 0 ? (
                    <option value="">No Approved Periods</option>
                  ) : (
                    periods.map((p) => (
                      <option key={p.key} value={p.key}>
                        {fmtPeriodOption(p.fromDate, p.toDate)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Search Box */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <FaSearch
                  style={{
                    position: 'absolute',
                    left: '12px',
                    color: '#9ca3af',
                    fontSize: '13px',
                    pointerEvents: 'none',
                  }}
                />
                <CFormInput
                  placeholder="Search Emp ID, Name..."
                  className="search-box"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: '34px', width: '200px' }}
                />
                {search && (
                  <FaTimes
                    onClick={() => setSearch('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      color: '#9ca3af',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  />
                )}
              </div>

              {/* Vendor Filter Button (Employee Master Style) */}
              <div style={{ position: 'relative' }}>
                <CButton
                  size="sm"
                  ref={filterBtnRef}
                  onClick={(e) => handleOpenVendorFilterPopup(e, filterBtnRef)}
                  title={selectedVendors.length > 0 ? `Vendor Filter Active (${selectedVendors.length})` : 'Filter by Vendor'}
                  style={{
                    background: selectedVendors.length > 0 ? '#4915af' : '#fff',
                    color: selectedVendors.length > 0 ? '#fff' : '#4915af',
                    border: selectedVendors.length > 0 ? '1px solid #4915af' : '1px solid #d8deed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '32px',
                    borderRadius: '4px',
                    padding: '0 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <FaFilter size={11} color={selectedVendors.length > 0 ? '#fff' : '#4915af'} />
                  {selectedVendors.length > 0 ? `Vendor (${selectedVendors.length})` : 'Filter Vendor'}
                </CButton>
              </div>

              {/* Clear Vendor Filter Button if active */}
              {selectedVendors.length > 0 && (
                <button
                  onClick={handleClearVendorFilter}
                  style={{
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: '4px',
                    padding: '0 8px',
                    height: '32px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Clear vendor filter"
                >
                  <FaTimes size={10} /> Clear Filter
                </button>
              )}

              {/* Refresh Button */}
              <button
                className="table-action-btn"
                onClick={handleRefresh}
                disabled={loading}
                title="Refresh records"
                style={{ width: '32px', height: '32px', border: '1px solid #d8deed' }}
              >
                <FaSyncAlt className={loading ? 'fa-spin' : ''} size={12} color="#4915af" />
              </button>

              {/* Export to Excel */}
              <CButton
                onClick={handleExport}
                disabled={loading || filtered.length === 0}
                className="save-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '32px',
                  padding: '0 12px',
                  fontSize: '12px',
                  background: '#16a34a',
                }}
              >
                <FaDownload size={11} /> Export
              </CButton>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            pagination
            paginationRowsPerPageOptions={paginationRowsPerPageOptions}
            paginationComponentOptions={paginationComponentOptions}
            striped
            responsive
            highlightOnHover
            customStyles={customStyles}
            progressPending={loading}
            progressComponent={
              <div style={{ padding: '30px', color: '#6b7280', fontSize: '13px', fontWeight: 600 }}>
                Loading approved payroll records...
              </div>
            }
            noDataComponent={
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>
                  No Approved Records Found
                </div>
                <div style={{ fontSize: '12px' }}>
                  {selectedVendors.length > 0
                    ? `No approved records found for selected vendor(s): ${selectedVendors.join(', ')}`
                    : `Approved records for category ${category} will appear here.`}
                </div>
              </div>
            }
          />
        </CCardBody>
      </CCard>

      {/* Column Filter Popup Modal (Employee Master Excel Style) */}
      {showVendorFilterPopup && (
        <ColumnFilterPopup
          uniqueValues={uniqueVendors}
          selectedValues={selectedVendors.length > 0 ? selectedVendors : uniqueVendors}
          onApply={handleApplyVendorFilter}
          onClose={() => setShowVendorFilterPopup(false)}
          position={filterPopupPosition}
        />
      )}

      {/* Fixed Bottom Action Bar */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '20px',
          padding: '12px 24px',
          background: '#ffffff',
          borderTop: '1px solid #d8deed',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            color: canGenerate ? '#16a34a' : '#64748b',
            fontWeight: 600,
          }}
        >
          {selectedRowIds.length > 0
            ? `${selectedRowIds.length} approved employee(s) selected for Payslip generation`
            : filtered.length > 0
            ? `Select approved employees above using checkboxes to generate payslips (${filtered.length} available${selectedVendors.length > 0 ? ` for selected vendor` : ''})`
            : 'No approved records matching the current filter'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CButton
            onClick={() => {
              if (canGenerate) {
                setShowFormatModal(true)
              }
            }}
            disabled={!canGenerate}
            className="save-btn"
            style={{
              height: '38px',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: canGenerate ? '#4915af' : '#9ca3af',
              cursor: canGenerate ? 'pointer' : 'not-allowed',
            }}
          >
            <FaFileInvoiceDollar size={15} />
            {generating
              ? 'Generating & Sending Emails...'
              : selectedRowIds.length > 0
              ? `Generate Payslip (${selectedRowIds.length})`
              : 'Generate Payslip'}
          </CButton>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEND PAYSLIP FORMAT MODAL (DOC / PDF vs EXCEL)                            */}
      {/* ========================================================================= */}
      <CModal
        visible={showFormatModal}
        onClose={() => setShowFormatModal(false)}
        size="md"
        backdrop="static"
        alignment="center"
      >
        <CModalHeader style={{ background: '#0a1d37', color: '#fff', borderBottom: 'none', padding: '16px 20px' }}>
          <CModalTitle style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaEnvelope color="#60a5fa" /> Send Payslips to Vendor
          </CModalTitle>
        </CModalHeader>
        <CModalBody style={{ padding: '24px 20px', background: '#f8fafc' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h5 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              Do you want to send the data through Doc or Excel?
            </h5>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Sending payslips for <strong>{selectedRowIds.length}</strong> selected employee(s) to respective vendor email(s).
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Doc / PDF Option Card */}
            <div
              onClick={() => setSelectedFormat('PDF')}
              style={{
                border: selectedFormat === 'PDF' ? '2px solid #4915af' : '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '16px 14px',
                background: selectedFormat === 'PDF' ? '#f5f3ff' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: selectedFormat === 'PDF' ? '0 4px 12px rgba(73, 21, 175, 0.15)' : 'none',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: selectedFormat === 'PDF' ? '#ede9fe' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FaFilePdf size={20} color="#dc2626" />
                </div>
                <input
                  type="radio"
                  name="formatSelection"
                  checked={selectedFormat === 'PDF'}
                  onChange={() => setSelectedFormat('PDF')}
                  style={{ width: '16px', height: '16px', accentColor: '#4915af', cursor: 'pointer' }}
                />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                Doc (PDF)
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                All employee payslips combined into one consolidated multi-page PDF document.
              </div>
            </div>

            {/* Excel Option Card */}
            <div
              onClick={() => setSelectedFormat('EXCEL')}
              style={{
                border: selectedFormat === 'EXCEL' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '16px 14px',
                background: selectedFormat === 'EXCEL' ? '#f0fdf4' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: selectedFormat === 'EXCEL' ? '0 4px 12px rgba(22, 163, 74, 0.15)' : 'none',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: selectedFormat === 'EXCEL' ? '#dcfce7' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FaFileExcel size={20} color="#16a34a" />
                </div>
                <input
                  type="radio"
                  name="formatSelection"
                  checked={selectedFormat === 'EXCEL'}
                  onChange={() => setSelectedFormat('EXCEL')}
                  style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                Excel (.xlsx)
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                All employees in one comprehensive Excel spreadsheet with complete details from Emp ID to Net Payable.
              </div>
            </div>
          </div>
        </CModalBody>
        <CModalFooter style={{ background: '#f1f5f9', borderTop: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <CButton
            color="secondary"
            variant="ghost"
            onClick={() => setShowFormatModal(false)}
            style={{ fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          >
            Cancel
          </CButton>
          <CButton
            onClick={() => handleGeneratePayslip(selectedFormat)}
            disabled={generating}
            style={{
              background: selectedFormat === 'EXCEL' ? '#16a34a' : '#4915af',
              borderColor: selectedFormat === 'EXCEL' ? '#16a34a' : '#4915af',
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              padding: '8px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            {selectedFormat === 'EXCEL' ? <FaFileExcel size={14} /> : <FaFilePdf size={14} />}
            {generating ? 'Processing...' : `Send as ${selectedFormat === 'EXCEL' ? 'Excel' : 'Doc'}`}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ========================================================================= */}
      {/* YAMAHA BRANDED OFFICIAL PAYSLIP (ON TOP OF PAYSLIP.PNG BACKGROUND)        */}
      {/* ========================================================================= */}
      <CModal
        visible={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        size="xl"
        backdrop="static"
      >
        <CModalHeader style={{ background: '#0a1d37', color: '#fff', borderBottom: 'none' }}>
          <CModalTitle style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaFileInvoiceDollar /> Yamaha Official Payslip Preview
          </CModalTitle>
        </CModalHeader>
        <CModalBody style={{ padding: '20px', background: '#f1f5f9', display: 'flex', justifyContent: 'center' }}>
          {selectedSlipEmp ? (
            <div
              id="printablePayslip"
              style={{
                width: '744px',
                minWidth: '744px',
                maxWidth: '744px',
                height: '1024px',
                minHeight: '1024px',
                maxHeight: '1024px',
                position: 'relative',
                background: '#ffffff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                boxSizing: 'border-box',
                fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                color: '#0f172a',
                overflow: 'hidden',
              }}
            >
              {/* Background Image Template (PAYSLIP.png) */}
              <img
                src={payslipBg}
                alt="Payslip Template"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '744px',
                  height: '1024px',
                  objectFit: 'fill',
                  zIndex: 0,
                  pointerEvents: 'none',
                }}
              />

              {/* CONTENT LAYER OVERLAY */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: '100%',
                  height: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {/* 1. TOP HEADER: "PAYSLIP" Title & "FOR THE MONTH OF" Pill */}
                <div
                  style={{
                    position: 'absolute',
                    top: '115px',
                    right: '32px',
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                  }}
                >
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 900,
                      color: '#0a2540',
                      letterSpacing: '0.04em',
                      lineHeight: '1',
                      fontFamily: "'Segoe UI', Roboto, sans-serif",
                    }}
                  >
                    PAYSLIP
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '7px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 800,
                        color: '#334155',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      FOR THE MONTH OF
                    </span>
                    <span
                      style={{
                        background: '#0a2540',
                        color: '#ffffff',
                        fontSize: '10.5px',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '3px',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {getMonthYearLabel(selectedSlipEmp.fromDate, selectedSlipEmp.toDate)}
                    </span>
                  </div>
                </div>

                {/* 2. MAIN BODY (Positioned between top header banner and bottom footer) */}
                <div
                  style={{
                    position: 'absolute',
                    top: '192px',
                    left: '24px',
                    right: '24px',
                    width: '696px',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* (A) EMPLOYEE DETAILS BOX (ENLARGED & PROMINENT) */}
                  <div
                    style={{
                      border: '1.5px solid #1e3a8a',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: '#ffffff',
                      marginBottom: '10px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}
                  >
                    {/* Header Bar */}
                    <div
                      style={{
                        background: '#1e3a8a',
                        color: '#ffffff',
                        padding: '7px 16px',
                        fontSize: '12px',
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textTransform: 'uppercase',
                      }}
                    >
                      <FaIdBadge size={13} /> EMPLOYEE DETAILS
                    </div>

                    {/* 2-Column Content (Enlarged, Spacious & Readable) */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        padding: '12px 18px',
                        gap: '6px 24px',
                        fontSize: '12px',
                        lineHeight: '1.4',
                      }}
                    >
                      {/* Left Column */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '18px 140px 8px 1fr', alignItems: 'center' }}>
                          <FaUser size={11} color="#1e3a8a" />
                          <span style={{ color: '#475569', fontWeight: 600 }}>Employee Code</span>
                          <span>:</span>
                          <strong style={{ color: '#0f172a', fontSize: '12px' }}>{selectedSlipEmp.empId}</strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '18px 140px 8px 1fr', alignItems: 'center' }}>
                          <FaUser size={11} color="#1e3a8a" />
                          <span style={{ color: '#475569', fontWeight: 600 }}>Employee Name</span>
                          <span>:</span>
                          <strong style={{ color: '#0f172a', fontSize: '12px' }}>{selectedSlipEmp.empNm}</strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '18px 140px 8px 1fr', alignItems: 'center' }}>
                          <FaIdCard size={11} color="#1e3a8a" />
                          <span style={{ color: '#475569', fontWeight: 600 }}>Designation</span>
                          <span>:</span>
                          <strong style={{ color: '#0f172a', fontSize: '12px' }}>{selectedSlipEmp.qualification || selectedSlipEmp.designation || '-'}</strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '18px 140px 8px 1fr', alignItems: 'center' }}>
                          <FaPlusCircle size={11} color="#1e3a8a" />
                          <span style={{ color: '#475569', fontWeight: 600 }}>Date of Joining (DOJ)</span>
                          <span>:</span>
                          <strong style={{ color: '#0f172a', fontSize: '12px' }}>{fmtDate(selectedSlipEmp.dateOfJoining)}</strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '18px 140px 8px 1fr', alignItems: 'center' }}>
                          <FaCalendarAlt size={11} color="#1e3a8a" />
                          <span style={{ color: '#475569', fontWeight: 600 }}>Days in Month</span>
                          <span>:</span>
                          <strong style={{ color: '#0f172a', fontSize: '12px' }}>{selectedSlipEmp.periodDays || 0}</strong>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '18px 110px 8px 1fr', alignItems: 'center' }}>
                          <FaUniversity size={11} color="#1e3a8a" />
                          <span style={{ color: '#475569', fontWeight: 600 }}>PF No</span>
                          <span>:</span>
                          <strong style={{ color: '#0f172a', fontSize: '12px' }}>{selectedSlipEmp.pfNo || '-'}</strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '18px 110px 8px 1fr', alignItems: 'center' }}>
                          <FaShieldAlt size={11} color="#1e3a8a" />
                          <span style={{ color: '#475569', fontWeight: 600 }}>ESI No</span>
                          <span>:</span>
                          <strong style={{ color: '#0f172a', fontSize: '12px' }}>{selectedSlipEmp.esiNo || '-'}</strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '18px 110px 8px 1fr', alignItems: 'center' }}>
                          <FaCreditCard size={11} color="#1e3a8a" />
                          <span style={{ color: '#475569', fontWeight: 600 }}>PAN No</span>
                          <span>:</span>
                          <strong style={{ color: '#0f172a', fontSize: '12px' }}>{selectedSlipEmp.panNo || '-'}</strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '18px 110px 8px 1fr', alignItems: 'center' }}>
                          <FaUsers size={11} color="#1e3a8a" />
                          <span style={{ color: '#475569', fontWeight: 600 }}>UAN No</span>
                          <span>:</span>
                          <strong style={{ color: '#0f172a', fontSize: '12px' }}>{selectedSlipEmp.uanNo || '-'}</strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '18px 110px 8px 1fr', alignItems: 'center' }}>
                          <FaCalendarCheck size={11} color="#16a34a" />
                          <span style={{ color: '#475569', fontWeight: 600 }}>Worked Days</span>
                          <span>:</span>
                          <strong style={{ color: '#16a34a', fontSize: '12.5px' }}>{fmtDays(selectedSlipEmp.workingDays)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* (B) SIDE-BY-SIDE EARNINGS & DEDUCTIONS TABLES */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px',
                      marginBottom: '10px',
                    }}
                  >
                    {/* LEFT TABLE: EARNINGS */}
                    <div
                      style={{
                        border: '1.5px solid #1e3a8a',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div
                        style={{
                          background: '#1e3a8a',
                          color: '#ffffff',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          textTransform: 'uppercase',
                        }}
                      >
                        <FaWallet size={11} /> EARNINGS
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <thead>
                          <tr style={{ background: '#e0f2fe', borderBottom: '1px solid #93c5fd' }}>
                            <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 700, color: '#1e3a8a' }}>
                              Components
                            </th>
                            <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: '#1e3a8a' }}>
                              Amount (Rs.)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {slipData.earnings.map((item, idx) => (
                            <tr
                              key={item.name}
                              style={{
                                background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                              }}
                            >
                              <td style={{ padding: '3.5px 8px', color: '#334155', fontWeight: 500 }}>
                                {item.name}
                              </td>
                              <td style={{ padding: '3.5px 8px', textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>
                                {fmtNumber(item.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#f1f5f9', borderTop: '1.5px solid #1e3a8a' }}>
                            <td style={{ padding: '5px 8px', fontWeight: 800, color: '#0f172a', fontSize: '10.5px' }}>
                              Total Earnings
                            </td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '10.5px' }}>
                              {fmtNumber(slipData.totalEarnings)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* RIGHT TABLE: DEDUCTIONS */}
                    <div
                      style={{
                        border: '1.5px solid #1e3a8a',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div
                        style={{
                          background: '#1e3a8a',
                          color: '#ffffff',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          textTransform: 'uppercase',
                        }}
                      >
                        <FaHandHoldingUsd size={12} /> DEDUCTIONS
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <thead>
                          <tr style={{ background: '#e0f2fe', borderBottom: '1px solid #93c5fd' }}>
                            <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 700, color: '#1e3a8a' }}>
                              Components
                            </th>
                            <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: '#1e3a8a' }}>
                              Amount (Rs.)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {slipData.deductions.map((item, idx) => (
                            <tr
                              key={item.name}
                              style={{
                                background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                              }}
                            >
                              <td style={{ padding: '3.5px 8px', color: '#334155', fontWeight: 500 }}>
                                {item.name}
                              </td>
                              <td style={{ padding: '3.5px 8px', textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>
                                {fmtNumber(item.amount)}
                              </td>
                            </tr>
                          ))}
                          {/* Pad empty rows so heights match */}
                          {slipData.deductions.length < slipData.earnings.length &&
                            Array.from({ length: slipData.earnings.length - slipData.deductions.length }).map((_, i) => (
                              <tr key={`pad-${i}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '3.5px 8px', color: '#cbd5e1' }}>-</td>
                                <td style={{ padding: '3.5px 8px', textAlign: 'right', color: '#cbd5e1' }}>-</td>
                              </tr>
                            ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#f1f5f9', borderTop: '1.5px solid #1e3a8a' }}>
                            <td style={{ padding: '5px 8px', fontWeight: 800, color: '#0f172a', fontSize: '10.5px' }}>
                              Total Deductions
                            </td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '10.5px' }}>
                              {fmtNumber(slipData.totalDeductions)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* (C) PROVISIONS / VARIABLE INPUTS */}
                  <div
                    style={{
                      border: '1.5px solid #fde047',
                      background: '#fefce8',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      marginBottom: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ca8a04', display: 'inline-block' }} />
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          PROVISIONS / VARIABLE INPUTS :
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: '#854d0e' }}>
                        Rs. {fmtNumber(slipData.variableTotal)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '6px', fontSize: '10.5px', color: '#713f12' }}>
                      <span>Ref Bonus: <strong>₹{fmtNumber(slipData.refBon)}</strong></span>
                      {(category !== 'NAPS' || slipData.splAllw > 0) && (
                        <span>Spl Allow: <strong>₹{fmtNumber(slipData.splAllw)}</strong></span>
                      )}
                      <span>Kaizen: <strong>₹{fmtNumber(slipData.kaizen)}</strong></span>
                      {(category !== 'NAPS' || slipData.gpaGmc > 0) && (
                        <span>GPA/GMC: <strong>₹{fmtNumber(slipData.gpaGmc)}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* (D) NET PAY FOR THE MONTH BOX (Moved down as requested) */}
                  <div
                    style={{
                      border: '1.5px solid #bfdbfe',
                      borderRadius: '6px',
                      background: '#ffffff',
                      padding: '10px 16px',
                      marginTop: '4px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1px 1.4fr',
                      alignItems: 'center',
                      gap: '14px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* Left title with Coins Icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: '#e0f2fe',
                          color: '#0a2540',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          flexShrink: 0,
                        }}
                      >
                        <FaCoins />
                      </div>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                          Net Pay for the Month
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>
                          (Rupees in Words)
                        </div>
                      </div>
                    </div>

                    {/* Vertical Divider */}
                    <div style={{ background: '#cbd5e1', height: '100%', minHeight: '36px' }} />

                    {/* Right Amount & Words */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
                        Rs. {fmtNumber(slipData.netPay)}
                      </div>
                      <div style={{ fontSize: '10px', color: '#334155', fontStyle: 'italic', marginTop: '1px' }}>
                        ({numberToWordsIndian(slipData.netPay)})
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </CModalBody>
        <CModalFooter style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <CButton color="secondary" size="sm" onClick={() => setPreviewModalOpen(false)}>
            Close
          </CButton>
          <CButton
            color="primary"
            size="sm"
            onClick={handlePrintSlip}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: '#1e3a8a' }}
          >
            <FaPrint size={12} /> Print Official Slip
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Payslip
