import React, { useEffect, useState, useRef, useMemo } from 'react'
import DataTable from 'react-data-table-component'
import Select from 'react-select'
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
  FaChevronUp,
  FaChevronDown,
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import API from '../../api.js'
import '../../assets/CSS/user.css'
import usePrivilege from '../hooks/usePrivilege'

const COMPONENT_TYPE_OPTIONS = ['Earning', 'Deduction']
const CALCULATION_METHOD_OPTIONS = ['Fixed Amount', 'Percentage', 'Per Hour']

const toOptions = (arr) => arr.map((v) => ({ value: v, label: v }))
const COMPONENT_TYPE_SELECT_OPTIONS = toOptions(COMPONENT_TYPE_OPTIONS)
const CALCULATION_METHOD_SELECT_OPTIONS = toOptions(CALCULATION_METHOD_OPTIONS)

const FIELD_HEIGHT = 38
const LABEL_BLOCK_HEIGHT = 22
const ERROR_SLOT_HEIGHT = 18

const customStyles = {
  rows: { style: { minHeight: '38px' } },
  headCells: {
    style: {
      justifyContent: 'flex-start',
      fontSize: '13px',
      fontWeight: '700',
      paddingTop: '4px',
      paddingBottom: '4px',
      background: '#f1f4f9',
      textTransform: 'uppercase',
      color: '#1e293b',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
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

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: `${FIELD_HEIGHT}px`,
    height: `${FIELD_HEIGHT}px`,
    fontSize: '13px',
    borderColor: state.isFocused ? '#6b4fa1' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #6b4fa1' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#6b4fa1' : '#9ca3af' },
    paddingLeft: '26px',
  }),
  valueContainer: (base) => ({
    ...base,
    height: `${FIELD_HEIGHT}px`,
    padding: '0 8px',
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: `${FIELD_HEIGHT}px`,
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

  // From separate SPs
  const [empCategoryOptions, setEmpCategoryOptions] = useState([])     // Code only
  const [skillCategoryOptions, setSkillCategoryOptions] = useState([]) // Code - Name

  const [form, setForm] = useState(EMPTY_STRUCTURE)
  const [errors, setErrors] = useState(EMPTY_STRUCTURE_ERRORS)
  const [editId, setEditId] = useState(null)
  const [components, setComponents] = useState([])
  const [newComponent, setNewComponent] = useState(EMPTY_COMPONENT)
  const [componentErrors, setComponentErrors] = useState({})

  const [deleteId, setDeleteId] = useState(null)
  const [deleteStructure, setDeleteStructure] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [showViewModal, setShowViewModal] = useState(false)
  const [viewStructure, setViewStructure] = useState(null)
  const [viewComponents, setViewComponents] = useState([])
  const [detailsOpen, setDetailsOpen] = useState(true)

  const { canEdit, canDelete } = usePrivilege()
  const canEditStructure = canEdit('Salary Structure')
  const canDeleteStructure = canDelete('Salary Structure')

  useEffect(() => {
    loadStructures()
    loadEmpCategories()
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

  // Employee Group → CODE only (sp_GetDistinctEmpCategories)
  const loadEmpCategories = async () => {
    try {
      const res = await API.get('/SalaryStructure/emp-categories')
      const list = Array.isArray(res.data) ? res.data : []
      const codes = [
        ...new Set(
          list
            .map((x) => (x.code || x.Code || '').trim())
            .filter((c) => c !== '')
        ),
      ]
      setEmpCategoryOptions(codes.map((code) => ({ value: code, label: code })))
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to load employee categories'))
      setEmpCategoryOptions([])
    }
  }

  // Skill Category → CODE - NAME (sp_GetDistinctSkillCategories)
  const loadSkillCategories = async () => {
    try {
      const res = await API.get('/SalaryStructure/skill-categories')
      const list = Array.isArray(res.data) ? res.data : []
      const skillOpts = []
      const seen = new Set()
      list.forEach((x) => {
        const code = (x.code || x.Code || '').trim()
        const name = (x.name || x.Name || '').trim()
        if (!code && !name) return
        const label = code && name ? `${code} - ${name}` : code || name
        if (seen.has(label)) return
        seen.add(label)
        skillOpts.push({ value: label, label })
      })
      setSkillCategoryOptions(skillOpts)
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to load skill categories'))
      setSkillCategoryOptions([])
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

  const openViewStructure = async (row) => {
    try {
      const res = await API.get(`/SalaryStructure/${row.id}`)
      setViewStructure(res.data)
      setViewComponents(res.data.components || [])
      setDetailsOpen(true)
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
    { name: 'S.No', selector: (_, i) => i + 1, width: '8%', style: { flex: '0 0 8%' } },
    { name: 'Structure Name', selector: (row) => row.structureName, sortable: true, width: '20%', style: { flex: '0 0 20%' } },
    { name: 'Employee Category', selector: (row) => row.employeeCategory, sortable: true, width: '18%', style: { flex: '0 0 18%' } },
    { name: 'Effective From', selector: (row) => formatDate(row.effectiveFrom), sortable: true, width: '15%', style: { flex: '0 0 15%' } },
    {
      name: 'Skill Categories',
      cell: (row) => <span style={skillBadgeStyle}>{row.skillCategory || '-'}</span>,
      width: '15%',
      style: { flex: '0 0 15%' },
    },
    {
      name: 'Status',
      center: true,
      width: '12%',
      style: { flex: '0 0 12%' },
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
    {
      name: 'Action',
      center: true,
      width: '12%',
      style: { flex: '0 0 12%' },
      cell: (row) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
          <button className="table-action-btn" onClick={() => openViewStructure(row)} title="View Details" style={{ color: '#16a34a' }}>
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

  const errorSlot = (msg) => (
    <div style={{ minHeight: `${ERROR_SLOT_HEIGHT}px`, lineHeight: `${ERROR_SLOT_HEIGHT}px`, fontSize: '11.5px' }}>
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
    { name: 'Component Name', selector: (row) => row.componentName, grow: 2, minWidth: '180px' },
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
      minWidth: '110px',
    },
    { name: 'Calculation Method', selector: (row) => row.calculationMethod, minWidth: '190px' },
    {
      name: 'Amount/Percentage',
      selector: (row) => formatAmount(row.amountOrPercentage, row.calculationMethod),
      minWidth: '170px',
      right: true,
    },
  ]

  const DetailItem = ({ label, value }) => (
    <div style={{ minWidth: '170px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>{value ?? '-'}</div>
    </div>
  )

  return (
    <div className="user-master-page">
      {showForm && (
        <CCard className="user-form-card" style={{ overflow: 'visible' }}>
          <CCardBody style={{ overflow: 'visible' }}>
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{editId ? 'EDIT SALARY STRUCTURE' : 'ADD SALARY STRUCTURE'}</span>
              <FaArrowLeft style={{ cursor: 'pointer', color: '#6b4fa1', fontSize: '18px' }} title="Back" onClick={closeForm} />
            </div>

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

              {/* Employee Group → CODE only */}
              <CCol md={2} style={{ overflow: 'visible' }}>
                {fieldLabel('Employee Group')}
                <div style={{ position: 'relative' }}>
                  <FaUsers style={fieldIconStyle} />
                  <Select
                    options={empCategoryOptions}
                    value={empCategoryOptions.find((o) => o.value === form.employeeCategory) || null}
                    onChange={(opt) => {
                      setForm((prev) => ({ ...prev, employeeCategory: opt ? opt.value : '' }))
                      clearError('employeeCategory')
                    }}
                    placeholder="Select"
                    isClearable
                    styles={selectStyles}
                    classNamePrefix="react-select"
                    className={errors.employeeCategory ? 'error-select' : ''}
                  />
                </div>
                {errorSlot(errors.employeeCategory)}
              </CCol>

              {/* Skill Category → CODE - NAME */}
              <CCol md={3} style={{ overflow: 'visible' }}>
                {fieldLabel('Skill Category')}
                <div style={{ position: 'relative' }}>
                  <FaLayerGroup style={fieldIconStyle} />
                  <Select
                    options={skillCategoryOptions}
                    value={skillCategoryOptions.find((o) => o.value === form.skillCategory) || null}
                    onChange={(opt) => {
                      setForm((prev) => ({ ...prev, skillCategory: opt ? opt.value : '' }))
                      clearError('skillCategory')
                    }}
                    placeholder="Select"
                    isClearable
                    styles={selectStyles}
                    classNamePrefix="react-select"
                    className={errors.skillCategory ? 'error-select' : ''}
                  />
                </div>
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

            {/* Add Component section - same as before */}
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
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', overflow: 'visible', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
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
                </div>

                <div style={{ flex: 1, minWidth: '180px', overflow: 'visible' }}>
                  {fieldLabel('Type', false)}
                  <div style={{ position: 'relative' }}>
                    <FaLayerGroup style={fieldIconStyle} />
                    <Select
                      options={COMPONENT_TYPE_SELECT_OPTIONS}
                      value={COMPONENT_TYPE_SELECT_OPTIONS.find((o) => o.value === newComponent.type) || null}
                      onChange={(opt) => {
                        setNewComponent((prev) => ({ ...prev, type: opt ? opt.value : '' }))
                        setComponentErrors((prev) => ({ ...prev, type: '' }))
                      }}
                      placeholder="Select"
                      isClearable
                      styles={selectStyles}
                      classNamePrefix="react-select"
                      className={componentErrors.type ? 'error-select' : ''}
                    />
                  </div>
                  {errorSlot(componentErrors.type)}
                </div>

                <div style={{ flex: 1, minWidth: '180px', overflow: 'visible' }}>
                  {fieldLabel('Calculation Method', false)}
                  <div style={{ position: 'relative' }}>
                    <FaCogs style={fieldIconStyle} />
                    <Select
                      options={CALCULATION_METHOD_SELECT_OPTIONS}
                      value={
                        CALCULATION_METHOD_SELECT_OPTIONS.find((o) => o.value === newComponent.calculationMethod) || null
                      }
                      onChange={(opt) => {
                        setNewComponent((prev) => ({ ...prev, calculationMethod: opt ? opt.value : '' }))
                        setComponentErrors((prev) => ({ ...prev, calculationMethod: '' }))
                      }}
                      placeholder="Select"
                      isClearable
                      styles={selectStyles}
                      classNamePrefix="react-select"
                      className={componentErrors.calculationMethod ? 'error-select' : ''}
                    />
                  </div>
                  {errorSlot(componentErrors.calculationMethod)}
                </div>

                <div style={{ flex: 1, minWidth: '180px' }}>
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
                </div>

                <div style={{ flexShrink: 0 }} className="d-flex justify-content-center">
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
                </div>
              </div>
            </div>

            {components.length > 0 && (
              <div style={{ marginTop: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
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
                        <span style={{ ...badge, padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                          {comp.type}
                        </span>
                      </div>
                      <div style={{ flex: 2, color: '#475569' }}>{comp.calculationMethod}</div>
                      <div style={{ flex: 2, fontWeight: 600, color: '#1e293b' }}>
                        {formatAmount(comp.amountOrPercentage, comp.calculationMethod)}
                      </div>
                      <div style={{ width: '60px', textAlign: 'center' }}>
                        <button type="button" className="table-action-btn delete-btn" onClick={() => removeComponentRow(index)} title="Remove">
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
          <div onClick={openForm} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
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
                <FaTimes style={{ position: 'absolute', right: '12px', cursor: 'pointer', color: '#9ca3af' }} onClick={() => setSearch('')} />
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

      <CModal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)} alignment="center" backdrop="static">
        <CModalHeader className="border-0">
          <CModalTitle className="w-100 text-center text-danger fw-bold">⚠ Confirm Delete</CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center">
          <p>Are you sure you want to delete this Salary Structure?</p>
          <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginTop: '10px' }}>
            <div>
              <strong>Structure :</strong> <span className="text-primary fw-bold">{deleteStructure?.structureName}</span>
            </div>
            <div className="mt-1">
              <strong>Category :</strong> <span className="text-primary fw-bold">{deleteStructure?.employeeCategory}</span>
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

      <CModal visible={showViewModal} onClose={() => setShowViewModal(false)} size="xl" alignment="center" backdrop="static">
        <CModalHeader className="border-0" style={{ background: '#f8fafc' }}>
          <CModalTitle style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
            <FaDatabase style={{ color: '#4f46e5' }} />
            Salary Structure Details
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {viewStructure && (
            <div style={{ marginBottom: '18px' }}>
              <div
                onClick={() => setDetailsOpen((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                  padding: '10px 14px',
                  background: '#f1f4f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: detailsOpen ? '10px 10px 0 0' : '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1e293b',
                  textTransform: 'uppercase',
                }}
              >
                <span>Structure Details</span>
                {detailsOpen ? <FaChevronUp /> : <FaChevronDown />}
              </div>
              {detailsOpen && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    padding: '16px',
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
                  {viewStructure.modifiedBy && <DetailItem label="Modified By" value={viewStructure.modifiedBy} />}
                  {viewStructure.modifiedOn && <DetailItem label="Modified On" value={formatDate(viewStructure.modifiedOn)} />}
                </div>
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