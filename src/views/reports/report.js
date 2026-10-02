import React, { useState, useEffect, useMemo, useCallback } from 'react'
import DataTable from 'react-data-table-component'
import {
  CCard,
  CCardBody,
  CButton,
  CSpinner,
  CBadge,
} from '@coreui/react'
import {
  FaSearch,
  FaTimes,
  FaFileExcel,
  FaUsers,
  FaMoneyBillWave,
  FaFilter,
  FaCalendarAlt,
  FaCheckCircle,
  FaMinusCircle,
  FaWallet,
  FaCoins,
  FaCheck,
  FaPause,
  FaClock,
  FaExclamationTriangle,
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import * as XLSX from 'xlsx'
import '../../assets/CSS/user.css'
import API from '../../api.js'

/* ========================================================================= */
/* FORMATTING UTILITIES                                                      */
/* ========================================================================= */
const money = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const fmtNumber = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

const fmtDate = (val) => {
  if (!val) return '-'
  const clean = toDateString(val)
  const d = new Date(clean)
  if (Number.isNaN(d.getTime())) return clean
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const fmtDateTime = (val) => {
  if (!val) return '-'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return String(val).slice(0, 16)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ========================================================================= */
/* STATUS BADGE STYLING (MATCHING PAYROLL APPROVER COLORS)                   */
/* ========================================================================= */
const getStatusMeta = (val) => {
  if (!val) return { label: 'Pending', bg: '#94a3b8', Icon: FaClock }
  const raw = val.toString().trim()
  const u = raw.toUpperCase()
  if (!u || u === '-' || u === 'NULL' || u === 'PENDING') {
    return { label: 'Pending', bg: '#94a3b8', Icon: FaClock }
  }

  // Strip prefixes like "APPROVER-", "CHECKER-"
  const clean = u.replace(/^(APPROVER|CHECKER)[-_\s]*/, '')

  if (clean.includes('REJECT') || u.endsWith('-REJECT') || u === 'REJECTED') {
    return { label: 'Rejected', bg: '#ef4444', Icon: FaExclamationTriangle }
  }
  if (clean.includes('HOLD') || u.endsWith('-HOLD')) {
    return { label: 'Hold', bg: '#f59e0b', Icon: FaPause }
  }
  if (clean.includes('VERIF') || u.endsWith('-VERIFIED')) {
    return { label: 'Verified', bg: '#5b21b6', Icon: FaCheck }
  }
  if (clean.includes('APPROV') || u.endsWith('-APPROVED')) {
    return { label: 'Approved', bg: '#16a34a', Icon: FaCheck }
  }

  return { label: raw, bg: '#64748b', Icon: FaClock }
}

const renderStatusBadge = (val) => {
  const meta = getStatusMeta(val)
  const Icon = meta.Icon
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 9px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        background: meta.bg,
        color: '#ffffff',
        whiteSpace: 'nowrap',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      }}
    >
      <Icon size={10} />
      {meta.label}
    </span>
  )
}

/* ========================================================================= */
/* SKILL BADGE COLORS & DATATABLE CUSTOM STYLES (MATCHING PAYROLL MAKER)     */
/* ========================================================================= */
const SKILL_COLORS = {
  'un skilled': { bg: '#e0f2fe', color: '#0369a1' },
  'unskilled': { bg: '#e0f2fe', color: '#0369a1' },
  'semi skilled': { bg: '#fef3c7', color: '#92400e' },
  'semi-skilled': { bg: '#fef3c7', color: '#92400e' },
  'semi skilled level-2': { bg: '#fce7f3', color: '#be185d' },
  'semi-skilled level-2': { bg: '#fce7f3', color: '#be185d' },
  'semi skilled lv.2': { bg: '#fce7f3', color: '#be185d' },
  'skilled': { bg: '#d1fae5', color: '#047857' },
  'trainee': { bg: '#fef08a', color: '#78350f' },
  'e1': { bg: '#e0e7ff', color: '#4c1d95' },
}

const customStyles = {
  rows: {
    style: {
      minHeight: '32px',
      cursor: 'default',
      '&:hover': {
        backgroundColor: '#f8fafc',
      },
    },
  },
  headCells: {
    style: {
      fontSize: '9px',
      fontWeight: '700',
      paddingTop: '8px',
      paddingBottom: '8px',
      paddingLeft: '6px',
      paddingRight: '6px',
      background: '#f1f4f9',
      color: '#334155',
      textTransform: 'uppercase',
      whiteSpace: 'normal',
      overflow: 'visible',
      textOverflow: 'unset',
      wordBreak: 'break-word',
      lineHeight: '1.2',
      minHeight: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
    },
  },
  cells: {
    style: {
      justifyContent: 'center',
      fontSize: '12px',
      paddingTop: '2px',
      paddingBottom: '2px',
      paddingLeft: '6px',
      paddingRight: '6px',
      boxSizing: 'border-box',
      whiteSpace: 'nowrap',
    },
  },
}

const paginationOptions = {
  rowsPerPageText: 'Rows per page:',
  rangeSeparatorText: 'of',
  selectAllRowsItem: true,
  selectAllRowsItemText: 'All',
}

const Report = () => {
  // Category state (CL / NAPS)
  const [category, setCategory] = useState('CL')

  // Top Filter States (Based strictly on From Date and To Date — Period Preset removed)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedEmpId, setSelectedEmpId] = useState('')
  const [selectedSkillCat, setSelectedSkillCat] = useState('')
  const [selectedVendor, setSelectedVendor] = useState('')

  // Quick in-table search filter
  const [searchFilter, setSearchFilter] = useState('')

  // Dropdown options from backend
  const [filterOptions, setFilterOptions] = useState({
    employees: [],
    skillCategories: [],
    vendors: [],
    periods: [],
  })

  // Data & loading states
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)

  /* ========================================================================= */
  /* FETCH FILTER OPTIONS & AUTO-POPULATE DEFAULT DATES                        */
  /* ========================================================================= */
  const fetchFilterOptions = useCallback(async (cat) => {
    try {
      setOptionsLoading(true)
      const res = await API.get(`/PayrollReport/filter-options?category=${cat}`)
      if (res && res.data) {
        setFilterOptions({
          employees: res.data.employees || [],
          skillCategories: res.data.skillCategories || [],
          vendors: res.data.vendors || [],
          periods: res.data.periods || [],
        })

        // If fromDate/toDate are empty, auto-populate from latest period found
        if (res.data.periods && res.data.periods.length > 0) {
          const latest = res.data.periods[0]
          if (latest.fromDate && latest.toDate) {
            setFromDate((prev) => prev || toDateString(latest.fromDate))
            setToDate((prev) => prev || toDateString(latest.toDate))
          }
        }
      }
    } catch (err) {
      console.error('Error loading filter options:', err)
      toast.error('Failed to load filter options')
    } finally {
      setOptionsLoading(false)
    }
  }, [])

  /* ========================================================================= */
  /* FETCH REPORT DATA                                                         */
  /* ========================================================================= */
  const fetchReportData = useCallback(
    async (overrideFilters = {}) => {
      try {
        setLoading(true)
        const params = {
          category: overrideFilters.category !== undefined ? overrideFilters.category : category,
          fromDate:
            overrideFilters.fromDate !== undefined
              ? overrideFilters.fromDate
              : fromDate || undefined,
          toDate:
            overrideFilters.toDate !== undefined ? overrideFilters.toDate : toDate || undefined,
          empId:
            overrideFilters.empId !== undefined
              ? overrideFilters.empId
              : selectedEmpId || undefined,
          skillCat:
            overrideFilters.skillCat !== undefined
              ? overrideFilters.skillCat
              : selectedSkillCat || undefined,
          vendor:
            overrideFilters.vendor !== undefined
              ? overrideFilters.vendor
              : selectedVendor || undefined,
        }

        const res = await API.get('/PayrollReport', { params })
        if (res && res.data) {
          setData(res.data)
        } else {
          setData([])
        }
      } catch (err) {
        console.error('Error fetching payroll report:', err)
        toast.error('Failed to load payroll report data')
        setData([])
      } finally {
        setLoading(false)
      }
    },
    [category, fromDate, toDate, selectedEmpId, selectedSkillCat, selectedVendor],
  )

  // On mount & category switch: load options and initial report
  useEffect(() => {
    fetchFilterOptions(category)
    fetchReportData({ category })
  }, [category])

  /* ========================================================================= */
  /* ACTIONS: SEARCH & CLEAR                                                   */
  /* ========================================================================= */
  const handleSearch = () => {
    fetchReportData()
  }

  const handleClear = () => {
    setFromDate('')
    setToDate('')
    setSelectedEmpId('')
    setSelectedSkillCat('')
    setSelectedVendor('')
    setSearchFilter('')

    fetchReportData({
      fromDate: undefined,
      toDate: undefined,
      empId: undefined,
      skillCat: undefined,
      vendor: undefined,
    })
  }

  /* ========================================================================= */
  /* FILTERED ROWS & SUMMARY STATS (4 KPI CARDS)                               */
  /* ========================================================================= */
  const filteredRows = useMemo(() => {
    if (!searchFilter.trim()) return data

    const q = searchFilter.toLowerCase().trim()
    return data.filter((row) => {
      return (
        (row.employeeId && row.employeeId.toLowerCase().includes(q)) ||
        (row.employeeName && row.employeeName.toLowerCase().includes(q)) ||
        (row.vendor && row.vendor.toLowerCase().includes(q)) ||
        (row.skillCategory && row.skillCategory.toLowerCase().includes(q)) ||
        (row.approverStatus && row.approverStatus.toLowerCase().includes(q)) ||
        (row.transactionId && row.transactionId.toLowerCase().includes(q)) ||
        (row.version && row.version.toLowerCase().includes(q)) ||
        (row.designation && row.designation.toLowerCase().includes(q))
      )
    })
  }, [data, searchFilter])

  const stats = useMemo(() => {
    let count = filteredRows.length
    let totalGross = 0
    let totalDeductions = 0
    let totalProvisions = 0
    let totalNet = 0

    filteredRows.forEach((r) => {
      const g = category === 'NAPS' ? r.napsGross || r.gross || 0 : r.gross || 0
      const d = r.totalDeductions || r.totalDed || 0
      const p =
        Number(r.variableTotal) > 0
          ? Number(r.variableTotal)
          : (Number(r.refBon) || 0) +
            (Number(r.splAllw) || 0) +
            (Number(r.kaizen) || 0) +
            (Number(r.gpaGmc) || 0)
      const n = r.netPayable || 0

      totalGross += Number(g) || 0
      totalDeductions += Number(d) || 0
      totalProvisions += Number(p) || 0
      totalNet += Number(n) || 0
    })

    return {
      count,
      totalGross,
      totalDeductions,
      totalProvisions,
      totalNet,
    }
  }, [filteredRows, category])

  /* ========================================================================= */
  /* EXPORT TO EXCEL (FULL STRUCTURE: EARNINGS, DEDUCTIONS, VARIABLES, NET)     */
  /* ========================================================================= */
  const handleExportExcel = () => {
    if (!filteredRows || filteredRows.length === 0) {
      toast.warning('No data available to export!')
      return
    }

    try {
      const exportList = filteredRows.map((r, index) => {
        const base = {
          'S.No': index + 1,
          'Employee ID': r.employeeId || '',
          'Employee Name': r.employeeName || '',
          Category: r.categoryCode || category,
          'Skill Category': r.skillCategory || '',
          Vendor: r.vendor || '',
          Designation: r.designation || '',
          'DOJ': fmtDate(r.dateOfJoining),
          'From Date': fmtDate(r.fromDate),
          'To Date': fmtDate(r.toDate),
          'Total Days (TWD)': Number(r.twd ?? r.periodDays ?? 0),
          'Worked Days': r.workedDays || 0,
        }

        if (category === 'CL') {
          return {
            ...base,
            // Earnings
            'Pay Days Full': r.payDaysFull || 0,
            'Pay Days Half': r.payDaysHalf || 0,
            'Attendance Bonus': r.attnBonus || 0,
            'Earned Basic + DA': r.earnedBasicDa || 0,
            'Earned HRA': r.earnedHra || 0,
            'OT Hours': r.otHrs || 0,
            'OT Amount': r.otAmount || 0,
            EPF: r.epf || 0,
            ESI: r.esi || 0,
            Bonus: r.bonusDed || 0,
            'Service Charge': r.serChar || 0,
            LWF: r.lwf || 0,
            'Gross Salary': r.gross || 0,

            // Deductions
            'Hostel Deduction': r.hostelDed || 0,
            'PF Deduction': r.pfDed || 0,
            'ESI Deduction': r.esiDed || 0,
            'Total Deductions': r.totalDeductions || r.totalDed || 0,

            // Variables / Provisions
            'Referral Bonus': r.refBon || 0,
            'Special Allowance': r.splAllw || 0,
            Kaizen: r.kaizen || 0,
            'GPA / GMC': r.gpaGmc || 0,
            'Variable Total': r.variableTotal || 0,

            // Net Payable & Status Audit Trail
            'Net Payable': r.netPayable || 0,
            'Checker Status': getStatusMeta(r.checkerStatus).label,
            'Checker On': fmtDateTime(r.checkerOn),
            'Approved Status': getStatusMeta(r.approverStatus).label,
            'Approved On': fmtDateTime(r.approverOn),
            'Transaction ID - Version': r.transactionId
              ? `${r.transactionId}${r.version ? ` - ${r.version}` : ''}`
              : '',
          }
        } else {
          // NAPS
          return {
            ...base,
            // Earnings
            'Pay Days Full': r.payDaysFull || 0,
            'Pay Days Half': r.payDaysHalf || 0,
            'Attendance Bonus': r.attnBonus || 0,
            'Earned Wages': r.earnedWages || 0,
            'OT Hours': r.otHrs || 0,
            'OT Earning': r.otEarning || 0,
            'Handling Charge': r.handlingCharge || 0,
            Gross: r.napsGross || r.gross || 0,

            // Deductions
            'Hostel Deduction': r.hostelDed || 0,
            'Total Deductions': r.totalDeductions || r.hostelDed || 0,

            // Variables / Provisions
            'Referral Bonus': r.refBon || 0,
            'Special Allowance': r.splAllw || 0,
            Kaizen: r.kaizen || 0,
            'GPA / GMC': r.gpaGmc || 0,
            'Variable Total': r.variableTotal || 0,

            // Net Payable & Status Audit Trail
            'Net Payable': r.netPayable || 0,
            'Checker Status': getStatusMeta(r.checkerStatus).label,
            'Checker On': fmtDateTime(r.checkerOn),
            'Approved Status': getStatusMeta(r.approverStatus).label,
            'Approved On': fmtDateTime(r.approverOn),
            'Transaction ID - Version': r.transactionId
              ? `${r.transactionId}${r.version ? ` - ${r.version}` : ''}`
              : '',
          }
        }
      })

      const ws = XLSX.utils.json_to_sheet(exportList)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, `${category}_Payroll_Report`)

      const filename = `Payroll_Report_${category}_${fromDate || 'All'}_${toDate || 'All'}.xlsx`
      XLSX.writeFile(wb, filename)
      toast.success('Payroll Report exported to Excel successfully!')
    } catch (err) {
      console.error('Excel Export Error:', err)
      toast.error('Failed to export Excel file')
    }
  }

  /* ========================================================================= */
  /* GROUP HEADER & COLUMN CONFIGURATION (MATCHING MAKER UI)                   */
  /* ========================================================================= */
  const { columns, groupDefs, totalGridWidth } = useMemo(() => {
    // 1. Employee Details Section
    const empCols = [
      {
        name: 'S.No',
        selector: (row, i) => i + 1,
        width: '55px',
        center: true,
      },
      {
        name: 'Emp ID',
        selector: (row) => row.employeeId || '-',
        sortable: true,
        width: '115px',
        cell: (row) => <span className="fw-semibold text-primary">{row.employeeId}</span>,
      },
      {
        name: 'Employee Name',
        selector: (row) => row.employeeName || '-',
        sortable: true,
        width: '160px',
        cell: (row) => (
          <span className="fw-semibold text-truncate" title={row.employeeName}>
            {row.employeeName}
          </span>
        ),
      },
      {
        name: 'Skill Cat',
        selector: (row) => row.skillCategory || '-',
        sortable: true,
        width: '120px',
        center: true,
        cell: (row) => {
          const sc = row.skillCategory
          if (!sc || sc === '-') return <span style={{ color: '#9ca3af' }}>-</span>
          const key = sc.toString().trim().toLowerCase()
          const col = SKILL_COLORS[key] || { bg: '#f3f4f6', color: '#4b5563' }
          return (
            <span
              style={{
                background: col.bg,
                color: col.color,
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '10.5px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {sc}
            </span>
          )
        },
      },
      {
        name: 'Vendor',
        selector: (row) => row.vendor || '-',
        sortable: true,
        width: '120px',
      },
      {
        name: 'Designation',
        selector: (row) => row.designation || '-',
        sortable: true,
        width: '120px',
      },
      {
        name: 'DOJ',
        selector: (row) => row.dateOfJoining,
        sortable: true,
        width: '95px',
        center: true,
        cell: (row) => fmtDate(row.dateOfJoining),
      },
      {
        name: 'Period',
        selector: (row) => row.fromDate,
        sortable: true,
        width: '165px',
        center: true,
        cell: (row) => (
          <span className="text-secondary small">
            {fmtDate(row.fromDate)} – {fmtDate(row.toDate)}
          </span>
        ),
      },
      {
        name: 'Total Days (TWD)',
        selector: (row) => Number(row.twd ?? row.periodDays ?? 0),
        sortable: true,
        width: '110px',
        center: true,
        cell: (row) => (
          <span className="fw-semibold text-secondary">{fmtDays(row.twd ?? row.periodDays)}</span>
        ),
      },
      {
        name: 'Worked Days',
        selector: (row) => row.workedDays || 0,
        sortable: true,
        width: '90px',
        right: true,
        cell: (row) => (
          <span className="fw-semibold text-dark">{fmtDays(row.workedDays)}</span>
        ),
      },
    ]

    // 2. Earnings Section
    let earnCols = []
    if (category === 'CL') {
      earnCols = [
        {
          name: 'Pay Full',
          selector: (row) => row.payDaysFull || 0,
          sortable: true,
          width: '90px',
          right: true,
        },
        {
          name: 'Pay Half',
          selector: (row) => row.payDaysHalf || 0,
          sortable: true,
          width: '90px',
          right: true,
        },
        {
          name: 'Attn Bonus',
          selector: (row) => row.attnBonus || 0,
          sortable: true,
          width: '95px',
          right: true,
          cell: (row) => fmtNumber(row.attnBonus),
        },
        {
          name: 'Basic+DA',
          selector: (row) => row.earnedBasicDa || 0,
          sortable: true,
          width: '120px',
          right: true,
          cell: (row) => fmtNumber(row.earnedBasicDa),
        },
        {
          name: 'Earned HRA',
          selector: (row) => row.earnedHra || 0,
          sortable: true,
          width: '100px',
          right: true,
          cell: (row) => fmtNumber(row.earnedHra),
        },
        {
          name: 'OT Hrs',
          selector: (row) => row.otHrs || 0,
          sortable: true,
          width: '70px',
          right: true,
        },
        {
          name: 'OT Amount',
          selector: (row) => row.otAmount || 0,
          sortable: true,
          width: '95px',
          right: true,
          cell: (row) => fmtNumber(row.otAmount),
        },
        {
          name: 'EPF',
          selector: (row) => row.epf || 0,
          sortable: true,
          width: '85px',
          right: true,
          cell: (row) => fmtNumber(row.epf),
        },
        {
          name: 'ESI',
          selector: (row) => row.esi || 0,
          sortable: true,
          width: '85px',
          right: true,
          cell: (row) => fmtNumber(row.esi),
        },
        {
          name: 'Bonus',
          selector: (row) => row.bonusDed || 0,
          sortable: true,
          width: '85px',
          right: true,
          cell: (row) => fmtNumber(row.bonusDed),
        },
        {
          name: 'Ser/Char',
          selector: (row) => row.serChar || 0,
          sortable: true,
          width: '85px',
          right: true,
          cell: (row) => fmtNumber(row.serChar),
        },
        {
          name: 'LWF',
          selector: (row) => row.lwf || 0,
          sortable: true,
          width: '75px',
          right: true,
          cell: (row) => fmtNumber(row.lwf),
        },
        {
          name: 'Gross',
          selector: (row) => row.gross || 0,
          sortable: true,
          width: '110px',
          right: true,
          cell: (row) => (
            <span className="fw-bold text-success">{fmtNumber(row.gross)}</span>
          ),
        },
      ]
    } else {
      // NAPS Earnings
      earnCols = [
        {
          name: 'Pay Full',
          selector: (row) => row.payDaysFull || 0,
          sortable: true,
          width: '90px',
          right: true,
        },
        {
          name: 'Pay Half',
          selector: (row) => row.payDaysHalf || 0,
          sortable: true,
          width: '90px',
          right: true,
        },
        {
          name: 'Attn Bonus',
          selector: (row) => row.attnBonus || 0,
          sortable: true,
          width: '100px',
          right: true,
          cell: (row) => fmtNumber(row.attnBonus),
        },
        {
          name: 'Earned Wages',
          selector: (row) => row.earnedWages || 0,
          sortable: true,
          width: '120px',
          right: true,
          cell: (row) => fmtNumber(row.earnedWages),
        },
        {
          name: 'OT Hrs',
          selector: (row) => row.otHrs || 0,
          sortable: true,
          width: '75px',
          right: true,
        },
        {
          name: 'OT Earning',
          selector: (row) => row.otEarning || 0,
          sortable: true,
          width: '105px',
          right: true,
          cell: (row) => fmtNumber(row.otEarning),
        },
        {
          name: 'Handling Chg',
          selector: (row) => row.handlingCharge || 0,
          sortable: true,
          width: '110px',
          right: true,
          cell: (row) => fmtNumber(row.handlingCharge),
        },
        {
          name: 'Gross',
          selector: (row) => row.napsGross || row.gross || 0,
          sortable: true,
          width: '110px',
          right: true,
          cell: (row) => (
            <span className="fw-bold text-success">
              {fmtNumber(row.napsGross || row.gross)}
            </span>
          ),
        },
      ]
    }

    // 3. Deductions Section
    let dedCols = []
    if (category === 'CL') {
      dedCols = [
        {
          name: 'Hostel Ded',
          selector: (row) => row.hostelDed || 0,
          sortable: true,
          width: '95px',
          right: true,
          cell: (row) => fmtNumber(row.hostelDed),
        },
        {
          name: 'PF Ded',
          selector: (row) => row.pfDed || 0,
          sortable: true,
          width: '85px',
          right: true,
          cell: (row) => fmtNumber(row.pfDed),
        },
        {
          name: 'ESI Ded',
          selector: (row) => row.esiDed || 0,
          sortable: true,
          width: '85px',
          right: true,
          cell: (row) => fmtNumber(row.esiDed),
        },
        {
          name: 'Total Ded',
          selector: (row) => row.totalDeductions || row.totalDed || 0,
          sortable: true,
          width: '105px',
          right: true,
          cell: (row) => (
            <span className="text-danger fw-bold">
              {fmtNumber(row.totalDeductions || row.totalDed)}
            </span>
          ),
        },
      ]
    } else {
      // NAPS Deductions
      dedCols = [
        {
          name: 'Hostel Ded',
          selector: (row) => row.hostelDed || 0,
          sortable: true,
          width: '110px',
          right: true,
          cell: (row) => fmtNumber(row.hostelDed),
        },
        {
          name: 'Total Ded',
          selector: (row) => row.totalDeductions || row.hostelDed || 0,
          sortable: true,
          width: '110px',
          right: true,
          cell: (row) => (
            <span className="text-danger fw-bold">
              {fmtNumber(row.totalDeductions || row.hostelDed)}
            </span>
          ),
        },
      ]
    }

    // 4. Variables / Provisions Section
    const provCols = [
      {
        name: 'Ref Bonus',
        selector: (row) => row.refBon || 0,
        sortable: true,
        width: '90px',
        right: true,
        cell: (row) => fmtNumber(row.refBon),
      },
      {
        name: 'Spl Allow',
        selector: (row) => row.splAllw || 0,
        sortable: true,
        width: '90px',
        right: true,
        cell: (row) => fmtNumber(row.splAllw),
      },
      {
        name: 'Kaizen',
        selector: (row) => row.kaizen || 0,
        sortable: true,
        width: '85px',
        right: true,
        cell: (row) => fmtNumber(row.kaizen),
      },
      {
        name: 'GPA & GMC',
        selector: (row) => row.gpaGmc || 0,
        sortable: true,
        width: '90px',
        right: true,
        cell: (row) => fmtNumber(row.gpaGmc),
      },
      {
        name: 'Var. Total',
        selector: (row) => row.variableTotal || 0,
        sortable: true,
        width: '105px',
        right: true,
        cell: (row) => (
          <span className="fw-semibold text-primary">
            {fmtNumber(row.variableTotal)}
          </span>
        ),
      },
    ]

    // 5. Net Payable & Approver Details (At the end)
    const netCols = [
      {
        name: 'Take Home Salary',
        selector: (row) => row.netPayable || 0,
        sortable: true,
        width: '135px',
        right: true,
        cell: (row) => (
          <span className="fw-bold" style={{ fontSize: '13.5px', color: '#6b4fa1' }}>
            {money(row.netPayable)}
          </span>
        ),
      },
      {
        name: 'Checker Status',
        selector: (row) => row.checkerStatus || '-',
        sortable: true,
        width: '130px',
        center: true,
        cell: (row) => renderStatusBadge(row.checkerStatus),
      },
      {
        name: 'Checker On',
        selector: (row) => row.checkerOn || '',
        sortable: true,
        width: '145px',
        center: true,
        cell: (row) => (
          <span className="text-secondary small fw-medium" title={row.checkerOn}>
            {fmtDateTime(row.checkerOn)}
          </span>
        ),
      },
      {
        name: 'Approved Status',
        selector: (row) => row.approverStatus || '-',
        sortable: true,
        width: '130px',
        center: true,
        cell: (row) => renderStatusBadge(row.approverStatus),
      },
      {
        name: 'Approved On',
        selector: (row) => row.approverOn || '',
        sortable: true,
        width: '145px',
        center: true,
        cell: (row) => (
          <span className="text-secondary small fw-medium" title={row.approverOn}>
            {fmtDateTime(row.approverOn)}
          </span>
        ),
      },
      {
        name: 'Transaction ID - Version',
        selector: (row) =>
          row.transactionId
            ? `${row.transactionId}${row.version ? ` - ${row.version}` : ''}`
            : '-',
        sortable: true,
        width: '180px',
        cell: (row) => {
          const displayVal = row.transactionId
            ? `${row.transactionId}${row.version ? ` - ${row.version}` : ''}`
            : '-'
          return (
            <span className="text-secondary small fw-medium" title={displayVal}>
              {displayVal}
            </span>
          )
        },
      },
    ]

    const allColumns = [...empCols, ...earnCols, ...dedCols, ...provCols, ...netCols]

    const sumWidth = (cols) =>
      cols.reduce((acc, col) => acc + parseInt(col.width || '100', 10), 0)

    const defs = [
      {
        key: 'emp',
        label: 'EMPLOYEE DETAILS',
        width: sumWidth(empCols),
        bg: '#ede9fe',
        color: '#5b21b6',
      },
      {
        key: 'earnings',
        label: 'EARNINGS',
        width: sumWidth(earnCols),
        bg: '#15803d',
        color: '#ffffff',
      },
      {
        key: 'deductions',
        label: 'DEDUCTIONS',
        width: sumWidth(dedCols),
        bg: '#d97706',
        color: '#ffffff',
      },
      {
        key: 'provisions',
        label: 'VARIABLE / PROVISIONS',
        width: sumWidth(provCols),
        bg: '#b91c1c',
        color: '#ffffff',
      },
      {
        key: 'net',
        label: 'NET PAYABLE & AUDIT TRAIL',
        width: sumWidth(netCols),
        bg: '#1e3a8a',
        color: '#ffffff',
      },
    ]

    const totalW = defs.reduce((acc, d) => acc + d.width, 0)

    return {
      columns: allColumns,
      groupDefs: defs,
      totalGridWidth: totalW,
    }
  }, [category])

  return (
    <div className="container-fluid p-3">
      {/* =================================================================== */}
      {/* EMBEDDED STYLES FOR MAKER-LIKE GROUPED HEADER & CARDS               */}
      {/* =================================================================== */}
      <style>{`
        .payroll-group-header {
          display: flex;
          box-sizing: border-box;
        }
        .payroll-group-header .group-cell {
          height: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          border-right: 2px solid #ffffff;
          box-sizing: border-box;
          white-space: nowrap;
          padding: 0 6px;
          flex-shrink: 0;
        }
        .payroll-group-header .group-cell:last-child {
          border-right: none;
        }

        .payroll-frozen-table::-webkit-scrollbar { height: 8px; width: 8px; }
        .payroll-frozen-table::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        .payroll-frozen-table::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        .payroll-frozen-table::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
        .payroll-frozen-table { scrollbar-width: thin; scrollbar-color: #c1c1c1 #f1f1f1; }
      `}</style>


      {/* =================================================================== */}
      {/* TOP FILTER BAR (PERIOD PRESET REMOVED - FROM & TO DATE AS BASE)     */}
      {/* =================================================================== */}
      <CCard className="border-0 shadow-sm mb-3">
        <CCardBody className="p-3">
          {/* Header row: Category Switcher at the start + Filter Criteria title */}
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              {/* Category Switcher: CL & NAPS (Maker Pill style) - STARTING */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#f3f4f6',
                borderRadius: '6px',
                padding: '2px',
                height: '32px',
                minHeight: '32px',
                maxHeight: '32px',
                boxSizing: 'border-box',
                border: '1px solid #e5e7eb',
              }}>
                {[
                  { key: 'CL', label: 'Contract Labour (CL)' },
                  { key: 'NAPS', label: 'NAPS Apprentice' },
                ].map((item) => {
                  const active = category === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        if (category !== item.key) setCategory(item.key)
                      }}
                      style={{
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0 12px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        borderRadius: '4px',
                        background: active ? '#5b21b6' : 'transparent',
                        color: active ? '#ffffff' : '#6b7280',
                        transition: 'background 0.15s, color 0.15s',
                        height: '26px',
                        lineHeight: '26px',
                        boxSizing: 'border-box',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>

              <div className="d-flex align-items-center gap-2 text-muted fw-bold small">
                <FaFilter className="text-primary" /> FILTER CRITERIA
              </div>
            </div>
          </div>

          <div className="row g-2 align-items-end">
            {/* From Date */}
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label text-secondary mb-1" style={{ fontSize: '11px', fontWeight: 600, height: '16px', display: 'block' }}>
                From Date
              </label>
              <div className="input-group input-group-sm" style={{ height: '32px', minHeight: '32px', maxHeight: '32px' }}>
                <span className="input-group-text bg-light text-muted" style={{ height: '32px', minHeight: '32px', maxHeight: '32px', padding: '0 8px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
                  <FaCalendarAlt size={12} />
                </span>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{ height: '32px', minHeight: '32px', maxHeight: '32px', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* To Date */}
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label text-secondary mb-1" style={{ fontSize: '11px', fontWeight: 600, height: '16px', display: 'block' }}>
                To Date
              </label>
              <div className="input-group input-group-sm" style={{ height: '32px', minHeight: '32px', maxHeight: '32px' }}>
                <span className="input-group-text bg-light text-muted" style={{ height: '32px', minHeight: '32px', maxHeight: '32px', padding: '0 8px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
                  <FaCalendarAlt size={12} />
                </span>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{ height: '32px', minHeight: '32px', maxHeight: '32px', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Employee ID | Name Dropdown */}
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label text-secondary mb-1" style={{ fontSize: '11px', fontWeight: 600, height: '16px', display: 'block' }}>
                Employee (ID | Name)
              </label>
              <select
                className="form-select form-select-sm"
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                disabled={optionsLoading}
                style={{ height: '32px', minHeight: '32px', maxHeight: '32px', fontSize: '12px', boxSizing: 'border-box' }}
              >
                <option value="">All Employees</option>
                {filterOptions.employees.map((emp) => (
                  <option key={emp.empId} value={emp.empId}>
                    {emp.empId} - {emp.empName}
                  </option>
                ))}
              </select>
            </div>

            {/* Skill Category Dropdown */}
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label text-secondary mb-1" style={{ fontSize: '11px', fontWeight: 600, height: '16px', display: 'block' }}>
                Skill Category
              </label>
              <select
                className="form-select form-select-sm"
                value={selectedSkillCat}
                onChange={(e) => setSelectedSkillCat(e.target.value)}
                disabled={optionsLoading}
                style={{ height: '32px', minHeight: '32px', maxHeight: '32px', fontSize: '12px', boxSizing: 'border-box' }}
              >
                <option value="">All Categories</option>
                {filterOptions.skillCategories.map((sc, idx) => (
                  <option key={idx} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor Name Dropdown */}
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label text-secondary mb-1" style={{ fontSize: '11px', fontWeight: 600, height: '16px', display: 'block' }}>
                Vendor Name
              </label>
              <select
                className="form-select form-select-sm"
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                disabled={optionsLoading}
                style={{ height: '32px', minHeight: '32px', maxHeight: '32px', fontSize: '12px', boxSizing: 'border-box' }}
              >
                <option value="">All Vendors</option>
                {filterOptions.vendors.map((vn, idx) => (
                  <option key={idx} value={vn}>
                    {vn}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons: Search & Clear */}
            <div className="col-12 col-sm-6 col-md-1 d-flex gap-1" style={{ height: '32px', boxSizing: 'border-box' }}>
              <button
                type="button"
                className="flex-fill d-flex align-items-center justify-content-center gap-1 fw-semibold"
                onClick={handleSearch}
                disabled={loading}
                title="Search report"
                style={{
                  height: '32px',
                  minHeight: '32px',
                  maxHeight: '32px',
                  fontSize: '12px',
                  padding: '0 8px',
                  background: '#5b21b6',
                  color: '#ffffff',
                  border: '1px solid #5b21b6',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.65 : 1,
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                }}
              >
                {loading ? <CSpinner size="sm" /> : <FaSearch size={11} />} Search
              </button>
              <button
                type="button"
                className="d-flex align-items-center justify-content-center"
                onClick={handleClear}
                disabled={loading}
                title="Clear filters"
                style={{
                  height: '32px',
                  minHeight: '32px',
                  maxHeight: '32px',
                  width: '32px',
                  minWidth: '32px',
                  padding: 0,
                  fontSize: '12px',
                  background: '#f8fafc',
                  color: '#64748b',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <FaTimes size={11} />
              </button>
            </div>
          </div>
        </CCardBody>
      </CCard>

      {/* =================================================================== */}
      {/* 5 KPI CARDS: EMPLOYEES, GROSS, DEDUCTIONS, PROVISIONS, NET PAY     */}
      {/* =================================================================== */}
      <div className="row g-2 mb-3">
        {/* Card 1: Total Employees */}
        <div className="col-12 col-sm-6 col-md-4 col-xl">
          <div
            className="card border-0 shadow-sm p-3 rounded-3 h-100"
            style={{ background: '#e9edfd', borderLeft: '4px solid #4e73df' }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="small fw-bold" style={{ color: '#3f4a6b', fontSize: '11px' }}>
                  TOTAL EMPLOYEES
                </span>
                <h4 className="fw-bold mb-0 text-dark mt-1">{stats.count}</h4>
              </div>
              <div
                className="p-2 p-md-3 rounded-circle shadow-sm"
                style={{ background: '#ffffff', color: '#4e73df' }}
              >
                <FaUsers size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Total Gross */}
        <div className="col-12 col-sm-6 col-md-4 col-xl">
          <div
            className="card border-0 shadow-sm p-3 rounded-3 h-100"
            style={{ background: '#dcfce7', borderLeft: '4px solid #15803d' }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="small fw-bold" style={{ color: '#166534', fontSize: '11px' }}>
                  TOTAL GROSS
                </span>
                <h5 className="fw-bold mb-0 text-dark mt-1">{money(stats.totalGross)}</h5>
              </div>
              <div
                className="p-2 p-md-3 rounded-circle shadow-sm"
                style={{ background: '#ffffff', color: '#15803d' }}
              >
                <FaMoneyBillWave size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Total Deductions */}
        <div className="col-12 col-sm-6 col-md-4 col-xl">
          <div
            className="card border-0 shadow-sm p-3 rounded-3 h-100"
            style={{ background: '#fee2e2', borderLeft: '4px solid #dc2626' }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="small fw-bold" style={{ color: '#991b1b', fontSize: '11px' }}>
                  TOTAL DEDUCTIONS
                </span>
                <h5 className="fw-bold mb-0 text-dark mt-1">
                  {money(stats.totalDeductions)}
                </h5>
              </div>
              <div
                className="p-2 p-md-3 rounded-circle shadow-sm"
                style={{ background: '#ffffff', color: '#dc2626' }}
              >
                <FaMinusCircle size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Total Provisions */}
        <div className="col-12 col-sm-6 col-md-4 col-xl">
          <div
            className="card border-0 shadow-sm p-3 rounded-3 h-100"
            style={{ background: '#fef3c7', borderLeft: '4px solid #d97706' }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="small fw-bold" style={{ color: '#92400e', fontSize: '11px' }}>
                  TOTAL PROVISIONS
                </span>
                <h5 className="fw-bold mb-0 text-dark mt-1">
                  {money(stats.totalProvisions)}
                </h5>
              </div>
              <div
                className="p-2 p-md-3 rounded-circle shadow-sm"
                style={{ background: '#ffffff', color: '#d97706' }}
              >
                <FaCoins size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: Total Net Pay */}
        <div className="col-12 col-sm-6 col-md-4 col-xl">
          <div
            className="card border-0 shadow-sm p-3 rounded-3 h-100"
            style={{ background: '#ede9fe', borderLeft: '4px solid #6d28d9' }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="small fw-bold" style={{ color: '#5b21b6', fontSize: '11px' }}>
                  TOTAL NET PAY
                </span>
                <h5 className="fw-bold mb-0 text-dark mt-1">{money(stats.totalNet)}</h5>
              </div>
              <div
                className="p-2 p-md-3 rounded-circle shadow-sm"
                style={{ background: '#ffffff', color: '#6d28d9' }}
              >
                <FaWallet size={20} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* DATA GRID WITH GROUPED HEADER (MAKER STYLE)                         */}
      {/* =================================================================== */}
      <CCard className="border-0 shadow-sm">
        <CCardBody className="p-3">
          {/* Top toolbar directly above the grid: Title, Export Excel, Quick Filter, CL/NAPS Switch */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h5 style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: '#1f2937', letterSpacing: '0.2px' }}>
                PAYROLL REPORT
              </h5>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Showing <b>{filteredRows.length}</b> records for{' '}
                <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '11px' }}>
                  {category}
                </span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              {/* Export Excel Button (Maker style) */}
              <CButton
                size="sm"
                onClick={handleExportExcel}
                disabled={filteredRows.length === 0}
                style={{
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '32px',
                  minHeight: '32px',
                  maxHeight: '32px',
                  padding: '0 12px',
                  fontWeight: 600,
                  fontSize: '12px',
                  boxSizing: 'border-box',
                  cursor: filteredRows.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: filteredRows.length === 0 ? 0.6 : 1,
                }}
              >
                <FaFileExcel size={12} /> Export Excel
              </CButton>

              {/* Quick filter in table */}
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', height: '32px' }}>
                <FaSearch style={{ position: 'absolute', left: '10px', color: '#9ca3af', fontSize: '12px', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Quick filter in table..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{
                    paddingLeft: '30px',
                    paddingRight: searchFilter ? '28px' : '10px',
                    paddingTop: 0,
                    paddingBottom: 0,
                    minWidth: '200px',
                    height: '32px',
                    minHeight: '32px',
                    maxHeight: '32px',
                    fontSize: '12px',
                    lineHeight: '32px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    boxSizing: 'border-box',
                    background: '#fff',
                  }}
                />
                {searchFilter && (
                  <FaTimes
                    onClick={() => setSearchFilter('')}
                    style={{ position: 'absolute', right: '10px', color: '#9ca3af', fontSize: '12px', cursor: 'pointer' }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Horizontally scrollable container keeping Group Header & Columns in sync */}
          <div className="payroll-frozen-table" style={{ overflowX: 'auto', width: '100%' }}>
            <div style={{ minWidth: `${totalGridWidth}px`, width: `${totalGridWidth}px` }}>
              {/* GROUP HEADER ROW (EMPLOYEE DETAILS, EARNINGS, DEDUCTIONS, VARIABLES, NET PAYABLE) */}
              <div className="payroll-group-header" style={{ width: `${totalGridWidth}px`, minWidth: `${totalGridWidth}px` }}>
                {groupDefs.map((g) => (
                  <div
                    key={g.key}
                    className="group-cell"
                    style={{
                      width: `${g.width}px`,
                      minWidth: `${g.width}px`,
                      maxWidth: `${g.width}px`,
                      background: g.bg,
                      color: g.color,
                    }}
                  >
                    <span>{g.label}</span>
                  </div>
                ))}
              </div>

              {/* DATATABLE */}
              <DataTable
                columns={columns}
                data={filteredRows}
                progressPending={loading}
                progressComponent={
                  <div className="py-5 text-center text-muted">
                    <CSpinner color="primary" />
                    <div className="mt-2 small fw-semibold">Loading Payroll Report...</div>
                  </div>
                }
                noDataComponent={
                  <div className="py-5 text-center text-muted">
                    <FaUsers size={32} className="text-secondary opacity-50 mb-2" />
                    <div className="fw-semibold">
                      No records found matching the filter criteria.
                    </div>
                    <div className="small">
                      Try adjusting From/To dates, employee, skill category, or vendor.
                    </div>
                  </div>
                }
                customStyles={customStyles}
                pagination
                paginationPerPage={25}
                paginationRowsPerPageOptions={[10, 25, 50, 100, 200]}
                paginationComponentOptions={paginationOptions}
                highlightOnHover
                dense
                responsive={false}
              />
            </div>
          </div>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default Report
