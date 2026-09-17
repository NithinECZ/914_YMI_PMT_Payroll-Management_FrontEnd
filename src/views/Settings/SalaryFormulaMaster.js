import React, { useEffect, useState, useRef, useMemo } from 'react'
import DataTable from 'react-data-table-component'
import Select from 'react-select'   // ← added
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
  FaUsers,
  FaCogs,
  FaFileAlt,
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import API from '../../api.js'
import '../../assets/CSS/user.css'
import usePrivilege from '../hooks/usePrivilege'

// ========== OPTIONS ==========
const EMPLOYEE_CATEGORY_OPTIONS = [
  { value: 'CL', label: 'CL' },
  { value: 'NAPS', label: 'NAPS' },
]

// ========== LAYOUT CONSTANTS ==========
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

// react-select styles to match your form height
const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: FIELD_HEIGHT,
    height: FIELD_HEIGHT,
    fontSize: '13px',
    borderColor: state.isFocused ? '#6b4fa1' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #6b4fa1' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#6b4fa1' : '#9ca3af' },
    paddingLeft: '26px',
  }),
  valueContainer: (base) => ({
    ...base,
    height: FIELD_HEIGHT,
    padding: '0 8px',
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: FIELD_HEIGHT,
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

const EMPTY_FORMULA = {
  formulaTemplateName: '',
  employeeCategory: '',
  isActive: true,
}

const EMPTY_FORMULA_COMPONENT = {
  componentName: '',
  formula: '',
}

const EMPTY_FORMULA_ERRORS = {
  formulaTemplateName: '',
  employeeCategory: '',
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

const SalaryFormulaMaster = () => {
  const nameRef = useRef()
  const deleteBtnRef = useRef()

  const [formulas, setFormulas] = useState([])
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCardFilter, setActiveCardFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState(EMPTY_FORMULA)
  const [errors, setErrors] = useState(EMPTY_FORMULA_ERRORS)
  const [editId, setEditId] = useState(null)
  const [components, setComponents] = useState([])
  const [newComponent, setNewComponent] = useState(EMPTY_FORMULA_COMPONENT)
  const [componentErrors, setComponentErrors] = useState({})

  // ❌ removed: openEmployeeGroup

  const [deleteId, setDeleteId] = useState(null)
  const [deleteFormula, setDeleteFormula] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [showViewModal, setShowViewModal] = useState(false)
  const [viewFormula, setViewFormula] = useState(null)
  const [viewComponents, setViewComponents] = useState([])

  const { canEdit, canDelete } = usePrivilege()
  const canEditFormula = canEdit('Salary Formula')
  const canDeleteFormula = canDelete('Salary Formula')

  useEffect(() => {
    loadFormulas()
  }, [])

  // ❌ removed: click-outside useEffect for custom select

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

  const loadFormulas = async () => {
    try {
      const res = await API.get('/SalaryFormula')
      setFormulas(Array.isArray(res.data) ? res.data : [])
      setLoadError('')
    } catch (err) {
      const msg = apiMessage(err, 'Failed to load salary formulas')
      setFormulas([])
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

  const isDuplicateName = (name) => {
    const n = (name || '').trim().toLowerCase()
    if (!n) return false
    return formulas.some(
      (f) => (f.formulaTemplateName || '').trim().toLowerCase() === n && f.id !== editId
    )
  }

  const validateFormula = () => {
    const temp = { ...EMPTY_FORMULA_ERRORS }
    const name = form.formulaTemplateName.trim()

    if (!name) temp.formulaTemplateName = 'Formula Template Name is required'
    else if (name.length > 150) temp.formulaTemplateName = 'Formula Template Name is too long (max 150)'
    else if (isDuplicateName(name)) temp.formulaTemplateName = `'${name}' already exists`

    if (!form.employeeCategory) temp.employeeCategory = 'Employee Group is required'

    setErrors(temp)
    return !Object.values(temp).some((x) => x)
  }

  const validateNewComponent = () => {
    const temp = {}
    const name = newComponent.componentName.trim()
    const formula = newComponent.formula.trim()

    if (!name) temp.componentName = 'Please enter component name'
    else if (components.some((c) => c.componentName.trim().toLowerCase() === name.toLowerCase()))
      temp.componentName = 'This component is already added'

    if (!formula) temp.formula = 'Please enter formula'

    setComponentErrors(temp)
    return Object.keys(temp).length === 0
  }

  const addComponentRow = () => {
    if (!validateNewComponent()) return
    setComponents((prev) => [...prev, { ...newComponent }])
    setNewComponent(EMPTY_FORMULA_COMPONENT)
    setComponentErrors({})
  }

  const removeComponentRow = (index) => {
    setComponents((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (saving) return
    if (!validateFormula()) {
      if (errors.formulaTemplateName) nameRef.current?.focus()
      return
    }
    if (components.length === 0) {
      toast.error('Please add at least one formula component')
      return
    }

    const loggedInUser = getLoggedInUser()
    const payload = {
      formulaTemplateName: form.formulaTemplateName.trim(),
      employeeCategory: form.employeeCategory,
      status: form.isActive ? '1' : '0',
      modifiedBy: loggedInUser?.userName || 'SYSTEM',
      components: components.map((c) => ({
        componentName: c.componentName.trim(),
        formula: c.formula.trim(),
      })),
    }

    setSaving(true)
    try {
      if (editId) {
        await API.put(`/SalaryFormula/${editId}`, payload)
        toast.success('Salary Formula Updated Successfully')
      } else {
        await API.post('/SalaryFormula', payload)
        toast.success('Salary Formula Saved Successfully')
      }
      await loadFormulas()
      resetForm()
      setShowForm(false)
    } catch (err) {
      const msg = apiMessage(err, editId ? 'Update Failed' : 'Save Failed')
      const field = apiField(err)

      if (err?.response?.status === 409 || field === 'formulaTemplateName') {
        setErrors((prev) => ({ ...prev, formulaTemplateName: msg }))
        nameRef.current?.focus()
      } else if (field && field in EMPTY_FORMULA_ERRORS) {
        setErrors((prev) => ({ ...prev, [field]: msg }))
      }

      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (row) => {
    try {
      const res = await API.get(`/SalaryFormula/${row.id}`)
      const data = res.data
      setEditId(row.id)
      setForm({
        formulaTemplateName: data.formulaTemplateName || '',
        employeeCategory: data.employeeCategory || '',
        isActive: data.status === '1',
      })
      setComponents(
        (data.components || []).map((c) => ({
          componentName: c.componentName || '',
          formula: c.formula || '',
        }))
      )
      setErrors(EMPTY_FORMULA_ERRORS)
      setNewComponent(EMPTY_FORMULA_COMPONENT)
      setComponentErrors({})
      setShowForm(true)
      setTimeout(() => nameRef.current?.focus(), 200)
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to load salary formula'))
    }
  }

  const openViewFormula = async (row) => {
    try {
      const res = await API.get(`/SalaryFormula/${row.id}`)
      setViewFormula(res.data)
      setViewComponents(res.data.components || [])
      setShowViewModal(true)
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to load salary formula details'))
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await API.delete(`/SalaryFormula/${deleteId}`)
      toast.success('Deleted Successfully')
      await loadFormulas()
      resetForm()
    } catch (err) {
      toast.error(apiMessage(err, 'Delete Failed'))
    } finally {
      setShowDeleteModal(false)
      setDeleteId(null)
      setDeleteFormula(null)
    }
  }

  const resetForm = () => {
    setForm(EMPTY_FORMULA)
    setErrors(EMPTY_FORMULA_ERRORS)
    setEditId(null)
    setComponents([])
    setNewComponent(EMPTY_FORMULA_COMPONENT)
    setComponentErrors({})
  }

  const openFormula = () => {
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
    let rows = formulas
    if (activeCardFilter === 'Active') rows = rows.filter((f) => f.status === '1')
    else if (activeCardFilter === 'Inactive') rows = rows.filter((f) => f.status !== '1')

    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (f) =>
        (f.formulaTemplateName || '').toLowerCase().includes(q) ||
        (f.employeeCategory || '').toLowerCase().includes(q) ||
        (f.createdBy || '').toLowerCase().includes(q)
    )
  }, [formulas, search, activeCardFilter])

  const stats = useMemo(() => {
    const total = formulas.length
    const active = formulas.filter((f) => f.status === '1').length
    return { total, active, inactive: total - active }
  }, [formulas])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('en-GB')
    } catch {
      return dateStr
    }
  }

  const columns = [
    { name: 'S.No', selector: (_, i) => i + 1, width: '70px' },
    { name: 'Formula Template Name', selector: (row) => row.formulaTemplateName, sortable: true, grow: 2 },
    { name: 'Employee Category', selector: (row) => row.employeeCategory, sortable: true, width: '140px' },
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
      cell: (row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="table-action-btn privilege-btn"
            onClick={() => openViewFormula(row)}
            title="View Details"
            style={{ background: '#e0e7ff', color: '#3730a3' }}
          >
            <FaEye />
          </button>
          {canEditFormula && (
            <button className="table-action-btn edit-btn" onClick={() => handleEdit(row)} title="Edit">
              <FaEdit />
            </button>
          )}
          {canDeleteFormula && (
            <button
              className="table-action-btn delete-btn"
              onClick={() => {
                setDeleteId(row.id)
                setDeleteFormula(row)
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

  const viewColumns = [
    { name: 'S.No', selector: (_, i) => i + 1, width: '70px' },
    { name: 'Component Name', selector: (row) => row.componentName, grow: 2 },
    { name: 'Formula', selector: (row) => row.formula, grow: 3 },
  ]

  const fieldLabel = (label, required = true) => (
    <label className="custom-label" style={labelStyle}>
      {label} {required && <span className="required">*</span>}
    </label>
  )

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
    { label: 'Total Salary Formula', value: stats.total, icon: FaDatabase, bg: '#e9edfd', fg: '#4e73df', filterValue: 'ALL' },
    { label: 'Active', value: stats.active, icon: FaCheckCircle, bg: '#e3f6ea', fg: '#16a34a', filterValue: 'Active' },
    { label: 'Inactive', value: stats.inactive, icon: FaUserSlash, bg: '#fde8e8', fg: '#dc2626', filterValue: 'Inactive' },
  ]

  // ❌ CustomSelect component completely removed

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

  // Selected option for react-select
  const selectedEmployeeCategory = EMPLOYEE_CATEGORY_OPTIONS.find(
    (opt) => opt.value === form.employeeCategory
  ) || null

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
              <span>{editId ? 'EDIT SALARY FORMULA' : 'ADD SALARY FORMULA'}</span>
              <FaArrowLeft
                style={{ cursor: 'pointer', color: '#6b4fa1', fontSize: '18px' }}
                title="Back"
                onClick={closeForm}
              />
            </div>

            {/* ========== FORMULA HEADER ========== */}
            <CRow className="g-3 align-items-start" style={{ overflow: 'visible' }}>
              <CCol md={4}>
                {fieldLabel('Formula Template Name')}
                <div style={{ position: 'relative' }}>
                  <FaDatabase style={fieldIconStyle} />
                  <CFormInput
                    ref={nameRef}
                    name="formulaTemplateName"
                    placeholder="Enter Formula Template Name"
                    value={form.formulaTemplateName}
                    style={inputStyle}
                    className={errors.formulaTemplateName ? 'error-input' : ''}
                    onChange={handleChange}
                    onBlur={() => {
                      const n = form.formulaTemplateName.trim()
                      if (n && isDuplicateName(n))
                        setErrors((prev) => ({ ...prev, formulaTemplateName: `'${n}' already exists` }))
                    }}
                    autoComplete="off"
                  />
                </div>
                {errorSlot(errors.formulaTemplateName)}
              </CCol>

              <CCol md={3} style={{ overflow: 'visible' }}>
                {fieldLabel('Employee Group')}
                <div style={{ position: 'relative' }}>
                  <FaUsers style={fieldIconStyle} />
                  <Select
                    options={EMPLOYEE_CATEGORY_OPTIONS}
                    value={selectedEmployeeCategory}
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

            {/* ========== ADD FORMULA COMPONENT ========== */}
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
              <div style={{ fontWeight: 600, marginBottom: '12px', color: '#334155' }}>Add Formula Component</div>

              <CRow className="g-2 align-items-start" style={{ overflow: 'visible' }}>
                <CCol md={4}>
                  {fieldLabel('Component Name', false)}
                  <div style={{ position: 'relative' }}>
                    <FaFileAlt style={fieldIconStyle} />
                    <CFormInput
                      name="componentName"
                      placeholder="e.g. Gross, EPF, ESI, Bonus"
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

                <CCol md={7}>
                  {fieldLabel('Formula / Rule', false)}
                  <div style={{ position: 'relative' }}>
                    <FaCogs style={fieldIconStyle} />
                    <CFormInput
                      name="formula"
                      placeholder="e.g. Earned Basic + DA + HRA + OT Amount"
                      value={newComponent.formula}
                      style={inputStyle}
                      className={componentErrors.formula ? 'error-input' : ''}
                      onChange={handleNewComponentChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addComponentRow()
                        }
                      }}
                    />
                  </div>
                  {errorSlot(componentErrors.formula)}
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

            {/* ========== ADDED COMPONENTS ========== */}
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
                  <div style={{ flex: 5 }}>Formula / Rule</div>
                  <div style={{ width: '60px', textAlign: 'center' }}>Action</div>
                </div>

                {components.map((comp, index) => (
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
                    <div style={{ flex: 5, color: '#475569', fontFamily: 'monospace', fontSize: '12px' }}>
                      {comp.formula}
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
                ))}
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
            onClick={openFormula}
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
              Add<br />Formula
            </span>
          </div>
        </div>
      )}

      {/* ========== LIST ========== */}
      <CCard className="mt-3">
        <CCardBody>
          <div className="table-header">
            <div className="table-title">SALARY FORMULA LIST</div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FaSearch style={{ position: 'absolute', left: '12px', color: '#9ca3af', fontSize: '14px' }} />
              <CFormInput
                placeholder="Search formula, category..."
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
              <CButton size="sm" color="danger" variant="outline" onClick={loadFormulas}>
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
          <p>Are you sure you want to delete this Salary Formula?</p>
          <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginTop: '10px' }}>
            <div>
              <strong>Formula Template :</strong>{' '}
              <span className="text-primary fw-bold">{deleteFormula?.formulaTemplateName}</span>
            </div>
            <div className="mt-1">
              <strong>Category :</strong>{' '}
              <span className="text-primary fw-bold">{deleteFormula?.employeeCategory}</span>
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

      {/* View Modal */}
      <CModal visible={showViewModal} onClose={() => setShowViewModal(false)} size="lg" alignment="center" backdrop="static">
        <CModalHeader className="border-0" style={{ background: '#f8fafc' }}>
          <CModalTitle style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaDatabase style={{ color: '#4f46e5' }} />
            Salary Formula Details
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {viewFormula && (
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
              <DetailItem label="Formula Template Name" value={viewFormula.formulaTemplateName} />
              <DetailItem label="Employee Category" value={viewFormula.employeeCategory} />
              <DetailItem
                label="Status"
                value={
                  <span
                    style={{
                      background: viewFormula.status === '1' ? '#dcfce7' : '#fde8e8',
                      color: viewFormula.status === '1' ? '#166534' : '#dc2626',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {viewFormula.status === '1' ? 'Active' : 'Inactive'}
                  </span>
                }
              />
              <DetailItem label="Created By" value={viewFormula.createdBy} />
              <DetailItem label="Created On" value={formatDate(viewFormula.createdOn)} />
              {viewFormula.modifiedBy && (
                <DetailItem label="Modified By" value={viewFormula.modifiedBy} />
              )}
              {viewFormula.modifiedOn && (
                <DetailItem label="Modified On" value={formatDate(viewFormula.modifiedOn)} />
              )}
            </div>
          )}

          <div style={{ fontWeight: 700, fontSize: '13px', color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
            Formula Components
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

export default SalaryFormulaMaster