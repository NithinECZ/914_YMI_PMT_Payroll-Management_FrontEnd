import React, { useEffect, useState, useRef, useMemo } from 'react'
import {
  CButton,
  CFormInput,
  CFormSelect,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'

import {
  FaEdit,
  FaTrash,
  FaDownload,
  FaUpload,
  FaPlus,
  FaArrowLeft,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa'

import { toast } from 'react-toastify'
import API from '../../api.js'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import '../../assets/CSS/user.css'

// ============================================================
// HOLIDAY TYPES
// ============================================================
const HOLIDAY_TYPES = [
  'Public Holiday',
  'Weekly Off',
  'Production Maintenance Leave',
]

const MAINTENANCE_TYPE = 'Production Maintenance Leave'

const HOLIDAY_TYPE_COLORS = {
  'Public Holiday': '#dcfce7',
  'Weekly Off': '#bfdbfe',
  'Production Maintenance Leave': '#fce7f3',
}

const HOLIDAY_TYPE_ICONS = {
  'Public Holiday': { bg: '#10b981', icon: '🌴', label: 'Public Holidays' },
  'Weekly Off': { bg: '#3b82f6', icon: '⏰', label: 'Weekly Offs' },
  'Production Maintenance Leave': { bg: '#a855f7', icon: '📋', label: 'Maintenance Leave' },
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const normalizeHolidayType = (type) => {
  if (!type) return type
  const t = String(type).trim()
  if (t === 'National Holiday' || t === 'Public Holiday') return 'Public Holiday'
  return t
}

const getLoggedInUser = () => {
  try {
    const raw = sessionStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const toDateInputValue = (day, month, year) => {
  if (!day || !month || !year) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const parseDateInputValue = (value) => {
  const [y, m, d] = value.split('-').map((n) => parseInt(n, 10))
  return { day: d, month: m, year: y }
}

const getMonthYearPairsInRange = (fromValue, toValue) => {
  const { month: fm, year: fy } = parseDateInputValue(fromValue)
  const { month: tm, year: ty } = parseDateInputValue(toValue)
  const pairs = []
  const seen = new Set()
  let cur = new Date(fy, fm - 1, 1)
  const end = new Date(ty, tm - 1, 1)
  while (cur <= end) {
    const key = `${cur.getFullYear()}-${cur.getMonth() + 1}`
    if (!seen.has(key)) {
      seen.add(key)
      pairs.push({ m: cur.getMonth() + 1, y: cur.getFullYear() })
    }
    cur.setMonth(cur.getMonth() + 1)
  }
  return pairs
}

const fetchHolidaysForMonths = async (pairs) => {
  const results = await Promise.all(
    pairs.map(({ m, y }) =>
      API.get(`/CalendarMaster?month=${m}&year=${y}`)
        .then((res) =>
          (res.data || []).map((h) => ({
            ...h,
            holidayType: normalizeHolidayType(h.holidayType),
          }))
        )
        .catch(() => [])
    )
  )
  return results.flat()
}

const CalendarMaster = () => {
  const fileInputRef = useRef()

  const [currentDate, setCurrentDate] = useState(new Date())

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  const [holidays, setHolidays] = useState([])

  const [form, setForm] = useState({
    holidayType: '',
    holidayName: '',
    date: '',
    fromDate: '',
    toDate: '',
  })

  const [errors, setErrors] = useState({
    holidayType: '',
    holidayName: '',
    date: '',
    fromDate: '',
    toDate: '',
  })

  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const [deleteId, setDeleteId] = useState(null)
  const [deleteHoliday, setDeleteHoliday] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [viewMode, setViewMode] = useState('month')

  const isMaintenance = form.holidayType === MAINTENANCE_TYPE
  // Range only for NEW Maintenance Leave — Edit is always single day
  const useRangeMode = isMaintenance && !editId

  const loadHolidaysForMonthYear = async (m = month, y = year) => {
    try {
      const res = await API.get(`/CalendarMaster?month=${m}&year=${y}`)
      const normalized = (res.data || []).map((h) => ({
        ...h,
        holidayType: normalizeHolidayType(h.holidayType),
      }))
      setHolidays(normalized)
    } catch {
      toast.error('Failed to load holidays')
    }
  }

  useEffect(() => {
    loadHolidaysForMonthYear(month, year)
  }, [month, year])

  const getDaysInMonth = (m = month, y = year) => new Date(y, m, 0).getDate()
  const getFirstDayOfMonth = () => new Date(year, month - 1, 1).getDay()

  // Full calendar grid: prev + current + next month days
  const calendarCells = useMemo(() => {
    const firstDay = getFirstDayOfMonth()
    const daysInMonth = getDaysInMonth()
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear)
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year

    const cells = []

    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
      })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, month, year, isCurrentMonth: true })
    }

    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        day: d,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
      })
    }

    return cells
  }, [month, year])

  const handlePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate((prev) => {
        const d = new Date(prev)
        d.setDate(d.getDate() - 7)
        return d
      })
    } else {
      setCurrentDate(new Date(year, month - 2, 1))
    }
  }

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate((prev) => {
        const d = new Date(prev)
        d.setDate(d.getDate() + 7)
        return d
      })
    } else {
      setCurrentDate(new Date(year, month, 1))
    }
  }

  const handleWeekClick = () => {
    setViewMode('week')
    setCurrentDate(new Date())
  }

  const clearError = (name) => setErrors((prev) => ({ ...prev, [name]: '' }))

  const handleChange = (e) => {
    const { name, value } = e.target
    let v = value
    if (name === 'holidayName') v = v.toUpperCase()
    setForm((prev) => ({ ...prev, [name]: v }))
    clearError(name)
  }

  const validate = () => {
    const temp = {
      holidayType: '',
      holidayName: '',
      date: '',
      fromDate: '',
      toDate: '',
    }

    if (!form.holidayType) temp.holidayType = 'Leave Type is required'
    if (!form.holidayName.trim()) temp.holidayName = 'Leave Name is required'

    if (useRangeMode) {
      if (!form.fromDate) temp.fromDate = 'From Date is required'
      if (!form.toDate) temp.toDate = 'To Date is required'
      if (form.fromDate && form.toDate && form.toDate < form.fromDate) {
        temp.toDate = 'To Date cannot be before From Date'
      }
    } else {
      if (!form.date) temp.date = 'Date is required'
    }

    setErrors(temp)
    return !Object.values(temp).some((x) => x)
  }

  const checkDuplicateDay = async (mm, yy, dayNum, excludeId) => {
    try {
      const res = await API.get(`/CalendarMaster?month=${mm}&year=${yy}`)
      const list = res.data || []
      return list.some((h) => Number(h.day) === dayNum && h.id !== excludeId)
    } catch {
      return false
    }
  }

  const handleSubmit = async () => {
    if (!validate()) return

    const loggedInUser = getLoggedInUser()
    const normType = normalizeHolidayType(form.holidayType)

    try {
      // ---------- EDIT — always single day ----------
      if (editId) {
        const { day: dayNum, month: mm, year: yy } = parseDateInputValue(form.date)

        const dup = await checkDuplicateDay(mm, yy, dayNum, editId)
        if (dup) {
          setErrors((p) => ({ ...p, date: 'Holiday already exists for this day' }))
          return
        }

        const payload = {
          month: mm,
          year: yy,
          day: dayNum,
          holidayName: form.holidayName.trim(),
          holidayType: normType,
          modifiedBy: loggedInUser?.userName || 'SYSTEM',
        }

        await API.put(`/CalendarMaster/${editId}`, payload)
        toast.success('Holiday Updated Successfully')
        setCurrentDate(new Date(yy, mm - 1, 1))
        await loadHolidaysForMonthYear(mm, yy)
        resetForm()
        return
      }

      // ---------- NEW + Maintenance Leave => From→To bulk range ----------
      if (useRangeMode) {
        const { year: fy, month: fm, day: fd } = parseDateInputValue(form.fromDate)
        const { year: ty, month: tm, day: td } = parseDateInputValue(form.toDate)
        const from = new Date(fy, fm - 1, fd)
        const to = new Date(ty, tm - 1, td)

        const pairs = getMonthYearPairsInRange(form.fromDate, form.toDate)
        const existing = await fetchHolidaysForMonths(pairs)
        const existingKey = new Set(
          existing.map((h) => `${h.year}-${h.month}-${h.day}`)
        )

        const daysList = []
        const cur = new Date(from)
        while (cur <= to) {
          const dd = cur.getDate()
          const mm = cur.getMonth() + 1
          const yy = cur.getFullYear()
          const key = `${yy}-${mm}-${dd}`
          if (existingKey.has(key)) {
            toast.error(`Holiday already exists on ${dd}/${mm}/${yy}`)
            return
          }
          daysList.push({ day: dd, month: mm, year: yy })
          cur.setDate(cur.getDate() + 1)
        }

        const groups = {}
        daysList.forEach(({ day, month: mm, year: yy }) => {
          const k = `${yy}-${mm}`
          if (!groups[k]) groups[k] = { month: mm, year: yy, holidays: [] }
          groups[k].holidays.push({
            month: mm,
            year: yy,
            day,
            holidayName: form.holidayName.trim(),
            holidayType: normType,
          })
        })

        for (const key of Object.keys(groups)) {
          const g = groups[key]
          await API.post('/CalendarMaster/bulk', {
            month: g.month,
            year: g.year,
            holidays: g.holidays,
            modifiedBy: loggedInUser?.userName || 'SYSTEM',
          })
        }

        toast.success(`${daysList.length} day(s) added successfully`)
        setCurrentDate(new Date(fy, fm - 1, 1))
        await loadHolidaysForMonthYear(fm, fy)
        resetForm()
        return
      }

      // ---------- NEW + Public / Weekly Off => single day ----------
      const { day: dayNum, month: mm, year: yy } = parseDateInputValue(form.date)

      const dup = await checkDuplicateDay(mm, yy, dayNum, null)
      if (dup) {
        setErrors((p) => ({ ...p, date: 'Holiday already exists for this day' }))
        return
      }

      const payload = {
        month: mm,
        year: yy,
        day: dayNum,
        holidayName: form.holidayName.trim(),
        holidayType: normType,
        modifiedBy: loggedInUser?.userName || 'SYSTEM',
      }

      await API.post('/CalendarMaster', payload)
      toast.success('Holiday Added Successfully')
      setCurrentDate(new Date(yy, mm - 1, 1))
      await loadHolidaysForMonthYear(mm, yy)
      resetForm()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save Failed')
    }
  }

  // Edit always single date (even for Maintenance)
  const handleEdit = (holidayObj) => {
    setEditId(holidayObj.id)
    setForm({
      holidayType: normalizeHolidayType(holidayObj.holidayType) || '',
      holidayName: holidayObj.holidayName || '',
      date: toDateInputValue(holidayObj.day, holidayObj.month, holidayObj.year),
      fromDate: '',
      toDate: '',
    })
    setErrors({
      holidayType: '',
      holidayName: '',
      date: '',
      fromDate: '',
      toDate: '',
    })
    setShowForm(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await API.delete(`/CalendarMaster/${deleteId}`)
      toast.success('Deleted Successfully')
      await loadHolidaysForMonthYear(month, year)
    } catch {
      toast.error('Delete Failed')
    } finally {
      setShowDeleteModal(false)
      setDeleteId(null)
      setDeleteHoliday(null)
    }
  }

  const resetForm = () => {
    setForm({
      holidayType: '',
      holidayName: '',
      date: '',
      fromDate: '',
      toDate: '',
    })
    setErrors({
      holidayType: '',
      holidayName: '',
      date: '',
      fromDate: '',
      toDate: '',
    })
    setEditId(null)
    setShowForm(false)
  }

  // ==========================================================
  // EXPORT (ExcelJS) — Holiday Type column has real dropdown
  // templateOnly = blank template
  // ==========================================================
  const exportToExcel = async (mArg, yArg, templateOnly = false) => {
    const m = mArg || month
    const y = yArg || year

    try {
      let list = []
      if (!templateOnly) {
        const res = await API.get(`/CalendarMaster?month=${m}&year=${y}`)
        list = (res.data || []).map((h) => ({
          ...h,
          holidayType: normalizeHolidayType(h.holidayType),
        }))
      }

      const daysInMonth = new Date(y, m, 0).getDate()
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet(`${MONTHS[m - 1]} ${y}`)

      // Header row
      sheet.addRow(['Date', 'Holiday Name', 'Holiday Type'])
      sheet.getRow(1).font = { bold: true }
      sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

      // Data rows
      for (let i = 1; i <= daysInMonth; i++) {
        const holiday = !templateOnly
          ? list.find((h) => Number(h.day) === i)
          : null
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        if (holiday) {
          sheet.addRow([dateStr, holiday.holidayName, holiday.holidayType])
        } else {
          sheet.addRow([dateStr, '', ''])
        }
      }

      // Column widths
      sheet.getColumn(1).width = 14
      sheet.getColumn(2).width = 30
      sheet.getColumn(3).width = 35

      // ========== DROPDOWN for Holiday Type (Column C) ==========
      // Applies to all data rows (row 2 → daysInMonth+1)
      for (let row = 2; row <= daysInMonth + 1; row++) {
        sheet.getCell(`C${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [
            `"${HOLIDAY_TYPES.join(',')}"`,
          ],
          showErrorMessage: true,
          errorTitle: 'Invalid Holiday Type',
          error: `Please select one of: ${HOLIDAY_TYPES.join(', ')}`,
          promptTitle: 'Holiday Type',
          prompt: 'Select Holiday Type from the list',
          showInputMessage: true,
        }
      }

      // Download file
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = templateOnly
        ? `Calendar_Template_${MONTHS[m - 1]}_${y}.xlsx`
        : `Calendar_${MONTHS[m - 1]}_${y}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success(
        templateOnly
          ? 'Template downloaded successfully'
          : 'Excel downloaded successfully'
      )
    } catch (err) {
      console.error(err)
      toast.error('Failed to prepare Excel')
    }
  }

  // ==========================================================
  // IMPORT — any month based on Date column (not locked to current view)
  // ==========================================================
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      if (jsonData.length < 2) {
        toast.error('Excel file is empty')
        setUploading(false)
        return
      }

      // Parse all rows → group by year-month
      const groups = {} // key: "YYYY-M" → { month, year, holidays: [] }
      const seenGlobal = new Set() // "YYYY-M-D"

      for (let i = 1; i < jsonData.length; i++) {
        const [dateVal, name, type] = jsonData[i]

        // Skip fully empty rows
        if (
          (dateVal === undefined || dateVal === null || dateVal === '') &&
          (name === undefined || name === null || name === '') &&
          (type === undefined || type === null || type === '')
        ) {
          continue
        }

        // Skip rows with date but empty name+type (blank template rows)
        if (
          (!name || String(name).trim() === '') &&
          (!type || String(type).trim() === '')
        ) {
          continue
        }

        if (!dateVal || !name || !type) {
          toast.error(
            `Row ${i + 1}: Missing Date, Holiday Name, or Holiday Type`
          )
          setUploading(false)
          return
        }

        // Parse date — any month/year allowed
        let dayNum, mm, yy
        const dateStr = String(dateVal).trim()

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const parsed = parseDateInputValue(dateStr)
          dayNum = parsed.day
          mm = parsed.month
          yy = parsed.year
        } else if (typeof dateVal === 'number') {
          // Excel serial date
          const excelEpoch = new Date(Date.UTC(1899, 11, 30))
          const d = new Date(excelEpoch.getTime() + dateVal * 86400000)
          dayNum = d.getUTCDate()
          mm = d.getUTCMonth() + 1
          yy = d.getUTCFullYear()
        } else {
          const d = new Date(dateStr)
          if (isNaN(d.getTime())) {
            toast.error(
              `Row ${i + 1}: Invalid Date format (use YYYY-MM-DD)`
            )
            setUploading(false)
            return
          }
          dayNum = d.getDate()
          mm = d.getMonth() + 1
          yy = d.getFullYear()
        }

        if (isNaN(dayNum) || isNaN(mm) || isNaN(yy)) {
          toast.error(`Row ${i + 1}: Invalid Date`)
          setUploading(false)
          return
        }

        const daysInMonth = new Date(yy, mm, 0).getDate()
        if (dayNum < 1 || dayNum > daysInMonth) {
          toast.error(
            `Row ${i + 1}: Day must be between 1 and ${daysInMonth} for ${MONTHS[mm - 1]} ${yy}`
          )
          setUploading(false)
          return
        }

        const globalKey = `${yy}-${mm}-${dayNum}`
        if (seenGlobal.has(globalKey)) {
          toast.error(
            `Row ${i + 1}: Duplicate day ${dayNum}/${mm}/${yy}`
          )
          setUploading(false)
          return
        }
        seenGlobal.add(globalKey)

        const normType = normalizeHolidayType(String(type).trim())
        if (!HOLIDAY_TYPES.includes(normType)) {
          toast.error(
            `Row ${i + 1}: Invalid Holiday Type. Must be one of: ${HOLIDAY_TYPES.join(', ')}`
          )
          setUploading(false)
          return
        }

        const groupKey = `${yy}-${mm}`
        if (!groups[groupKey]) {
          groups[groupKey] = { month: mm, year: yy, holidays: [] }
        }
        groups[groupKey].holidays.push({
          month: mm,
          year: yy,
          day: dayNum,
          holidayName: String(name).trim().toUpperCase(),
          holidayType: normType,
        })
      }

      const groupKeys = Object.keys(groups)
      if (groupKeys.length === 0) {
        toast.error('No valid holidays found in Excel')
        setUploading(false)
        return
      }

      const loggedInUser = getLoggedInUser()
      let totalCount = 0

      for (const key of groupKeys) {
        const g = groups[key]
        await API.post('/CalendarMaster/bulk', {
          month: g.month,
          year: g.year,
          holidays: g.holidays,
          modifiedBy: loggedInUser?.userName || 'SYSTEM',
        })
        totalCount += g.holidays.length
      }

      // Navigate to first month in the upload
      const first = groups[groupKeys[0]]
      toast.success(`${totalCount} holiday(s) imported successfully`)
      setCurrentDate(new Date(first.year, first.month - 1, 1))
      await loadHolidaysForMonthYear(first.month, first.year)
      resetForm()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload Failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const stats = useMemo(() => {
    return {
      totalHolidays: holidays.length,
      publicHolidays: holidays.filter(
        (h) => h.holidayType === 'Public Holiday'
      ).length,
      weeklyOff: holidays.filter((h) => h.holidayType === 'Weekly Off')
        .length,
      maintenanceLeave: holidays.filter(
        (h) => h.holidayType === 'Production Maintenance Leave'
      ).length,
    }
  }, [holidays])

  const weekDays = useMemo(() => {
    const start = new Date(currentDate)
    start.setDate(currentDate.getDate() - currentDate.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [currentDate])

  const isToday = (d) => {
    const t = new Date()
    return (
      d.getDate() === t.getDate() &&
      d.getMonth() === t.getMonth() &&
      d.getFullYear() === t.getFullYear()
    )
  }

  const findHolidayForDate = (d) => {
    if (d.getMonth() + 1 !== month || d.getFullYear() !== year) return null
    return holidays.find((h) => Number(h.day) === d.getDate())
  }

  const weekRangeLabel = () => {
    const start = weekDays[0]
    const end = weekDays[6]
    const opts = { day: 'numeric', month: 'short' }
    const startStr = start.toLocaleDateString('en-GB', opts)
    const endStr = end.toLocaleDateString('en-GB', opts)
    return `${startStr} - ${endStr}, ${end.getFullYear()}`
  }

  return (
    <div className="user-master-page">
      {/* ========== ADD / EDIT FORM ========== */}
      {showForm && (
        <CCard className="user-form-card mb-3">
          <CCardBody>
            <div
              className="section-title"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <span>{editId ? 'EDIT HOLIDAY' : 'ADD HOLIDAY'}</span>
              <FaArrowLeft
                style={{
                  cursor: 'pointer',
                  color: '#6b4fa1',
                  fontSize: '18px',
                }}
                title="Back"
                onClick={resetForm}
              />
            </div>

            {/* Download Template / Upload — Add only */}
            {!editId && (
              <CRow className="g-3 mb-4">
                <CCol md={6}>
                  <label
                    className="custom-label d-block mb-2"
                    style={{ fontSize: '12px', color: '#6b4fa1' }}
                  >
                    Download Template
                  </label>
                  <CButton
                    type="button"
                    onClick={() => exportToExcel(undefined, undefined, true)}
                    style={{
                      width: '100%',
                      height: '54px',
                      background: '#6b4fa1',
                      color: '#fff',
                      padding: '12px 16px',
                      fontSize: '16px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                    }}
                  >
                    <FaDownload size={16} />
                    Download
                  </CButton>
                </CCol>

                <CCol md={6}>
                  <label
                    className="custom-label d-block mb-2"
                    style={{ fontSize: '12px', color: '#16a34a' }}
                  >
                    Upload
                  </label>
                  <CButton
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      width: '100%',
                      height: '54px',
                      background: uploading ? '#9ca3af' : '#16a34a',
                      color: '#fff',
                      padding: '12px 16px',
                      fontSize: '16px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <FaUpload size={16} />
                    {uploading ? 'Uploading...' : 'Upload'}
                  </CButton>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </CCol>
              </CRow>
            )}

            <CRow className="g-3">
              <CCol md={6}>
                <label className="custom-label">
                  Leave Type <span className="required">*</span>
                </label>
                <CFormSelect
                  name="holidayType"
                  value={form.holidayType}
                  onChange={handleChange}
                  className={errors.holidayType ? 'error-input' : ''}
                >
                  <option value="">Select Leave Type</option>
                  {HOLIDAY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </CFormSelect>
                {errors.holidayType && (
                  <small className="text-danger">{errors.holidayType}</small>
                )}
              </CCol>

              <CCol md={6}>
                <label className="custom-label">
                  Leave Name <span className="required">*</span>
                </label>
                <CFormInput
                  name="holidayName"
                  placeholder="e.g., Diwali"
                  value={form.holidayName}
                  className={errors.holidayName ? 'error-input' : ''}
                  onChange={handleChange}
                />
                {errors.holidayName && (
                  <small className="text-danger">{errors.holidayName}</small>
                )}
              </CCol>
            </CRow>

            {/* Range only for NEW Maintenance; Edit always single Date */}
            {useRangeMode ? (
              <CRow className="g-3 mt-1">
                <CCol md={6}>
                  <label className="custom-label">
                    From Date <span className="required">*</span>
                  </label>
                  <CFormInput
                    type="date"
                    name="fromDate"
                    value={form.fromDate}
                    onChange={handleChange}
                    className={errors.fromDate ? 'error-input' : ''}
                  />
                  {errors.fromDate && (
                    <small className="text-danger">{errors.fromDate}</small>
                  )}
                </CCol>
                <CCol md={6}>
                  <label className="custom-label">
                    To Date <span className="required">*</span>
                  </label>
                  <CFormInput
                    type="date"
                    name="toDate"
                    value={form.toDate}
                    onChange={handleChange}
                    className={errors.toDate ? 'error-input' : ''}
                  />
                  {errors.toDate && (
                    <small className="text-danger">{errors.toDate}</small>
                  )}
                </CCol>
              </CRow>
            ) : (
              <CRow className="g-3 mt-1">
                <CCol md={4}>
                  <label className="custom-label">
                    Date <span className="required">*</span>
                  </label>
                  <CFormInput
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    className={errors.date ? 'error-input' : ''}
                  />
                  {errors.date && (
                    <small className="text-danger">{errors.date}</small>
                  )}
                </CCol>
              </CRow>
            )}

            <div
              className="form-button-area"
              style={{
                marginTop: '20px',
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              <CButton
                className={editId ? 'update-btn' : 'save-btn'}
                onClick={handleSubmit}
              >
                {editId ? 'UPDATE' : 'SAVE'}
              </CButton>
              <CButton className="clear-btn" onClick={resetForm}>
                CANCEL
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      )}

      {/* ========== MAIN PAGE ========== */}
      {!showForm && (
        <>
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
            <div
              style={{
                flex: 1,
                minWidth: '160px',
                background: '#e9edfd',
                borderRadius: '10px',
                padding: '14px 16px',
              }}
            >
              <div
                style={{ fontSize: '13px', fontWeight: 600, color: '#3f4a6b' }}
              >
                Total Holidays
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#1f2937',
                  }}
                >
                  {stats.totalHolidays}
                </span>
                <span style={{ fontSize: '20px' }}>📅</span>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minWidth: '160px',
                background: '#dcfce7',
                borderRadius: '10px',
                padding: '14px 16px',
              }}
            >
              <div
                style={{ fontSize: '13px', fontWeight: 600, color: '#3f4a6b' }}
              >
                Public Holidays
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#1f2937',
                  }}
                >
                  {stats.publicHolidays}
                </span>
                <span style={{ fontSize: '20px' }}>🌴</span>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minWidth: '160px',
                background: '#bfdbfe',
                borderRadius: '10px',
                padding: '14px 16px',
              }}
            >
              <div
                style={{ fontSize: '13px', fontWeight: 600, color: '#3f4a6b' }}
              >
                Weekly Off
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#1f2937',
                  }}
                >
                  {stats.weeklyOff}
                </span>
                <span style={{ fontSize: '20px' }}>⏰</span>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minWidth: '160px',
                background: '#fce7f3',
                borderRadius: '10px',
                padding: '14px 16px',
              }}
            >
              <div
                style={{ fontSize: '13px', fontWeight: 600, color: '#3f4a6b' }}
              >
                Maintenance Leave
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#1f2937',
                  }}
                >
                  {stats.maintenanceLeave}
                </span>
                <span style={{ fontSize: '20px' }}>📋</span>
              </div>
            </div>

            <div
              onClick={() => {
                resetForm()
                setShowForm(true)
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#6b4fa1',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  boxShadow: '0 4px 10px rgba(107,79,161,0.25)',
                }}
              >
                <FaPlus />
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6b4fa1',
                  marginTop: '6px',
                  textAlign: 'center',
                }}
              >
                Add
                <br />
                leaves
              </span>
            </div>
          </div>

          <CCard className="mb-3">
            <CCardBody>
              <CRow className="g-3 align-items-center">
                <CCol lg={5} md={12}>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                    }}
                  >
                    <CButton
                      color="secondary"
                      size="sm"
                      onClick={handlePrev}
                      style={{ padding: '6px 10px', minWidth: '36px' }}
                    >
                      <FaChevronLeft size={12} />
                    </CButton>
                    <span
                      style={{
                        minWidth: '160px',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                        color: '#1f2937',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {viewMode === 'week'
                        ? weekRangeLabel()
                        : `${MONTHS[month - 1]} ${year}`}
                    </span>
                    <CButton
                      color="secondary"
                      size="sm"
                      onClick={handleNext}
                      style={{ padding: '6px 10px', minWidth: '36px' }}
                    >
                      <FaChevronRight size={12} />
                    </CButton>
                  </div>
                </CCol>

                <CCol lg={7} md={12}>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                    }}
                  >
                    <CButton
                      size="sm"
                      onClick={() => exportToExcel()}
                      style={{
                        background: '#6b4fa1',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <FaDownload size={12} />
                      Export
                    </CButton>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <CButton
                        size="sm"
                        color={viewMode === 'month' ? 'primary' : 'secondary'}
                        onClick={() => setViewMode('month')}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        Month
                      </CButton>
                      <CButton
                        size="sm"
                        color={viewMode === 'week' ? 'primary' : 'secondary'}
                        onClick={handleWeekClick}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        Week
                      </CButton>
                      <CButton
                        size="sm"
                        color={viewMode === 'list' ? 'primary' : 'secondary'}
                        onClick={() => setViewMode('list')}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        List
                      </CButton>
                    </div>
                  </div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>

          {/* ========== MONTH VIEW ========== */}
          {viewMode === 'month' && (
            <CCard>
              <CCardBody style={{ padding: '24px' }}>
                {/* Legend LEFT + Month title */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '14px',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    {HOLIDAY_TYPES.map((type) => (
                      <div
                        key={type}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            background: HOLIDAY_TYPE_ICONS[type].bg,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {HOLIDAY_TYPE_ICONS[type].icon}
                        </div>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#6b7280',
                          }}
                        >
                          {HOLIDAY_TYPE_ICONS[type].label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <h4
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      color: '#1f2937',
                      fontSize: '18px',
                    }}
                  >
                    {MONTHS[month - 1]} {year}
                  </h4>
                </div>

                <div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}
                >
                  {DAY_NAMES.map((day) => (
                    <div
                      key={day}
                      style={{
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                        padding: '12px 8px',
                        color: '#6b7280',
                        background: '#f3f4f6',
                      }}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '8px',
                    minHeight: '500px',
                    marginTop: '8px',
                  }}
                >
                  {calendarCells.map((cell, idx) => {
                    const holiday = cell.isCurrentMonth
                      ? holidays.find((h) => Number(h.day) === cell.day)
                      : null
                    const bgColor = holiday
                      ? HOLIDAY_TYPE_COLORS[holiday.holidayType] || '#fff'
                      : cell.isCurrentMonth
                        ? '#fff'
                        : '#fafafa'
                    const borderColor = holiday ? '#d1d5db' : '#e5e7eb'
                    const today =
                      cell.isCurrentMonth &&
                      cell.day === new Date().getDate() &&
                      month === new Date().getMonth() + 1 &&
                      year === new Date().getFullYear()

                    return (
                      <div
                        key={idx}
                        style={{
                          minHeight: '120px',
                          background: bgColor,
                          border: today
                            ? '2px solid #6b4fa1'
                            : `1.5px solid ${borderColor}`,
                          borderRadius: '8px',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '16px',
                            fontWeight: cell.isCurrentMonth ? 700 : 500,
                            color: cell.isCurrentMonth
                              ? today
                                ? '#6b4fa1'
                                : '#1f2937'
                              : '#9ca3af',
                            marginBottom: '8px',
                          }}
                        >
                          {cell.day}
                        </div>

                        {holiday && (
                          <>
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 800,
                                color: '#78350f',
                                background: '#fef08a',
                                border: '1px solid #eab308',
                                borderRadius: '5px',
                                padding: '4px 6px',
                                marginBottom: '8px',
                                wordBreak: 'break-word',
                                lineHeight: '1.4',
                              }}
                            >
                              {holiday.holidayName}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                gap: '4px',
                                marginTop: 'auto',
                              }}
                            >
                              <button
                                onClick={() => handleEdit(holiday)}
                                style={{
                                  padding: '6px 8px',
                                  fontSize: '12px',
                                  flex: 1,
                                  background: '#3b82f6',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                <FaEdit
                                  size={12}
                                  style={{ marginRight: '4px' }}
                                />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteId(holiday.id)
                                  setDeleteHoliday(holiday)
                                  setShowDeleteModal(true)
                                }}
                                style={{
                                  padding: '6px 8px',
                                  fontSize: '12px',
                                  flex: 1,
                                  background: '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                <FaTrash
                                  size={12}
                                  style={{ marginRight: '4px' }}
                                />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CCardBody>
            </CCard>
          )}

          {/* ========== WEEK VIEW ========== */}
          {viewMode === 'week' && (
            <CCard>
              <CCardBody style={{ padding: '24px' }}>
                <h4
                  style={{
                    textAlign: 'center',
                    marginBottom: '24px',
                    fontWeight: 700,
                    color: '#1f2937',
                    fontSize: '18px',
                  }}
                >
                  Week of {weekRangeLabel()}
                </h4>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '8px',
                    minHeight: '280px',
                  }}
                >
                  {weekDays.map((d, idx) => {
                    const holiday = findHolidayForDate(d)
                    const bgColor = holiday
                      ? HOLIDAY_TYPE_COLORS[holiday.holidayType] || '#fff'
                      : '#fff'
                    const today = isToday(d)

                    return (
                      <div
                        key={idx}
                        style={{
                          minHeight: '220px',
                          background: bgColor,
                          border: today
                            ? '2px solid #6b4fa1'
                            : '1.5px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#6b7280',
                            marginBottom: '4px',
                          }}
                        >
                          {DAY_NAMES[d.getDay()]}
                        </div>
                        <div
                          style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: today ? '#6b4fa1' : '#1f2937',
                            marginBottom: '8px',
                          }}
                        >
                          {d.getDate()}{' '}
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              color: '#9ca3af',
                            }}
                          >
                            {MONTHS[d.getMonth()].slice(0, 3)}
                          </span>
                        </div>

                        {holiday ? (
                          <>
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 800,
                                color: '#78350f',
                                background: '#fef08a',
                                border: '1px solid #eab308',
                                borderRadius: '5px',
                                padding: '4px 6px',
                                marginBottom: '8px',
                                wordBreak: 'break-word',
                              }}
                            >
                              {holiday.holidayName}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                gap: '4px',
                                marginTop: 'auto',
                              }}
                            >
                              <button
                                onClick={() => handleEdit(holiday)}
                                style={{
                                  padding: '6px 8px',
                                  fontSize: '11px',
                                  flex: 1,
                                  background: '#3b82f6',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                <FaEdit
                                  size={11}
                                  style={{ marginRight: '4px' }}
                                />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteId(holiday.id)
                                  setDeleteHoliday(holiday)
                                  setShowDeleteModal(true)
                                }}
                                style={{
                                  padding: '6px 8px',
                                  fontSize: '11px',
                                  flex: 1,
                                  background: '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                <FaTrash
                                  size={11}
                                  style={{ marginRight: '4px' }}
                                />
                                Delete
                              </button>
                            </div>
                          </>
                        ) : (
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#d1d5db',
                              marginTop: 'auto',
                              textAlign: 'center',
                            }}
                          >
                            No holiday
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CCardBody>
            </CCard>
          )}

          {/* ========== LIST VIEW ========== */}
          {viewMode === 'list' && (
            <CCard>
              <CCardBody>
                <h5
                  style={{
                    marginBottom: '16px',
                    fontWeight: 700,
                    color: '#1f2937',
                  }}
                >
                  Holidays in {MONTHS[month - 1]} {year}
                </h5>

                {holidays.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '24px',
                      color: '#9ca3af',
                    }}
                  >
                    No holidays found for this month
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{ width: '100%', borderCollapse: 'collapse' }}
                    >
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '12px',
                              fontWeight: 700,
                              color: '#6b7280',
                              fontSize: '13px',
                            }}
                          >
                            Day
                          </th>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '12px',
                              fontWeight: 700,
                              color: '#6b7280',
                              fontSize: '13px',
                            }}
                          >
                            Holiday Name
                          </th>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '12px',
                              fontWeight: 700,
                              color: '#6b7280',
                              fontSize: '13px',
                            }}
                          >
                            Type
                          </th>
                          <th
                            style={{
                              textAlign: 'center',
                              padding: '12px',
                              fontWeight: 700,
                              color: '#6b7280',
                              fontSize: '13px',
                            }}
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {holidays.map((holiday) => (
                          <tr
                            key={holiday.id}
                            style={{ borderBottom: '1px solid #f3f4f6' }}
                          >
                            <td
                              style={{
                                padding: '12px',
                                color: '#374151',
                                fontWeight: 600,
                              }}
                            >
                              {holiday.day}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span
                                style={{
                                  background: '#fef08a',
                                  border: '1px solid #eab308',
                                  color: '#78350f',
                                  padding: '4px 8px',
                                  borderRadius: '5px',
                                  fontWeight: 700,
                                  fontSize: '13px',
                                }}
                              >
                                {holiday.holidayName}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: '12px',
                                color: '#374151',
                                fontSize: '13px',
                              }}
                            >
                              <span
                                style={{
                                  background:
                                    HOLIDAY_TYPE_COLORS[holiday.holidayType] ||
                                    '#f3f4f6',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                }}
                              >
                                {holiday.holidayType}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: '12px',
                                textAlign: 'center',
                              }}
                            >
                              <button
                                onClick={() => handleEdit(holiday)}
                                style={{
                                  background: '#3b82f6',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '6px 12px',
                                  cursor: 'pointer',
                                  marginRight: '8px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                }}
                              >
                                <FaEdit
                                  size={12}
                                  style={{ marginRight: '4px' }}
                                />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteId(holiday.id)
                                  setDeleteHoliday(holiday)
                                  setShowDeleteModal(true)
                                }}
                                style={{
                                  background: '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '6px 12px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                }}
                              >
                                <FaTrash
                                  size={12}
                                  style={{ marginRight: '4px' }}
                                />
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CCardBody>
            </CCard>
          )}
        </>
      )}

      {/* ========== DELETE MODAL ========== */}
      <CModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader className="border-0">
          <CModalTitle className="w-100 text-center text-danger fw-bold">
            ⚠ Confirm Delete
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center">
          <p>Are you sure you want to delete this holiday?</p>
          <div
            style={{
              background: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              marginTop: '10px',
            }}
          >
            <div>
              <strong>Day:</strong>{' '}
              <span className="text-primary fw-bold">
                {deleteHoliday?.day}
              </span>
            </div>
            <div className="mt-1">
              <strong>Holiday:</strong>{' '}
              <span className="text-primary fw-bold">
                {deleteHoliday?.holidayName}
              </span>
            </div>
            <div className="mt-1">
              <strong>Type:</strong>{' '}
              <span className="text-primary fw-bold">
                {deleteHoliday?.holidayType}
              </span>
            </div>
          </div>
        </CModalBody>
        <CModalFooter className="border-0 d-flex justify-content-center">
          <CButton
            color="secondary"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </CButton>
          <CButton color="danger" onClick={confirmDelete}>
            Delete
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default CalendarMaster