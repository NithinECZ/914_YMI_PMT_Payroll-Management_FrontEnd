import React, { useEffect, useState, useRef, useMemo } from 'react'
import DataTable from 'react-data-table-component'
import {
  CButton,
  CFormInput,
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
  FaSave,
  FaEye,
  FaPlus,
  FaArrowLeft,
  FaSearch,
  FaTimes,
  FaCheckCircle,
  FaUserSlash,
  FaDatabase,
  FaCalendarAlt,
  FaUsers,
  FaLayerGroup,
  FaTag,
  FaCogs,
  FaPercentage,
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import API from '../../api.js'
import '../../assets/CSS/user.css'
import usePrivilege from '../hooks/usePrivilege'

// ========== OPTIONS ==========
const EMPLOYEE_CATEGORY_OPTIONS = ['CL', 'NAPS']

const SKILL_CATEGORY_OPTIONS = [
  'CL - Unskilled',
  'CL - Semi-Skilled',
  'CL - Semi-Skilled Level 2',
  'NAPS - Unskilled',
  'NAPS - Extended',
  'Staff - Semi-Skilled',
]

const COMPONENT_TYPE_OPTIONS = ['Earning', 'Deduction']
const CALCULATION_METHOD_OPTIONS = ['Fixed Amount', 'Percentage', 'Per Hour']

// ========== LAYOUT CONSTANTS (single source of truth for alignment) ==========
const FIELD_HEIGHT = 38
const LABEL_BLOCK_HEIGHT = 22
const ERROR_SLOT_HEIGHT = 18

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

const inputStyle = {
  height: `${FIELD_HEIGHT}px`,
  minHeight: `${FIELD_HEIGHT}px`,
  paddingLeft: '34px',
  fontSize: '13px',
}

const labelStyle = {
  display: 'block',
  height: `${LABEL_BLOCK_HEIGHT}px`,
  lineHeight: `${LABEL_BLOCK_HEIGHT}px`,
  marginBottom: '4px',
  fontSize: '13px',
  fontWeight: 600,
  color: '#344054',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const EMPTY_STRUCTURE = {
  structureName: '',
  employeeCategory: '',
  skillCategory: '',
  effectiveFrom: '',
  isActive: true,
}

const EMPTY_COMPONENT = {
  componentName: '',
  type: 'Earning',
  calculationMethod: 'Fixed Amount',
  amountOrPercentage: '',
}

const EMPTY_STRUCTURE_ERRORS = {
  structureName: '',
  employeeCategory: '',
  skillCategory: '',
  effectiveFrom: '',
}

const getLoggedInUser = () => {
  try {
    const raw = sessionStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Pulls the message out of whatever the API returned.
const apiMessage = (err, fallback) =>
  err?.response?.data?.message ||
  err?.response?.data?.Message ||
  err?.response?.data?.title ||
  err?.message ||
  fallback

const apiField = (err) => err?.response?.data?.field || err?.response?.data?.Field || null

const SalaryStructureMaster = () => {
  const nameRef = useRef()
  const deleteBtnRef = useRef()

  const [structures, setStructures] = useState([])
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCardFilter, setActiveCardFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState(EMPTY_STRUCTURE)
  const [errors, setErrors] = useState(EMPTY_STRUCTURE_ERRORS)
  const [editId, setEditId] = useState(null)
  const [components, setComponents] = useState([])
  const [newComponent, setNewComponent] = useState(EMPTY_COMPONENT)
  const [componentErrors, setComponentErrors] = useState({})

  const [openEmployeeGroup, setOpenEmployeeGroup] = useState(false)
  const [openSkillCategory, setOpenSkillCategory] = useState(false)
  const [openCompType, setOpenCompType] = useState(false)
  const [openCalcMethod, setOpenCalcMethod] = useState(false)

  const [deleteId, setDeleteId] = useState(null)
  const [deleteStructure, setDeleteStructure] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [showViewModal, setShowViewModal] = useState(false)
  const [viewStructure, setViewStructure] = useState(null)
  const [viewComponents, setViewComponents] = useState([])

  const { canEdit, canDelete } = usePrivilege()
  const canEditStructure = canEdit('Salary Structure')
  const canDeleteStructure = canDelete('Salary Structure')

  useEffect(() => {
    loadStructures()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.custom-select-wrapper')) {
        setOpenEmployeeGroup(false)
        setOpenSkillCategory(false)
        setOpenCompType(false)
        setOpenCalcMethod(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const loadStructures = async () => {
    try {
      const res = await API.get('/SalaryStructure')
      setStructures(Array.isArray(res.data) ? res.data : [])
      setLoadError('')
    } catch (err) {
      const msg = apiMessage(err, 'Failed to load salary structures')
      setStructures([])
      setLoadError(msg)
      toast.error(msg)
    }
  }

  const clearError = (name) => setErrors((prev) => ({ ...prev, [name]: '' }))

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    clearError(name)
  }

  const handleNewComponentChange = (e) => {
    const { name, value } = e.target
    setNewComponent((prev) => ({ ...prev, [name]: value }))
    setComponentErrors((prev) => ({ ...prev, [name]: '' }))
  }

  // Client-side duplicate check against the already-loaded list, so the user
  // is told before the request goes out. The server checks again.
  const isDuplicateName = (name) => {
    const n = (name || '').trim().toLowerCase()
    if (!n) return false
    return structures.some(
      (s) => (s.structureName || '').trim().toLowerCase() === n && s.id !== editId
    )
  }

  const validateStructure = () => {
    const temp = { ...EMPTY_STRUCTURE_ERRORS }
    const name = form.structureName.trim()

    if (!name) temp.structureName = 'Structure Name is required'
    else if (name.length > 150) temp.structureName = 'Structure Name is too long (max 150)'
    else if (isDuplicateName(name)) temp.structureName = `'${name}' already exists`

    if (!form.employeeCategory) temp.employeeCategory = 'Employee Group is required'
    if (!form.skillCategory) temp.skillCategory = 'Skill Category is required'
    if (!form.effectiveFrom) temp.effectiveFrom = 'Effective From is required'

    setErrors(temp)
    return !Object.values(temp).some((x) => x)
  }

  const validateNewComponent = () => {
    const temp = {}
    const name = newComponent.componentName.trim()

    if (!name) temp.componentName = 'Please enter component name'
    else if (components.some((c) => c.componentName.trim().toLowerCase() === name.toLowerCase()))
      temp.componentName = 'This component is already added'

    if (!newComponent.type) temp.type = 'Please choose type'
    if (!newComponent.calculationMethod) temp.calculationMethod = 'Please choose calculation method'

    const amt = newComponent.amountOrPercentage.toString().trim()
    if (!amt) temp.amountOrPercentage = 'Please enter amount'
    else if (Number.isNaN(Number(amt))) temp.amountOrPercentage = 'Enter a valid number'
    else if (Number(amt) < 0) temp.amountOrPercentage = 'Cannot be negative'
    else if (newComponent.calculationMethod === 'Percentage' && Number(amt) > 100)
      temp.amountOrPercentage = 'Cannot be more than 100'

    setComponentErrors(temp)
    return Object.keys(temp).length === 0
  }

  const addComponentRow = () => {
    if (!validateNewComponent()) return
    setComponents((prev) => [...prev, { ...newComponent }])
    setNewComponent(EMPTY_COMPONENT)
    setComponentErrors({})
  }

  const removeComponentRow = (index) => {
    setComponents((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (saving) return
    if (!validateStructure()) {
      if (errors.structureName) nameRef.current?.focus()
      return
    }
    if (components.length === 0) {
      toast.error('Please add at least one component')
      return
    }

    const loggedInUser = getLoggedInUser()
    const payload = {
      structureName: form.structureName.trim(),
      employeeCategory: form.employeeCategory,
      skillCategory: form.skillCategory,
      effectiveFrom: form.effectiveFrom,
      status: form.isActive ? '1' : '0',
      modifiedBy: loggedInUser?.userName || 'SYSTEM',
      components: components.map((c) => ({
        componentName: c.componentName.trim(),
        type: c.type,
        calculationMethod: c.calculationMethod,
        amountOrPercentage: parseFloat(c.amountOrPercentage) || 0,
      })),
    }

    setSaving(true)
    try {
      if (editId) {
        await API.put(`/SalaryStructure/${editId}`, payload)
        toast.success('Salary Structure Updated Successfully')
      } else {
        await API.post('/SalaryStructure', payload)
        toast.success('Salary Structure Saved Successfully')
      }
      await loadStructures()
      resetForm()
      setShowForm(false)
    } catch (err) {
      const msg = apiMessage(err, editId ? 'Update Failed' : 'Save Failed')
      const field = apiField(err)

      // 409 = duplicate structure name. Attach it to the field, not just a toast.
      if (err?.response?.status === 409 || field === 'structureName') {
        setErrors((prev) => ({ ...prev, structureName: msg }))
        nameRef.current?.focus()
      } else if (field && field in EMPTY_STRUCTURE_ERRORS) {
        setErrors((prev) => ({ ...prev, [field]: msg }))
      }

      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (row) => {
    try {
      const res = await API.get(`/SalaryStructure/${row.id}`)
      const data = res.data
      setEditId(row.id)
      setForm({
        structureName: data.structureName || '',
        employeeCategory: data.employeeCategory || '',
        skillCategory: data.skillCategory || '',
        effectiveFrom: data.effectiveFrom ? data.effectiveFrom.substring(0, 10) : '',
        isActive: data.status === '1',
      })
      setComponents(
        (data.components || []).map((c) => ({
          componentName: c.componentName || '',
          type: c.type || 'Earning',
          calculationMethod: c.calculationMethod || 'Fixed Amount',
          amountOrPercentage: c.amountOrPercentage ?? '',
        }))
      )
      setErrors(EMPTY_STRUCTURE_ERRORS)
      setNewComponent(EMPTY_COMPONENT)
      setComponentErrors({})
      setShowForm(true)
      setTimeout(() => nameRef.current?.focus(), 200)
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to load salary structure'))
    }
  }

  // Loads the FULL structure record (header fields + components) for the View modal.
  const openViewStructure = async (row) => {
    try {
      const res = await API.get(`/SalaryStructure/${row.id}`)
      setViewStructure(res.data)
      setViewComponents(res.data.components || [])
      setShowViewModal(true)
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to load salary structure details'))
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await API.delete(`/SalaryStructure/${deleteId}`)
      toast.success('Deleted Successfully')
      await loadStructures()
      resetForm()
    } catch (err) {
      toast.error(apiMessage(err, 'Delete Failed'))
    } finally {
      setShowDeleteModal(false)
      setDeleteId(null)
      setDeleteStructure(null)
    }
  }

  const resetForm = () => {
    setForm(EMPTY_STRUCTURE)
    setErrors(EMPTY_STRUCTURE_ERRORS)
    setEditId(null)
    setComponents([])
    setNewComponent(EMPTY_COMPONENT)
    setComponentErrors({})
    setOpenEmployeeGroup(false)
    setOpenSkillCategory(false)
    setOpenCompType(false)
    setOpenCalcMethod(false)
  }

  const openForm = () => {
    resetForm()
    setShowForm(true)
    setTimeout(() => nameRef.current?.focus(), 200)
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const handleClearForm = () => {
    resetForm()
    setTimeout(() => nameRef.current?.focus(), 200)
  }

  const handleCardClick = (filterValue) => {
    if (!filterValue) return
    setActiveCardFilter((prev) => (prev === filterValue ? 'ALL' : filterValue))
  }

  const filtered = useMemo(() => {
    let rows = structures
    if (activeCardFilter === 'Active') rows = rows.filter((s) => s.status === '1')
    else if (activeCardFilter === 'Inactive') rows = rows.filter((s) => s.status !== '1')

    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (s) =>
        (s.structureName || '').toLowerCase().includes(q) ||
        (s.employeeCategory || '').toLowerCase().includes(q) ||
        (s.skillCategory || '').toLowerCase().includes(q) ||
        (s.createdBy || '').toLowerCase().includes(q)
    )
  }, [structures, search, activeCardFilter])

  const stats = useMemo(() => {
    const total = structures.length
    const active = structures.filter((s) => s.status === '1').length
    return { total, active, inactive: total - active }
  }, [structures])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('en-GB')
    } catch {
      return dateStr
    }
  }

  const formatAmount = (val, method) => {
    if (val === null || val === undefined || val === '') return '-'
    const num = Number(val)
    if (method === 'Percentage') return `${num} %`
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
  }

  const typeBadgeStyle = (type = '') => {
    if (type === 'Earning') return { background: '#dcfce7', color: '#166534' }
    if (type === 'Deduction') return { background: '#fee2e2', color: '#991b1b' }
    return { background: '#e5e7eb', color: '#374151' }
  }

  const skillBadgeStyle = {
    background: '#dbeafe',
    color: '#1e40af',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
  }

  const columns = [
    { name: 'S.No', selector: (_, i) => i + 1, width: '70px' },
    { name: 'Structure Name', selector: (row) => row.structureName, sortable: true, grow: 2 },
    { name: 'Employee Category', selector: (row) => row.employeeCategory, sortable: true, width: '140px' },
    { name: 'Effective From', selector: (row) => formatDate(row.effectiveFrom), sortable: true, width: '130px' },
    {
      name: 'Skill Categories',
      cell: (row) => <span style={skillBadgeStyle}>{row.skillCategory || '-'}</span>,
      grow: 1.5,
    },
    {
      name: 'Status',
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
            {active ? 'Active' : 'Inactive'}
          </span>
        )
      },
    },
    { name: 'Created By', selector: (row) => row.createdBy || '-', width: '120px' },
    { name: 'Created On', selector: (row) => formatDate(row.createdOn), width: '120px' },
    {
      name: 'Action',
      center: true,
      width: '150px',
      // Order: View -> Edit -> Delete
      cell: (row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="table-action-btn privilege-btn"
            onClick={() => openViewStructure(row)}
            title="View Details"
            style={{ background: '#e0e7ff', color: '#3730a3' }}
          >
            <FaEye />
          </button>
          {canEditStructure && (
            <button className="table-action-btn edit-btn" onClick={() => handleEdit(row)} title="Edit">
              <FaEdit />
            </button>
          )}
          {canDeleteStructure && (
            <button
              className="table-action-btn delete-btn"
              onClick={() => {
                setDeleteId(row.id)
                setDeleteStructure(row)
                setShowDeleteModal(true)
              }}
              title="Delete"
            >
              <FaTrash />
            </button>
          )}
        </div>
      ),
    },
  ]

  const fieldLabel = (label, required = true) => (
    <label className="custom-label" style={labelStyle}>
      {label} {required && <span className="required">*</span>}
    </label>
  )

  // Reserved space so a validation message never shifts the row.
  const errorSlot = (msg) => (
    <div
      style={{
        minHeight: `${ERROR_SLOT_HEIGHT}px`,
        lineHeight: `${ERROR_SLOT_HEIGHT}px`,
        fontSize: '11.5px',
      }}
    >
      {msg ? <small className="text-danger">{msg}</small> : null}
    </div>
  )

  const summaryCards = [
    { label: 'Total Salary Structure', value: stats.total, icon: FaDatabase, bg: '#e9edfd', fg: '#4e73df', filterValue: 'ALL' },
    { label: 'Active', value: stats.active, icon: FaCheckCircle, bg: '#e3f6ea', fg: '#16a34a', filterValue: 'Active' },
    { label: 'Inactive', value: stats.inactive, icon: FaUserSlash, bg: '#fde8e8', fg: '#dc2626', filterValue: 'Inactive' },
  ]

  const viewColumns = [
    { name: 'S.No', selector: (_, i) => i + 1, width: '70px' },
    { name: 'Component Name', selector: (row) => row.componentName, grow: 2 },
    {
      name: 'Type',
      cell: (row) => {
        const s = typeBadgeStyle(row.type)
        return (
          <span style={{ ...s, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
            {row.type}
          </span>
        )
      },
      width: '120px',
    },
    { name: 'Calculation Method', selector: (row) => row.calculationMethod, width: '150px' },
    {
      name: 'Amount/Percentage',
      selector: (row) => formatAmount(row.amountOrPercentage, row.calculationMethod),
      width: '150px',
      right: true,
    },
  ]

  const CustomSelect = ({
    value,
    placeholder,
    options,
    open,
    onToggle,
    onSelect,
    error,
    icon: Icon,
    style = {},
  }) => (
    <div className="custom-select-wrapper" style={{ position: 'relative', zIndex: open ? 50 : 1, ...style }}>
      {Icon && <Icon style={fieldIconStyle} />}
      <div
        className={`custom-select-trigger ${!value ? 'custom-select-placeholder' : ''} ${error ? 'error' : ''} ${open ? 'open' : ''}`}
        onClick={onToggle}
        style={{
          height: `${FIELD_HEIGHT}px`,
          minHeight: `${FIELD_HEIGHT}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          paddingLeft: Icon ? '34px' : '12px',
          paddingRight: '12px',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder}
        </span>
        <span className="custom-select-arrow" style={{ flexShrink: 0, marginLeft: '8px' }}>
          ▼
        </span>
      </div>
      <div
        className={`custom-select-dropdown ${open ? 'open' : ''}`}
        style={{ zIndex: 9999, maxHeight: '220px', overflowY: 'auto' }}
      >
        {options.map((opt) => (
          <div
            key={opt}
            className={`custom-select-option ${value === opt ? 'selected' : ''}`}
            onClick={() => onSelect(opt)}
          >
            {opt}
          </div>
        ))}
      </div>
    </div>
  )

  // Small helper for the "all details" grid inside the View modal.
  const DetailItem = ({ label, value }) => (
    <div style={{ minWidth: '160px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
        {value ?? '-'}
      </div>
    </div>
  )

  return (
    <div className="user-master-page">
      {/* ========== FORM (Add / Edit) ========== */}
      {showForm && (
        <CCard className="user-form-card" style={{ overflow: 'visible' }}>
          <CCardBody style={{ overflow: 'visible' }}>
            <div
              className="section-title"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>{editId ? 'EDIT SALARY STRUCTURE' : 'ADD SALARY STRUCTURE'}</span>
              <FaArrowLeft
                style={{ cursor: 'pointer', color: '#6b4fa1', fontSize: '18px' }}
                title="Back"
                onClick={closeForm}
              />
            </div>

            {/* ========== STRUCTURE HEADER ========== */}
            <CRow className="g-3 align-items-start" style={{ overflow: 'visible' }}>
              <CCol md={3}>
                {fieldLabel('Structure Name')}
                <div style={{ position: 'relative' }}>
                  <FaDatabase style={fieldIconStyle} />
                  <CFormInput
                    ref={nameRef}
                    name="structureName"
                    placeholder="Enter Structure Name"
                    value={form.structureName}
                    style={inputStyle}
                    className={errors.structureName ? 'error-input' : ''}
                    onChange={handleChange}
                    onBlur={() => {
                      const n = form.structureName.trim()
                      if (n && isDuplicateName(n))
                        setErrors((prev) => ({ ...prev, structureName: `'${n}' already exists` }))
                    }}
                    autoComplete="off"
                  />
                </div>
                {errorSlot(errors.structureName)}
              </CCol>

              <CCol md={2} style={{ overflow: 'visible' }}>
                {fieldLabel('Employee Group')}
                <CustomSelect
                  value={form.employeeCategory}
                  placeholder="Select"
                  options={EMPLOYEE_CATEGORY_OPTIONS}
                  open={openEmployeeGroup}
                  error={!!errors.employeeCategory}
                  icon={FaUsers}
                  onToggle={() => {
                    setOpenEmployeeGroup(!openEmployeeGroup)
                    setOpenSkillCategory(false)
                    setOpenCompType(false)
                    setOpenCalcMethod(false)
                  }}
                  onSelect={(opt) => {
                    setForm((prev) => ({ ...prev, employeeCategory: opt }))
                    clearError('employeeCategory')
                    setOpenEmployeeGroup(false)
                  }}
                />
                {errorSlot(errors.employeeCategory)}
              </CCol>

              <CCol md={3} style={{ overflow: 'visible' }}>
                {fieldLabel('Skill Category')}
                <CustomSelect
                  value={form.skillCategory}
                  placeholder="Select"
                  options={SKILL_CATEGORY_OPTIONS}
                  open={openSkillCategory}
                  error={!!errors.skillCategory}
                  icon={FaLayerGroup}
                  onToggle={() => {
                    setOpenSkillCategory(!openSkillCategory)
                    setOpenEmployeeGroup(false)
                    setOpenCompType(false)
                    setOpenCalcMethod(false)
                  }}
                  onSelect={(opt) => {
                    setForm((prev) => ({ ...prev, skillCategory: opt }))
                    clearError('skillCategory')
                    setOpenSkillCategory(false)
                  }}
                />
                {errorSlot(errors.skillCategory)}
              </CCol>

              <CCol md={2}>
                {fieldLabel('Effective From')}
                <div style={{ position: 'relative' }}>
                  <FaCalendarAlt style={fieldIconStyle} />
                  <CFormInput
                    type="date"
                    name="effectiveFrom"
                    value={form.effectiveFrom}
                    style={inputStyle}
                    className={errors.effectiveFrom ? 'error-input' : ''}
                    onChange={handleChange}
                  />
                </div>
                {errorSlot(errors.effectiveFrom)}
              </CCol>

              <CCol md={2}>
                {fieldLabel('Status', false)}
                <div
                  onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                  style={{
                    height: `${FIELD_HEIGHT}px`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '999px',
                      background: form.isActive ? '#6b4fa1' : '#d1d5db',
                      position: 'relative',
                      transition: 'background 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: form.isActive ? '22px' : '2px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        transition: 'left 0.2s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: form.isActive ? '#6b4fa1' : '#6b7280' }}>
                    {form.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {errorSlot('')}
              </CCol>
            </CRow>

            {/* ========== ADD COMPONENT ========== */}
            <div
              style={{
                marginTop: '20px',
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                overflow: 'visible',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '12px', color: '#334155' }}>Add Component</div>

              <CRow className="g-2 align-items-start" style={{ overflow: 'visible' }}>
                <CCol md={3}>
                  {fieldLabel('Component Name', false)}
                  <div style={{ position: 'relative' }}>
                    <FaTag style={fieldIconStyle} />
                    <CFormInput
                      name="componentName"
                      placeholder="Enter Component Name"
                      value={newComponent.componentName}
                      style={inputStyle}
                      className={componentErrors.componentName ? 'error-input' : ''}
                      onChange={handleNewComponentChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addComponentRow()
                        }
                      }}
                    />
                  </div>
                  {errorSlot(componentErrors.componentName)}
                </CCol>

                <CCol md={2} style={{ overflow: 'visible' }}>
                  {fieldLabel('Type', false)}
                  <CustomSelect
                    value={newComponent.type}
                    placeholder="Select"
                    options={COMPONENT_TYPE_OPTIONS}
                    open={openCompType}
                    error={!!componentErrors.type}
                    icon={FaLayerGroup}
                    onToggle={() => {
                      setOpenCompType(!openCompType)
                      setOpenCalcMethod(false)
                      setOpenEmployeeGroup(false)
                      setOpenSkillCategory(false)
                    }}
                    onSelect={(opt) => {
                      setNewComponent((prev) => ({ ...prev, type: opt }))
                      setComponentErrors((prev) => ({ ...prev, type: '' }))
                      setOpenCompType(false)
                    }}
                  />
                  {errorSlot(componentErrors.type)}
                </CCol>

                <CCol md={3} style={{ overflow: 'visible' }}>
                  {fieldLabel('Calculation Method', false)}
                  <CustomSelect
                    value={newComponent.calculationMethod}
                    placeholder="Select"
                    options={CALCULATION_METHOD_OPTIONS}
                    open={openCalcMethod}
                    error={!!componentErrors.calculationMethod}
                    icon={FaCogs}
                    onToggle={() => {
                      setOpenCalcMethod(!openCalcMethod)
                      setOpenCompType(false)
                      setOpenEmployeeGroup(false)
                      setOpenSkillCategory(false)
                    }}
                    onSelect={(opt) => {
                      setNewComponent((prev) => ({ ...prev, calculationMethod: opt }))
                      setComponentErrors((prev) => ({ ...prev, calculationMethod: '' }))
                      setOpenCalcMethod(false)
                    }}
                  />
                  {errorSlot(componentErrors.calculationMethod)}
                </CCol>

                <CCol md={3}>
                  {fieldLabel('Amount/Percentage', false)}
                  <div style={{ position: 'relative' }}>
                    {newComponent.calculationMethod === 'Percentage' ? (
                      <FaPercentage style={fieldIconStyle} />
                    ) : (
                      <span style={{ ...fieldIconStyle, fontSize: '13px' }}>₹</span>
                    )}
                    <CFormInput
                      name="amountOrPercentage"
                      type="number"
                      step="any"
                      min="0"
                      placeholder={newComponent.calculationMethod === 'Percentage' ? 'Enter %' : 'Enter Amount'}
                      value={newComponent.amountOrPercentage}
                      style={inputStyle}
                      className={componentErrors.amountOrPercentage ? 'error-input' : ''}
                      onChange={handleNewComponentChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addComponentRow()
                        }
                      }}
                    />
                  </div>
                  {errorSlot(componentErrors.amountOrPercentage)}
                </CCol>

                <CCol md={1} className="d-flex justify-content-center">
                  <div style={{ marginTop: `${LABEL_BLOCK_HEIGHT + 4}px` }}>
                    <div
                      onClick={addComponentRow}
                      title="Add Item"
                      style={{
                        width: `${FIELD_HEIGHT}px`,
                        height: `${FIELD_HEIGHT}px`,
                        borderRadius: '50%',
                        background: '#4915af',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(79,70,229,0.35)',
                        flexShrink: 0,
                      }}
                    >
                      <FaPlus />
                    </div>
                  </div>
                </CCol>
              </CRow>
            </div>

            {/* ========== ADDED COMPONENTS (read-only, delete only) ========== */}
            {components.length > 0 && (
              <div
                style={{
                  marginTop: '16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: '#f1f4f9',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  <div style={{ flex: 3 }}>Component Name</div>
                  <div style={{ flex: 2 }}>Type</div>
                  <div style={{ flex: 2 }}>Calculation Method</div>
                  <div style={{ flex: 2 }}>Amount / %</div>
                  <div style={{ width: '60px', textAlign: 'center' }}>Action</div>
                </div>

                {components.map((comp, index) => {
                  const badge = typeBadgeStyle(comp.type)
                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderTop: '1px solid #f1f5f9',
                        fontSize: '13px',
                        background: '#fff',
                      }}
                    >
                      <div style={{ flex: 3, fontWeight: 500, color: '#1e293b' }}>{comp.componentName}</div>
                      <div style={{ flex: 2 }}>
                        <span
                          style={{
                            ...badge,
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {comp.type}
                        </span>
                      </div>
                      <div style={{ flex: 2, color: '#475569' }}>{comp.calculationMethod}</div>
                      <div style={{ flex: 2, fontWeight: 600, color: '#1e293b' }}>
                        {formatAmount(comp.amountOrPercentage, comp.calculationMethod)}
                      </div>
                      <div style={{ width: '60px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="table-action-btn delete-btn"
                          onClick={() => removeComponentRow(index)}
                          title="Remove"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="form-button-area" style={{ marginTop: '20px' }}>
              <CButton className={editId ? 'update-btn' : 'save-btn'} onClick={handleSubmit} disabled={saving}>
                <FaSave className="me-2" />
                {saving ? 'SAVING...' : editId ? 'UPDATE' : 'SAVE'}
              </CButton>
              <CButton className="clear-btn" onClick={handleClearForm} disabled={saving}>
                CLEAR
              </CButton>
              <CButton color="secondary" variant="outline" onClick={closeForm} disabled={saving}>
                Cancel
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      )}

      {/* ========== SUMMARY CARDS ========== */}
      {!showForm && (
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
            const isActive = activeCardFilter === filterValue
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
                  cursor: 'pointer',
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

          <div
            onClick={openForm}
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
                background: '#111827',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
              }}
            >
              <FaPlus />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginTop: '4px', textAlign: 'center' }}>
              Add<br />Salary
            </span>
          </div>
        </div>
      )}

      {/* ========== LIST ========== */}
      <CCard className="mt-3">
        <CCardBody>
          <div className="table-header">
            <div className="table-title">SALARY STRUCTURE LIST</div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FaSearch style={{ position: 'absolute', left: '12px', color: '#9ca3af', fontSize: '14px' }} />
              <CFormInput
                placeholder="Search structure, category, skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '36px', width: '280px', height: `${FIELD_HEIGHT}px` }}
              />
              {search && (
                <FaTimes
                  style={{ position: 'absolute', right: '12px', cursor: 'pointer', color: '#9ca3af' }}
                  onClick={() => setSearch('')}
                />
              )}
            </div>
          </div>

          {loadError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <span>{loadError}</span>
              <CButton size="sm" color="danger" variant="outline" onClick={loadStructures}>
                Retry
              </CButton>
            </div>
          )}

          <DataTable
            columns={columns}
            data={filtered}
            pagination
            paginationPerPage={10}
            paginationRowsPerPageOptions={paginationRowsPerPageOptions}
            paginationComponentOptions={paginationComponentOptions}
            striped
            responsive
            highlightOnHover
            customStyles={customStyles}
            noDataComponent={<div style={{ padding: 24, color: '#94a3b8' }}>No results found</div>}
          />
        </CCardBody>
      </CCard>

      {/* Delete Modal */}
      <CModal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)} alignment="center" backdrop="static">
        <CModalHeader className="border-0">
          <CModalTitle className="w-100 text-center text-danger fw-bold">⚠ Confirm Delete</CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center">
          <p>Are you sure you want to delete this Salary Structure?</p>
          <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginTop: '10px' }}>
            <div>
              <strong>Structure :</strong>{' '}
              <span className="text-primary fw-bold">{deleteStructure?.structureName}</span>
            </div>
            <div className="mt-1">
              <strong>Category :</strong>{' '}
              <span className="text-primary fw-bold">{deleteStructure?.employeeCategory}</span>
            </div>
          </div>
        </CModalBody>
        <CModalFooter className="border-0 d-flex justify-content-center">
          <CButton color="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </CButton>
          <CButton color="danger" ref={deleteBtnRef} onClick={confirmDelete}>
            Delete
          </CButton>
        </CModalFooter>
      </CModal>

      {/* View Modal - shows ALL structure details + components */}
      <CModal visible={showViewModal} onClose={() => setShowViewModal(false)} size="lg" alignment="center" backdrop="static">
        <CModalHeader className="border-0" style={{ background: '#f8fafc' }}>
          <CModalTitle style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaDatabase style={{ color: '#4f46e5' }} />
            Salary Structure Details
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {viewStructure && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '18px',
              }}
            >
              <DetailItem label="Structure Name" value={viewStructure.structureName} />
              <DetailItem label="Employee Category" value={viewStructure.employeeCategory} />
              <DetailItem label="Skill Category" value={viewStructure.skillCategory} />
              <DetailItem label="Effective From" value={formatDate(viewStructure.effectiveFrom)} />
              <DetailItem
                label="Status"
                value={
                  <span
                    style={{
                      background: viewStructure.status === '1' ? '#dcfce7' : '#fde8e8',
                      color: viewStructure.status === '1' ? '#166534' : '#dc2626',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {viewStructure.status === '1' ? 'Active' : 'Inactive'}
                  </span>
                }
              />
              <DetailItem label="Created By" value={viewStructure.createdBy} />
              <DetailItem label="Created On" value={formatDate(viewStructure.createdOn)} />
              {viewStructure.modifiedBy && (
                <DetailItem label="Modified By" value={viewStructure.modifiedBy} />
              )}
              {viewStructure.modifiedOn && (
                <DetailItem label="Modified On" value={formatDate(viewStructure.modifiedOn)} />
              )}
            </div>
          )}

          <div style={{ fontWeight: 700, fontSize: '13px', color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
            Components
          </div>
          <DataTable
            columns={viewColumns}
            data={viewComponents}
            pagination
            paginationPerPage={10}
            paginationRowsPerPageOptions={[5, 10, 25]}
            paginationComponentOptions={paginationComponentOptions}
            striped
            responsive
            highlightOnHover
            customStyles={customStyles}
            noDataComponent={<div style={{ padding: 24, color: '#94a3b8' }}>No components found</div>}
          />
        </CModalBody>
        <CModalFooter className="border-0 justify-content-center">
          <CButton color="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default SalaryStructureMaster