import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import DataTable from 'react-data-table-component'
import Select from 'react-select'
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
  FaSave,
  FaArrowLeft,
  FaTimes,
  FaSearch,
  FaCheckCircle,
  FaUserSlash,
  FaUsers,
  FaEye,
  FaIdBadge,
  FaUser,
  FaUserTag,
  FaMapMarkerAlt,
  FaPhone,
  FaCalendarAlt,
  FaFileAlt,
  FaChevronDown,
  FaChevronUp,
  FaBuilding,
  FaEnvelope,
  FaDownload,
  FaFilter,
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import API from '../../api.js'
import usePrivilege from '../hooks/usePrivilege'
import '../../assets/CSS/user.css'

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
      position: 'relative',
      whiteSpace: 'nowrap',
      overflow: 'visible',
      textOverflow: 'unset',
    },
  },
  cells: {
    style: {
      justifyContent: 'flex-start',
      fontSize: '13px',
      paddingTop: '0px',
      paddingBottom: '0px',
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

const fieldIconStyle = {
  position: 'absolute',
  left: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#9ca3af',
  fontSize: '14px',
  pointerEvents: 'none',
  zIndex: 2,
}

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 38,
    height: 38,
    fontSize: '13px',
    borderColor: state.isFocused ? '#6b4fa1' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #6b4fa1' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#6b4fa1' : '#9ca3af' },
    paddingLeft: '26px',
  }),
  valueContainer: (base) => ({
    ...base,
    height: 38,
    padding: '0 8px',
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: 38,
  }),
  placeholder: (base) => ({
    ...base,
    color: '#9ca3af',
    fontSize: '13px',
  }),
  singleValue: (base) => ({
    ...base,
    fontSize: '13px',
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
    fontSize: '13px',
  }),
}

const EMPTY_FORM = {
  empId: '',
  empNm: '',
  gender: '',
  vendorId: '',
  vendor: '',
  empCat: '',
  deptNm: '',
  subDiv: '',
  skillCat: '',
  deptCode: '',
  secCode: '',
  ctgCode: '',
  grdCode: '',
  doj: '',
  dol: '',
  emailId: '',
  phoneNo: '',
  uanNo: '',
  pfNo: '',
  esiNo: '',
  permAdd1: '',
  permAdd2: '',
  permStr: '',
  permCity: '',
  permPIN: '',
  permState: '',
  permCntry: '',
  marital: '',
  dob: '',
  aadharNo: '',
  panNo: '',
  qualify: '',
  expYrs: '',
  fatherNm: '',
  nation: '',
  status: '1',
}

const SEARCH_DEBOUNCE_MS = 300

const getLoggedInUser = () => {
  try {
    const raw = sessionStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const SectionHeader = ({ title, icon: Icon, isExpanded, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 16px',
      background: '#f8f9fa',
      borderRadius: '8px',
      cursor: 'pointer',
      userSelect: 'none',
      marginTop: '20px',
      marginBottom: '12px',
      border: '1px solid #e5e7eb',
      transition: 'all 0.2s ease',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f1f3')}
    onMouseLeave={(e) => (e.currentTarget.style.background = '#f8f9fa')}
  >
    {Icon && <Icon size={16} style={{ color: '#6b4fa1' }} />}
    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', flex: 1 }}>{title}</span>
    {isExpanded ? <FaChevronUp size={14} color="#6b4fa1" /> : <FaChevronDown size={14} color="#6b4fa1" />}
  </div>
)

/* ==================== Excel-style Column Filter Popup ==================== */
const ColumnFilterPopup = ({ columnKey, uniqueValues, selectedValues, onApply, onClose, position }) => {
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
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        border: '1px solid #e5e7eb',
        width: '240px',
        maxHeight: '320px',
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

      <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ position: 'relative' }}>
          <FaSearch style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 12 }} />
          <input
            type="text"
            placeholder="Search values..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px 6px 28px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>
      </div>

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
        <span style={{ fontSize: '12px', fontWeight: 600 }}>Select All</span>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
        {filteredValues.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>No values</div>
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
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {val === '' || val == null ? '(Blank)' : String(val)}
              </span>
            </div>
          ))
        )}
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={onClose}
          style={{
            padding: '5px 12px',
            fontSize: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => onApply(Array.from(tempSelected))}
          style={{
            padding: '5px 12px',
            fontSize: '12px',
            border: 'none',
            borderRadius: '6px',
            background: '#6b4fa1',
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

const FilterableHeader = ({ title, columnKey, isFiltered, onOpenFilter, filtersEnabled }) => {
  const headerRef = useRef(null)

  const handleClick = (e) => {
    if (!filtersEnabled) return
    e.stopPropagation()
    if (headerRef.current) {
      const rect = headerRef.current.getBoundingClientRect()
      onOpenFilter(columnKey, {
        top: rect.bottom + 4,
        left: Math.min(rect.left, window.innerWidth - 260),
      })
    }
  }

  return (
    <div
      ref={headerRef}
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        cursor: filtersEnabled ? 'pointer' : 'default',
        userSelect: 'none',
        width: '100%',
        whiteSpace: 'nowrap',
        overflow: 'visible',
      }}
      title={filtersEnabled ? 'Click to filter' : ''}
    >
      <span
        style={{
          whiteSpace: 'nowrap',
          color: filtersEnabled && isFiltered ? '#6b4fa1' : 'inherit',
          fontWeight: filtersEnabled && isFiltered ? 700 : 600,
        }}
      >
        {title}
      </span>
      {filtersEnabled && (
        <FaFilter
          size={11}
          style={{
            color: isFiltered ? '#6b4fa1' : '#9ca3af',
            flexShrink: 0,
          }}
        />
      )}
    </div>
  )
}

const FILTER_KEYS = ['doj', 'dol', 'status']

const getFilterValue = (emp, key) => {
  if (key === 'doj' || key === 'dol') return emp[key] ? emp[key].split('T')[0] : ''
  if (key === 'status') return emp.status === '1' ? 'ACTIVE' : 'INACTIVE'
  return emp[key] ?? ''
}

const EmployeeMaster = () => {
  const deleteBtnRef = useRef()
  const [employees, setEmployees] = useState([])
  const [vendors, setVendors] = useState([])
  const [maritalOptions, setMaritalOptions] = useState([])
  const [genderOptions, setGenderOptions] = useState([])
  const [empCatOptions, setEmpCatOptions] = useState([])
  const [deptOptions, setDeptOptions] = useState([])
  const [subDivOptions, setSubDivOptions] = useState([])
  const [skillCatOptions, setSkillCatOptions] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [deleteId, setDeleteId] = useState(null)
  const [deleteEmployee, setDeleteEmployee] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewData, setViewData] = useState(null)
  const [vendorError, setVendorError] = useState('')
  const [expandedSections, setExpandedSections] = useState({ additionalDetails: true })
  const [activeCardFilter, setActiveCardFilter] = useState('ALL')

  const [columnFilters, setColumnFilters] = useState({})
  const [activeFilterPopup, setActiveFilterPopup] = useState(null)

  const [filtersOn, setFiltersOn] = useState(false)

  const [isTableScrolled, setIsTableScrolled] = useState(false)
  const tableScrollRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    const el = tableScrollRef.current
    if (!el) return
    const onScroll = (e) => {
      const target = e.target
      setIsTableScrolled(target.scrollLeft > 0)
    }
    el.addEventListener('scroll', onScroll, true)
    return () => el.removeEventListener('scroll', onScroll, true)
  }, [])

  const { canEdit } = usePrivilege()
  const canEditEmployee = canEdit('Employee Master')

  useEffect(() => {
    loadEmployees()
    loadVendors()
    loadMaritalStatus()
    loadGenders()
    loadEmpCategories()
    loadDepartments()
    loadSubDivisions()
    loadSkillCategories()
  }, [])

  useEffect(() => {
    if (showDeleteModal) {
      setTimeout(() => deleteBtnRef.current?.focus(), 150)
      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          confirmDelete()
        }
      }
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showDeleteModal, deleteId])

  const loadEmployees = async () => {
    try {
      const res = await API.get('/EmployeeMaster')
      setEmployees(res.data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load employees')
    }
  }

  const loadVendors = async () => {
    try {
      const res = await API.get('/EmployeeMaster/vendors')
      setVendors(res.data || [])
    } catch {
      setVendors([])
    }
  }

  const loadMaritalStatus = async () => {
    try {
      const res = await API.get('/EmployeeMaster/maritalstatus')
      setMaritalOptions(res.data || [])
    } catch {}
  }

  const loadGenders = async () => {
    try {
      const res = await API.get('/EmployeeMaster/genders')
      setGenderOptions(res.data || [])
    } catch {
      setGenderOptions([])
    }
  }

  const loadEmpCategories = async () => {
    try {
      const res = await API.get('/EmployeeMaster/empcategories')
      setEmpCatOptions(res.data || [])
    } catch {
      setEmpCatOptions([])
    }
  }

  const loadDepartments = async () => {
    try {
      const res = await API.get('/EmployeeMaster/departments')
      setDeptOptions(res.data || [])
    } catch {
      setDeptOptions([])
    }
  }

  const loadSubDivisions = async () => {
    try {
      const res = await API.get('/EmployeeMaster/subdivisions')
      setSubDivOptions(res.data || [])
    } catch {
      setSubDivOptions([])
    }
  }

  const loadSkillCategories = async () => {
    try {
      const res = await API.get('/EmployeeMaster/skillcategories')
      setSkillCatOptions(res.data || [])
    } catch {
      setSkillCatOptions([])
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!editId) return
    if (!form.vendorId?.trim()) {
      setVendorError('Vendor is required')
      toast.error('Vendor is required')
      return
    }

    const loggedInUser = getLoggedInUser()
    const payload = {
      empId: form.empId,
      empNm: form.empNm?.trim() || '',
      gender: form.gender || '',
      vendorId: form.vendorId.trim(),
      vendor: form.vendor.trim(),
      empCat: form.empCat || '',
      deptNm: form.deptNm || '',
      subDiv: form.subDiv || '',
      skillCat: form.skillCat || '',
      deptCode: form.deptCode || '',
      secCode: form.secCode || '',
      ctgCode: form.ctgCode || '',
      grdCode: form.grdCode || '',
      doj: form.doj || null,
      dol: form.dol || null,
      emailId: form.emailId || '',
      phoneNo: form.phoneNo || '',
      uanNo: form.uanNo || '',
      pfNo: form.pfNo || '',
      esiNo: form.esiNo || '',
      permAdd1: form.permAdd1 || '',
      permAdd2: form.permAdd2 || '',
      permStr: form.permStr || '',
      permCity: form.permCity || '',
      permPIN: form.permPIN || '',
      permState: form.permState || '',
      permCntry: form.permCntry || '',
      marital: form.marital || '',
      dob: form.dob || null,
      aadharNo: form.aadharNo || '',
      panNo: form.panNo || '',
      qualify: form.qualify || '',
      expYrs: form.expYrs === '' || form.expYrs == null ? null : Number(form.expYrs),
      fatherNm: form.fatherNm || '',
      nation: form.nation || '',
      status: form.status || '1',
      modifiedBy: loggedInUser?.userName || 'SYSTEM',
    }

    try {
      await API.put(`/EmployeeMaster/${editId}`, payload)
      toast.success('Employee Updated Successfully')
      await loadEmployees()
      closeForm()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update Failed')
    }
  }

  const handleEdit = useCallback(async (row) => {
    try {
      const res = await API.get(`/EmployeeMaster/${row.id}`)
      const emp = res.data

      setEditId(row.id)
      setForm({
        empId: emp.empId || '',
        empNm: emp.empNm || '',
        gender: emp.gender || '',
        vendorId: emp.vendorId || '',
        vendor: emp.vendor || '',
        empCat: emp.empCat || '',
        deptNm: emp.deptNm || '',
        subDiv: emp.subDiv || '',
        skillCat: emp.skillCat || '',
        deptCode: emp.deptCode || '',
        secCode: emp.secCode || '',
        ctgCode: emp.ctgCode || '',
        grdCode: emp.grdCode || '',
        doj: emp.doj ? emp.doj.split('T')[0] : '',
        dol: emp.dol ? emp.dol.split('T')[0] : '',
        emailId: emp.emailId || '',
        phoneNo: emp.phoneNo || '',
        uanNo: emp.uanNo || '',
        pfNo: emp.pfNo || '',
        esiNo: emp.esiNo || '',
        permAdd1: emp.permAdd1 || '',
        permAdd2: emp.permAdd2 || '',
        permStr: emp.permStr || '',
        permCity: emp.permCity || '',
        permPIN: emp.permPIN || '',
        permState: emp.permState || '',
        permCntry: emp.permCntry || '',
        marital: emp.marital || '',
        dob: emp.dob ? emp.dob.split('T')[0] : '',
        aadharNo: emp.aadharNo || '',
        panNo: emp.panNo || '',
        qualify: emp.qualify || '',
        expYrs: emp.expYrs != null ? String(emp.expYrs) : '',
        fatherNm: emp.fatherNm || '',
        nation: emp.nation || '',
        status: emp.status || '1',
      })
      setVendorError('')
      setExpandedSections({ additionalDetails: true })
      setShowForm(true)
    } catch {
      toast.error('Failed to load employee')
    }
  }, [])

  const handleView = useCallback(async (row) => {
    try {
      const res = await API.get(`/EmployeeMaster/${row.id}`)
      setViewData(res.data)
      setShowViewModal(true)
    } catch {
      toast.error('Failed to load employee details')
    }
  }, [])

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await API.delete(`/EmployeeMaster/${deleteId}`)
      toast.success('Deleted Successfully')
      await loadEmployees()
    } catch {
      toast.error('Delete Failed')
    } finally {
      setShowDeleteModal(false)
      setDeleteId(null)
      setDeleteEmployee(null)
    }
  }

  const closeForm = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(false)
    setVendorError('')
    setExpandedSections({ additionalDetails: true })
  }

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const displayCodeName = (code, name) => {
    if (code && name) return `${code} | ${name}`
    return name || code || ''
  }

  const getUniqueValuesForColumn = useCallback((key) => {
    const values = employees.map((e) => getFilterValue(e, key))
    return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)))
  }, [employees])

  const filteredBase = useMemo(() => {
    let result = employees

    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (e) =>
          (e.empId || '').toLowerCase().includes(q) ||
          (e.empNm || '').toLowerCase().includes(q)
      )
    }

    const activeFilterEntries = Object.entries(columnFilters).filter(([, sel]) => sel && sel.length > 0)
    if (activeFilterEntries.length > 0) {
      result = result.filter((e) =>
        activeFilterEntries.every(([key, selected]) => selected.includes(getFilterValue(e, key)))
      )
    }

    return result
  }, [employees, search, columnFilters])

  const filtered = useMemo(() => {
    if (activeCardFilter === 'Active') return filteredBase.filter((e) => e.status === '1')
    if (activeCardFilter === 'Inactive') return filteredBase.filter((e) => e.status !== '1')
    return filteredBase
  }, [filteredBase, activeCardFilter])

  const stats = useMemo(() => {
    const total = filteredBase.length
    const active = filteredBase.filter((e) => e.status === '1').length
    return { totalEmployees: total, activeEmployees: active, inactiveEmployees: total - active }
  }, [filteredBase])

  const handleCardClick = useCallback((filterValue) => {
    if (!filterValue) return
    setActiveCardFilter((prev) => (prev === filterValue ? 'ALL' : filterValue))
  }, [])

  const handleExport = useCallback(() => {
    if (filtered.length === 0) {
      toast.warning('No data to export')
      return
    }

    const headers = [
      'EMP_ID', 'NAME', 'GENDER', 'VENDOR', 'EMP_GROUP', 'DEPARTMENT',
      'DIVISION', 'SKILL_CATEGORY', 'DOJ', 'DOL', 'STATUS',
    ]

    const rows = filtered.map((e) => [
      e.empId || '',
      e.empNm || '',
      e.gender || '',
      e.vendor || '',
      e.empCat || '',
      e.deptNm || '',
      e.subDiv || '',
      e.skillCat || '',
      e.doj ? e.doj.split('T')[0] : '',
      e.dol ? e.dol.split('T')[0] : '',
      e.status === '1' ? 'ACTIVE' : 'INACTIVE',
    ])

    let csv = headers.join(',') + '\n'
    rows.forEach((row) => {
      csv += row.map((cell) => `"${cell}"`).join(',') + '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    toast.success('Export successful')
  }, [filtered])

  const openColumnFilter = useCallback((columnKey, position) => {
    setActiveFilterPopup({ columnKey, position })
  }, [])

  const applyColumnFilter = useCallback((selectedValues) => {
    setActiveFilterPopup((currentPopup) => {
      if (!currentPopup) return null
      const key = currentPopup.columnKey
      setColumnFilters((prev) => {
        const next = { ...prev }
        const allValues = getUniqueValuesForColumn(key)
        if (selectedValues.length === 0 || selectedValues.length === allValues.length) {
          delete next[key]
        } else {
          next[key] = selectedValues
        }
        return next
      })
      return null
    })
  }, [getUniqueValuesForColumn])

  const clearAllColumnFilters = useCallback(() => {
    setColumnFilters({})
    setSearchInput('')
    setSearch('')
    setActiveCardFilter('ALL')
  }, [])

  const hasAnyFilter =
    search.trim() !== '' || Object.keys(columnFilters).length > 0 || activeCardFilter !== 'ALL'

  const vendorOptions = useMemo(
    () => vendors.map((v) => ({ value: v.vendorId, label: `${v.vendorId} | ${v.vendorName}` })),
    [vendors]
  )
  const selectedVendor = vendorOptions.find((opt) => opt.value === form.vendorId) || null

  // CodeName dropdown helpers
  const toCodeNameOptions = (list) =>
    (list || []).map((item) => ({
      value: item.code,
      label: item.code && item.name ? `${item.code} | ${item.name}` : (item.name || item.code || ''),
      name: item.name || '',
    }))

  const empCatSelectOptions = useMemo(() => toCodeNameOptions(empCatOptions), [empCatOptions])
  const deptSelectOptions = useMemo(() => toCodeNameOptions(deptOptions), [deptOptions])
  const subDivSelectOptions = useMemo(() => toCodeNameOptions(subDivOptions), [subDivOptions])
  const skillCatSelectOptions = useMemo(() => toCodeNameOptions(skillCatOptions), [skillCatOptions])

  const selectedEmpCat = empCatSelectOptions.find((o) => o.value === form.ctgCode) || null
  const selectedDept = deptSelectOptions.find((o) => o.value === form.deptCode) || null
  const selectedSubDiv = subDivSelectOptions.find((o) => o.value === form.secCode) || null
  const selectedSkillCat = skillCatSelectOptions.find((o) => o.value === form.grdCode) || null

  const FROZEN_COL_1_WIDTH = 70
  const FROZEN_COL_2_WIDTH = 120
  const FROZEN_COL_3_WIDTH = 200

  const columns = useMemo(() => [
    { name: 'S.No', selector: (_, i) => i + 1, width: `${FROZEN_COL_1_WIDTH}px` },
    {
      name: (
        <FilterableHeader
          title="Emp ID"
          columnKey="empId"
          isFiltered={!!columnFilters.empId}
          onOpenFilter={openColumnFilter}
          filtersEnabled={filtersOn}
        />
      ),
      selector: (row) => row.empId,
      sortable: true,
      width: `${FROZEN_COL_2_WIDTH}px`,
    },
    {
      name: (
        <FilterableHeader
          title="Name"
          columnKey="empNm"
          isFiltered={!!columnFilters.empNm}
          onOpenFilter={openColumnFilter}
          filtersEnabled={filtersOn}
        />
      ),
      selector: (row) => row.empNm,
      sortable: true,
      width: `${FROZEN_COL_3_WIDTH}px`,
    },
    {
      name: (
        <FilterableHeader
          title="Gender"
          columnKey="gender"
          isFiltered={!!columnFilters.gender}
          onOpenFilter={openColumnFilter}
          filtersEnabled={filtersOn}
        />
      ),
      selector: (row) => row.gender,
      width: '100px',
    },
    {
      name: (
        <FilterableHeader
          title="Vendor"
          columnKey="vendor"
          isFiltered={!!columnFilters.vendor}
          onOpenFilter={openColumnFilter}
          filtersEnabled={filtersOn}
        />
      ),
      selector: (row) => row.vendor,
      minWidth: '150px',
    },
    {
      name: (
        <FilterableHeader
          title="Emp Group"
          columnKey="empCat"
          isFiltered={!!columnFilters.empCat}
          onOpenFilter={openColumnFilter}
          filtersEnabled={filtersOn}
        />
      ),
      selector: (row) => row.empCat,
      minWidth: '140px',
    },
    {
      name: (
        <FilterableHeader
          title="Department"
          columnKey="deptNm"
          isFiltered={!!columnFilters.deptNm}
          onOpenFilter={openColumnFilter}
          filtersEnabled={filtersOn}
        />
      ),
      selector: (row) => row.deptNm,
      minWidth: '150px',
    },
    {
      name: (
        <FilterableHeader
          title="Division"
          columnKey="subDiv"
          isFiltered={!!columnFilters.subDiv}
          onOpenFilter={openColumnFilter}
          filtersEnabled={filtersOn}
        />
      ),
      selector: (row) => row.subDiv,
      minWidth: '150px',
    },
    {
      name: (
        <FilterableHeader
          title="Skill Category"
          columnKey="skillCat"
          isFiltered={!!columnFilters.skillCat}
          onOpenFilter={openColumnFilter}
          filtersEnabled={filtersOn}
        />
      ),
      selector: (row) => row.skillCat,
      minWidth: '150px',
    },
    {
      name: (
        <FilterableHeader
          title="DOJ"
          columnKey="doj"
          isFiltered={!!columnFilters.doj}
          onOpenFilter={openColumnFilter}
          filtersEnabled={filtersOn}
        />
      ),
      selector: (row) => (row.doj ? row.doj.split('T')[0] : ''),
      width: '120px',
    },
    {
      name: (
        <FilterableHeader
          title="DOL"
          columnKey="dol"
          isFiltered={!!columnFilters.dol}
          onOpenFilter={openColumnFilter}
          filtersEnabled={filtersOn}
        />
      ),
      selector: (row) => (row.dol ? row.dol.split('T')[0] : ''),
      width: '120px',
    },
    {
      name: (
        <FilterableHeader
          title="Status"
          columnKey="status"
          isFiltered={!!columnFilters.status}
          onOpenFilter={openColumnFilter}
          filtersEnabled={filtersOn}
        />
      ),
      center: true,
      width: '110px',
      cell: (row) => {
        const active = row.status === '1'
        return (
          <span
            style={{
              background: active ? '#dcfce7' : '#fde8e8',
              color: active ? '#166534' : '#dc2626',
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {active ? 'ACTIVE' : 'INACTIVE'}
          </span>
        )
      },
    },
    {
      name: 'Actions',
      center: true,
      width: '100px',
      cell: (row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="table-action-btn view-btn" title="View" onClick={() => handleView(row)} style={{ color: '#16a34a' }}>
            <FaEye />
          </button>
          {canEditEmployee && (
            <button className="table-action-btn edit-btn" title="Edit" onClick={() => handleEdit(row)}>
              <FaEdit />
            </button>
          )}
        </div>
      ),
    },
  ], [columnFilters, filtersOn, canEditEmployee, openColumnFilter, handleView, handleEdit])

  const fieldLabel = (label, required = false) => (
    <label className="custom-label">
      {label} {required && <span className="required">*</span>}
    </label>
  )

  const summaryCards = [
    { label: 'Total Employees', value: stats.totalEmployees, icon: FaUsers, bg: '#e9edfd', fg: '#4e73df', filterValue: 'ALL' },
    { label: 'Active Employees', value: stats.activeEmployees, icon: FaCheckCircle, bg: '#e3f6ea', fg: '#16a34a', filterValue: 'Active' },
    { label: 'Inactive Employees', value: stats.inactiveEmployees, icon: FaUserSlash, bg: '#fde8e8', fg: '#dc2626', filterValue: 'Inactive' },
  ]

  const ViewGrid = ({ children }) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        columnGap: '24px',
        rowGap: '18px',
      }}
    >
      {children}
    </div>
  )

  const ViewRow = ({ label, value }) => (
    <div>
      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937', marginTop: '2px', wordBreak: 'break-word' }}>
        {value || '-'}
      </div>
    </div>
  )

  return (
    <div className="user-master-page">
      {showForm && (
        <CCard className="user-form-card">
          <CCardBody>
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>EDIT EMPLOYEE</span>
              <FaArrowLeft style={{ cursor: 'pointer', color: '#6b4fa1', fontSize: '18px' }} title="Back" onClick={closeForm} />
            </div>

            <CRow className="g-3">
              {/* Emp ID — ONLY non-editable field */}
              <CCol md={3}>
                {fieldLabel('Employee ID')}
                <div style={{ position: 'relative' }}>
                  <FaIdBadge style={fieldIconStyle} />
                  <CFormInput value={form.empId} disabled style={{ paddingLeft: '34px', background: '#f3f4f6' }} />
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Employee Name')}
                <div style={{ position: 'relative' }}>
                  <FaUser style={fieldIconStyle} />
                  <CFormInput
                    value={form.empNm}
                    onChange={(e) => handleChange('empNm', e.target.value)}
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Gender')}
                <div style={{ position: 'relative' }}>
                  <FaUser style={fieldIconStyle} />
                  <CFormSelect
                    value={form.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    style={{ paddingLeft: '34px' }}
                  >
                    <option value="">Select</option>
                    {genderOptions.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </CFormSelect>
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Vendor', true)}
                <div style={{ position: 'relative' }}>
                  <FaBuilding style={fieldIconStyle} />
                  <Select
                    options={vendorOptions}
                    value={selectedVendor}
                    onChange={(opt) => {
                      setForm((prev) => ({
                        ...prev,
                        vendorId: opt ? opt.value : '',
                        vendor: opt ? opt.label.split(' | ')[1] : '',
                      }))
                      setVendorError('')
                    }}
                    placeholder="Select Vendor"
                    isClearable
                    styles={selectStyles}
                    classNamePrefix="react-select"
                    className={vendorError ? 'error-select' : ''}
                  />
                </div>
                {vendorError && <small className="text-danger">{vendorError}</small>}
              </CCol>

              <CCol md={3}>
                {fieldLabel('Employee Category')}
                <div style={{ position: 'relative' }}>
                  <FaUserTag style={fieldIconStyle} />
                  <Select
                    options={empCatSelectOptions}
                    value={selectedEmpCat}
                    onChange={(opt) => {
                      setForm((prev) => ({
                        ...prev,
                        ctgCode: opt ? opt.value : '',
                        empCat: opt ? opt.name : '',
                      }))
                    }}
                    placeholder="Select Category"
                    isClearable
                    styles={selectStyles}
                    classNamePrefix="react-select"
                  />
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Department')}
                <div style={{ position: 'relative' }}>
                  <FaBuilding style={fieldIconStyle} />
                  <Select
                    options={deptSelectOptions}
                    value={selectedDept}
                    onChange={(opt) => {
                      setForm((prev) => ({
                        ...prev,
                        deptCode: opt ? opt.value : '',
                        deptNm: opt ? opt.name : '',
                      }))
                    }}
                    placeholder="Select Department"
                    isClearable
                    styles={selectStyles}
                    classNamePrefix="react-select"
                  />
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Sub Division')}
                <div style={{ position: 'relative' }}>
                  <FaBuilding style={fieldIconStyle} />
                  <Select
                    options={subDivSelectOptions}
                    value={selectedSubDiv}
                    onChange={(opt) => {
                      setForm((prev) => ({
                        ...prev,
                        secCode: opt ? opt.value : '',
                        subDiv: opt ? opt.name : '',
                      }))
                    }}
                    placeholder="Select Sub Division"
                    isClearable
                    styles={selectStyles}
                    classNamePrefix="react-select"
                  />
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Skill Category')}
                <div style={{ position: 'relative' }}>
                  <FaUserTag style={fieldIconStyle} />
                  <Select
                    options={skillCatSelectOptions}
                    value={selectedSkillCat}
                    onChange={(opt) => {
                      setForm((prev) => ({
                        ...prev,
                        grdCode: opt ? opt.value : '',
                        skillCat: opt ? opt.name : '',
                      }))
                    }}
                    placeholder="Select Skill Category"
                    isClearable
                    styles={selectStyles}
                    classNamePrefix="react-select"
                  />
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Date of Joining')}
                <div style={{ position: 'relative' }}>
                  <FaCalendarAlt style={fieldIconStyle} />
                  <CFormInput
                    type="date"
                    value={form.doj}
                    onChange={(e) => handleChange('doj', e.target.value)}
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Date of Leaving')}
                <div style={{ position: 'relative' }}>
                  <FaCalendarAlt style={fieldIconStyle} />
                  <CFormInput
                    type="date"
                    value={form.dol}
                    onChange={(e) => handleChange('dol', e.target.value)}
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Email ID')}
                <div style={{ position: 'relative' }}>
                  <FaEnvelope style={fieldIconStyle} />
                  <CFormInput
                    value={form.emailId}
                    onChange={(e) => handleChange('emailId', e.target.value)}
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Phone No')}
                <div style={{ position: 'relative' }}>
                  <FaPhone style={fieldIconStyle} />
                  <CFormInput
                    value={form.phoneNo}
                    onChange={(e) => handleChange('phoneNo', e.target.value)}
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('UAN No')}
                <div style={{ position: 'relative' }}>
                  <FaFileAlt style={fieldIconStyle} />
                  <CFormInput
                    value={form.uanNo}
                    onChange={(e) => handleChange('uanNo', e.target.value)}
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('PF Number')}
                <div style={{ position: 'relative' }}>
                  <FaFileAlt style={fieldIconStyle} />
                  <CFormInput
                    value={form.pfNo}
                    onChange={(e) => handleChange('pfNo', e.target.value)}
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('ESI Number')}
                <div style={{ position: 'relative' }}>
                  <FaFileAlt style={fieldIconStyle} />
                  <CFormInput
                    value={form.esiNo}
                    onChange={(e) => handleChange('esiNo', e.target.value)}
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Status')}
                <div style={{ position: 'relative' }}>
                  <FaUser style={fieldIconStyle} />
                  <CFormSelect
                    value={form.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    style={{ paddingLeft: '34px' }}
                  >
                    <option value="1">ACTIVE</option>
                    <option value="0">INACTIVE</option>
                  </CFormSelect>
                </div>
              </CCol>
            </CRow>

            <SectionHeader
              title="ADDITIONAL DETAILS"
              icon={FaFileAlt}
              isExpanded={expandedSections.additionalDetails}
              onClick={() => toggleSection('additionalDetails')}
            />

            {expandedSections.additionalDetails && (
              <CRow className="g-3">
                <CCol md={6}>
                  {fieldLabel('Address Line 1')}
                  <div style={{ position: 'relative' }}>
                    <FaMapMarkerAlt style={fieldIconStyle} />
                    <CFormInput
                      value={form.permAdd1}
                      onChange={(e) => handleChange('permAdd1', e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </CCol>
                <CCol md={6}>
                  {fieldLabel('Address Line 2')}
                  <div style={{ position: 'relative' }}>
                    <FaMapMarkerAlt style={fieldIconStyle} />
                    <CFormInput
                      value={form.permAdd2}
                      onChange={(e) => handleChange('permAdd2', e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </CCol>
                <CCol md={6}>
                  {fieldLabel('Street')}
                  <div style={{ position: 'relative' }}>
                    <FaMapMarkerAlt style={fieldIconStyle} />
                    <CFormInput
                      value={form.permStr}
                      onChange={(e) => handleChange('permStr', e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('City')}
                  <div style={{ position: 'relative' }}>
                    <FaMapMarkerAlt style={fieldIconStyle} />
                    <CFormInput
                      value={form.permCity}
                      onChange={(e) => handleChange('permCity', e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('PIN')}
                  <div style={{ position: 'relative' }}>
                    <FaMapMarkerAlt style={fieldIconStyle} />
                    <CFormInput
                      value={form.permPIN}
                      onChange={(e) => handleChange('permPIN', e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('State')}
                  <div style={{ position: 'relative' }}>
                    <FaMapMarkerAlt style={fieldIconStyle} />
                    <CFormInput
                      value={form.permState}
                      onChange={(e) => handleChange('permState', e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('Country')}
                  <div style={{ position: 'relative' }}>
                    <FaMapMarkerAlt style={fieldIconStyle} />
                    <CFormInput
                      value={form.permCntry}
                      onChange={(e) => handleChange('permCntry', e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </CCol>

                <CCol md={3}>
                  {fieldLabel('Marital Status')}
                  <div style={{ position: 'relative' }}>
                    <FaUser style={fieldIconStyle} />
                    <CFormSelect
                      value={form.marital}
                      onChange={(e) => handleChange('marital', e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    >
                      <option value="">Select</option>
                      {maritalOptions.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </CFormSelect>
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('Date of Birth')}
                  <div style={{ position: 'relative' }}>
                    <FaCalendarAlt style={fieldIconStyle} />
                    <CFormInput
                      type="date"
                      value={form.dob}
                      onChange={(e) => handleChange('dob', e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('Aadhar Number')}
                  <div style={{ position: 'relative' }}>
                    <FaFileAlt style={fieldIconStyle} />
                    <CFormInput
                      value={form.aadharNo}
                      onChange={(e) => handleChange('aadharNo', e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('PAN Number')}
                  <div style={{ position: 'relative' }}>
                    <FaFileAlt style={fieldIconStyle} />
                    <CFormInput
                      value={form.panNo}
                      onChange={(e) => handleChange('panNo', e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('Qualification')}
                  <div style={{ position: 'relative' }}>
                    <FaFileAlt style={fieldIconStyle} />
                    <CFormInput
                      value={form.qualify}
                      onChange={(e) => handleChange('qualify', e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('Experience (Years)')}
                  <div style={{ position: 'relative' }}>
                    <FaUser style={fieldIconStyle} />
                    <CFormInput
                      type="number"
                      step="0.1"
                      value={form.expYrs}
                      onChange={(e) => handleChange('expYrs', e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('Father Name')}
                  <div style={{ position: 'relative' }}>
                    <FaUser style={fieldIconStyle} />
                    <CFormInput
                      value={form.fatherNm}
                      onChange={(e) => handleChange('fatherNm', e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('Nationality')}
                  <div style={{ position: 'relative' }}>
                    <FaUser style={fieldIconStyle} />
                    <CFormInput
                      value={form.nation}
                      onChange={(e) => handleChange('nation', e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </CCol>
              </CRow>
            )}

            <div className="form-button-area">
              <CButton className="update-btn" onClick={handleSubmit}>
                <FaSave className="me-2" />
                UPDATE
              </CButton>
              <CButton className="clear-btn" onClick={closeForm}>
                CANCEL
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      )}

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
            {summaryCards.map(({ label, value, icon: Icon, bg, fg, filterValue }) => {
              const isClickable = !!filterValue
              const isActive = isClickable && activeCardFilter === filterValue
              return (
                <div
                  key={label}
                  onClick={() => handleCardClick(filterValue)}
                  style={{
                    flex: 1,
                    minWidth: '150px',
                    background: bg,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    cursor: isClickable ? 'pointer' : 'default',
                    border: isActive ? `2px solid ${fg}` : '2px solid transparent',
                    boxShadow: isActive ? `0 0 0 3px ${fg}22` : 'none',
                    transition: 'all 0.15s ease-in-out',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#3f4a6b' }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>{value}</span>
                    <Icon size={22} color={fg} />
                  </div>
                </div>
              )
            })}
          </div>

          <CCard className="mt-3">
            <CCardBody>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div className="table-title">EMPLOYEE LIST</div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <CButton
                    size="sm"
                    title={filtersOn ? 'Disable column filters' : 'Enable column filters'}
                    style={{
                      background: filtersOn ? '#6b4fa1' : '#f3f4f6',
                      color: filtersOn ? '#fff' : '#6b7280',
                      border: filtersOn ? '1px solid #6b4fa1' : '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '38px',
                    }}
                    onClick={() => setFiltersOn((prev) => !prev)}
                  >
                    <FaFilter size={13} />
                  </CButton>

                  {hasAnyFilter && (
                    <CButton
                      size="sm"
                      style={{
                        background: '#f3f4f6',
                        color: '#6b7280',
                        border: '1px solid #e5e7eb',
                        fontSize: '12px',
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onClick={clearAllColumnFilters}
                    >
                      Clear Filters
                    </CButton>
                  )}

                  <CButton
                    size="sm"
                    style={{
                      background: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '38px',
                    }}
                    onClick={handleExport}
                  >
                    <FaDownload size={14} />
                    Export CSV
                  </CButton>

                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <FaSearch
                      style={{
                        position: 'absolute',
                        left: '12px',
                        color: '#9ca3af',
                        fontSize: '14px',
                        pointerEvents: 'none',
                      }}
                    />
                    <CFormInput
                      placeholder="Search by Emp ID or Name..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      style={{
                        paddingLeft: '36px',
                        paddingRight: searchInput ? '32px' : '12px',
                        minWidth: '240px',
                        height: '38px',
                      }}
                    />
                    {searchInput && (
                      <FaTimes
                        onClick={() => {
                          setSearchInput('')
                          setSearch('')
                        }}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          color: '#9ca3af',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              <style>
                {`
                  .emp-frozen-table .rdt_TableCol:nth-child(1),
                  .emp-frozen-table .rdt_TableCell:nth-child(1),
                  .emp-frozen-table .rdt_TableCol:nth-child(2),
                  .emp-frozen-table .rdt_TableCell:nth-child(2),
                  .emp-frozen-table .rdt_TableCol:nth-child(3),
                  .emp-frozen-table .rdt_TableCell:nth-child(3) {
                    position: sticky !important;
                  }
                  .emp-frozen-table .rdt_TableCell:nth-child(1),
                  .emp-frozen-table .rdt_TableCell:nth-child(2),
                  .emp-frozen-table .rdt_TableCell:nth-child(3) {
                    background-color: inherit !important;
                  }
                  .emp-frozen-table .rdt_TableCol:nth-child(1),
                  .emp-frozen-table .rdt_TableCell:nth-child(1) {
                    left: 0px !important;
                  }
                  .emp-frozen-table .rdt_TableCol:nth-child(2),
                  .emp-frozen-table .rdt_TableCell:nth-child(2) {
                    left: ${FROZEN_COL_1_WIDTH}px !important;
                  }
                  .emp-frozen-table .rdt_TableCol:nth-child(3),
                  .emp-frozen-table .rdt_TableCell:nth-child(3) {
                    left: ${FROZEN_COL_1_WIDTH + FROZEN_COL_2_WIDTH}px !important;
                  }
                  .emp-frozen-table.is-scrolled .rdt_TableCol:nth-child(3),
                  .emp-frozen-table.is-scrolled .rdt_TableCell:nth-child(3) {
                    border-right: 2px solid #000 !important;
                    box-shadow: 3px 0 6px -3px rgba(0,0,0,0.25) !important;
                  }
                  .emp-frozen-table .rdt_TableHeadRow {
                    z-index: 4;
                  }
                  .emp-frozen-table .rdt_TableCol:nth-child(1),
                  .emp-frozen-table .rdt_TableCol:nth-child(2),
                  .emp-frozen-table .rdt_TableCol:nth-child(3) {
                    z-index: 5;
                  }
                  .emp-frozen-table .rdt_TableCell:nth-child(1),
                  .emp-frozen-table .rdt_TableCell:nth-child(2),
                  .emp-frozen-table .rdt_TableCell:nth-child(3) {
                    z-index: 1;
                  }
                `}
              </style>
              <div
                ref={tableScrollRef}
                className={`emp-frozen-table${isTableScrolled ? ' is-scrolled' : ''}`}
                style={{ overflowX: 'auto' }}
              >
                <DataTable
                  columns={columns}
                  data={filtered}
                  pagination
                  paginationRowsPerPageOptions={paginationRowsPerPageOptions}
                  paginationComponentOptions={paginationComponentOptions}
                  striped
                  highlightOnHover
                  customStyles={customStyles}
                  noDataComponent={<div style={{ padding: 24, color: '#94a3b8' }}>No results found</div>}
                />
              </div>
            </CCardBody>
          </CCard>
        </>
      )}

      {activeFilterPopup && (
        <ColumnFilterPopup
          columnKey={activeFilterPopup.columnKey}
          uniqueValues={getUniqueValuesForColumn(activeFilterPopup.columnKey)}
          selectedValues={columnFilters[activeFilterPopup.columnKey] || getUniqueValuesForColumn(activeFilterPopup.columnKey)}
          position={activeFilterPopup.position}
          onApply={applyColumnFilter}
          onClose={() => setActiveFilterPopup(null)}
        />
      )}

      <CModal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)} alignment="center" backdrop="static">
        <CModalHeader className="border-0">
          <CModalTitle className="w-100 text-center text-danger fw-bold">⚠ Confirm Delete</CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center">
          <p>Are you sure you want to delete this Employee?</p>
          <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginTop: '10px' }}>
            <div>
              <strong>Employee ID :</strong> <span className="text-primary fw-bold">{deleteEmployee?.empId}</span>
            </div>
            <div className="mt-1">
              <strong>Name :</strong> <span className="text-primary fw-bold">{deleteEmployee?.empNm}</span>
            </div>
          </div>
        </CModalBody>
        <CModalFooter className="border-0 d-flex justify-content-center">
          <CButton color="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</CButton>
          <CButton color="danger" ref={deleteBtnRef} onClick={confirmDelete}>Delete</CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={showViewModal} onClose={() => setShowViewModal(false)} size="xl" alignment="center" backdrop="static">
        <CModalHeader>
          <CModalTitle>
            Employee Details – {viewData?.empId} ({viewData?.empNm})
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {viewData && (
            <>
              <h6 style={{ fontWeight: 700, marginBottom: '12px', color: '#4e73df' }}>BASIC DETAILS</h6>
              <ViewGrid>
                <ViewRow label="Employee ID" value={viewData.empId} />
                <ViewRow label="Employee Name" value={viewData.empNm} />
                <ViewRow label="Gender" value={viewData.gender} />
                <ViewRow label="Vendor Id" value={viewData.vendorId} />
                <ViewRow label="Vendor Name" value={viewData.vendor} />
                <ViewRow label="Employee Category" value={displayCodeName(viewData.ctgCode, viewData.empCat)} />
                <ViewRow label="Department" value={displayCodeName(viewData.deptCode, viewData.deptNm)} />
                <ViewRow label="Sub Division" value={displayCodeName(viewData.secCode, viewData.subDiv)} />
                <ViewRow label="Skill Category" value={displayCodeName(viewData.grdCode, viewData.skillCat)} />
                <ViewRow label="Date of Joining" value={viewData.doj ? viewData.doj.split('T')[0] : ''} />
                <ViewRow label="Date of Leaving" value={viewData.dol ? viewData.dol.split('T')[0] : ''} />
                <ViewRow label="Email ID" value={viewData.emailId} />
                <ViewRow label="Phone No" value={viewData.phoneNo} />
                <ViewRow label="UAN No" value={viewData.uanNo} />
                <ViewRow label="PF Number" value={viewData.pfNo} />
                <ViewRow label="ESI Number" value={viewData.esiNo} />
                <ViewRow label="Status" value={viewData.status === '1' ? 'ACTIVE' : 'INACTIVE'} />
              </ViewGrid>
              <hr style={{ margin: '20px 0' }} />
              <h6 style={{ fontWeight: 700, marginBottom: '12px', color: '#4e73df' }}>ADDITIONAL DETAILS</h6>
              <ViewGrid>
                <ViewRow label="Address Line 1" value={viewData.permAdd1} />
                <ViewRow label="Address Line 2" value={viewData.permAdd2} />
                <ViewRow label="Street" value={viewData.permStr} />
                <ViewRow label="City" value={viewData.permCity} />
                <ViewRow label="PIN" value={viewData.permPIN} />
                <ViewRow label="State" value={viewData.permState} />
                <ViewRow label="Country" value={viewData.permCntry} />
                <ViewRow label="Marital Status" value={viewData.marital} />
                <ViewRow label="Date of Birth" value={viewData.dob ? viewData.dob.split('T')[0] : ''} />
                <ViewRow label="Aadhar Number" value={viewData.aadharNo} />
                <ViewRow label="PAN Number" value={viewData.panNo} />
                <ViewRow label="Qualification" value={viewData.qualify} />
                <ViewRow label="Experience (Years)" value={viewData.expYrs} />
                <ViewRow label="Father Name" value={viewData.fatherNm} />
                <ViewRow label="Nationality" value={viewData.nation} />
              </ViewGrid>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowViewModal(false)}>Close</CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default EmployeeMaster