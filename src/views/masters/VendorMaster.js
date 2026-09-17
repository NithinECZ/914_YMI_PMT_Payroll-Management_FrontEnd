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
  FaPlus,
  FaArrowLeft,
  FaCheckCircle,
  FaUserSlash,
  FaSearch,
  FaTimes,
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaFileAlt,
  FaEye,
  FaCog,
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import API from '../../api.js'
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
}

const EMPTY_FORM = {
  vendorId: '',
  vendorName: '',
  vendorEmail: '',
  vendorGSTIN: '',
  vendorPAN: '',
  vendorContact: '',
  vendorAddress: '',
  vendorESIC: '',
  vendorPF: '',
  vendorLicense: '',
  isActive: true,
}

const EMPTY_ERRORS = {
  vendorId: '',
  vendorName: '',
  vendorEmail: '',
  vendorGSTIN: '',
  vendorPAN: '',
  vendorContact: '',
  vendorAddress: '',
  vendorESIC: '',
  vendorPF: '',
  vendorLicense: '',
}

const getLoggedInUser = () => {
  try {
    const raw = sessionStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const DisabledFieldWrapper = ({ children, disabled = true }) => (
  <div
    style={{
      position: 'relative',
      opacity: disabled ? 0.6 : 1,
    }}
    title={disabled ? 'This field is not editable' : ''}
  >
    {children}
    {disabled && (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'transparent',
          borderRadius: '4px',
          border: '1px dashed #d1d5db',
          pointerEvents: 'none',
        }}
      />
    )}
  </div>
)

const VendorMaster = () => {
  const codeRef = useRef()
  const deleteBtnRef = useRef()

  const [vendors, setVendors] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState(EMPTY_ERRORS)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [deleteVendor, setDeleteVendor] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewData, setViewData] = useState(null)
  const [activeCardFilter, setActiveCardFilter] = useState('ALL')

  useEffect(() => {
    loadVendors()
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

  const loadVendors = async () => {
    try {
      const res = await API.get('/VendorMaster')
      setVendors(res.data || [])
    } catch {
      toast.error('Failed to load vendors')
    }
  }

  const clearError = (name) => setErrors((prev) => ({ ...prev, [name]: '' }))

  const handleChange = (e) => {
    const { name, value } = e.target
    let v = value

    switch (name) {
      case 'vendorId':
        v = v.toUpperCase().replace(/[^A-Z0-9]/g, '')
        break
      case 'vendorGSTIN':
      case 'vendorPAN':
        v = v.toUpperCase()
        break
      case 'vendorEmail':
        v = v.toLowerCase()
        break
      case 'vendorContact':
        // Only digits, max 13
        v = v.replace(/\D/g, '')
        if (v.length > 13) v = v.slice(0, 13)
        break
      default:
        v = v.toUpperCase()
        break
    }

    setForm((prev) => ({ ...prev, [name]: v }))
    clearError(name)
  }

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const validate = () => {
    const temp = { ...EMPTY_ERRORS }

    if (!form.vendorId.trim()) temp.vendorId = 'Vendor Id is required'
    if (!form.vendorName.trim()) temp.vendorName = 'Vendor Name is required'
    if (!form.vendorEmail.trim()) {
      temp.vendorEmail = 'Email is required'
    } else if (!validateEmail(form.vendorEmail)) {
      temp.vendorEmail = 'Invalid email format'
    }
    if (!form.vendorGSTIN.trim()) temp.vendorGSTIN = 'GSTIN is required'
    if (form.vendorGSTIN.length !== 15) temp.vendorGSTIN = 'GSTIN must be 15 characters'
    if (!form.vendorPAN.trim()) temp.vendorPAN = 'PAN is required'
    if (form.vendorPAN.length !== 10) temp.vendorPAN = 'PAN must be 10 characters'

    // Contact: 10 to 13 digits only
    if (!form.vendorContact.trim()) {
      temp.vendorContact = 'Contact is required'
    } else if (!/^\d{10,13}$/.test(form.vendorContact)) {
      temp.vendorContact = 'Contact must be 10 to 13 digits'
    }

    if (!form.vendorLicense.trim()) temp.vendorLicense = 'License No. is required'

    setErrors(temp)
    return !Object.values(temp).some((x) => x)
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const loggedInUser = getLoggedInUser()

    const payload = {
      vendorId: form.vendorId.trim(),
      vendorName: form.vendorName.trim(),
      vendorEmail: form.vendorEmail.trim(),
      vendorGSTIN: form.vendorGSTIN.trim(),
      vendorPAN: form.vendorPAN.trim(),
      vendorContact: form.vendorContact.trim(),
      vendorAddress: form.vendorAddress.trim() || null,
      vendorESIC: form.vendorESIC.trim() || null,
      vendorPF: form.vendorPF.trim() || null,
      vendorLicense: form.vendorLicense.trim(),
      modifiedBy: loggedInUser?.userName || 'SYSTEM',
      isActive: editId ? form.isActive : true,
    }

    try {
      if (editId) {
        await API.put(`/VendorMaster/${editId}`, payload)
        toast.success('Vendor Updated Successfully')
        await loadVendors()
        resetForm()
      } else {
        await API.post('/VendorMaster', payload)
        toast.success('Vendor Saved Successfully')
        await loadVendors()
        resetForm()
        setTimeout(() => codeRef.current?.focus(), 200)
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save Failed')
    }
  }

  const handleEdit = async (row) => {
    try {
      const res = await API.get(`/VendorMaster/${row.id}`)
      const v = res.data

      setEditId(row.id)
      setForm({
        vendorId: v.vendorId || '',
        vendorName: v.vendorName || '',
        vendorEmail: v.vendorEmail || '',
        vendorGSTIN: v.vendorGSTIN || '',
        vendorPAN: v.vendorPAN || '',
        vendorContact: v.vendorContact || '',
        vendorAddress: v.vendorAddress || '',
        vendorESIC: v.vendorESIC || '',
        vendorPF: v.vendorPF || '',
        vendorLicense: v.vendorLicense || '',
        isActive: v.status === '1',
      })
      setErrors(EMPTY_ERRORS)
      setShowForm(true)
    } catch {
      toast.error('Failed to load vendor')
    }
  }

  const handleView = async (row) => {
    try {
      const res = await API.get(`/VendorMaster/${row.id}`)
      setViewData(res.data)
      setShowViewModal(true)
    } catch {
      toast.error('Failed to load vendor details')
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await API.delete(`/VendorMaster/${deleteId}`)
      toast.success('Deleted Successfully')
      await loadVendors()
      resetForm()
    } catch {
      toast.error('Delete Failed')
    } finally {
      setShowDeleteModal(false)
      setDeleteId(null)
      setDeleteVendor(null)
    }
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setErrors(EMPTY_ERRORS)
    setEditId(null)
  }

  const openForm = () => {
    resetForm()
    setShowForm(true)
    setTimeout(() => codeRef.current?.focus(), 200)
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const handleClearForm = () => {
    resetForm()
    setTimeout(() => codeRef.current?.focus(), 200)
  }

  const handleCardClick = (filterValue) => {
    if (!filterValue) return
    setActiveCardFilter((prev) => (prev === filterValue ? 'ALL' : filterValue))
  }

  const filtered = useMemo(() => {
    let rows = vendors

    if (activeCardFilter === 'Active') {
      rows = rows.filter((v) => v.status === '1')
    } else if (activeCardFilter === 'Inactive') {
      rows = rows.filter((v) => v.status !== '1')
    }

    const q = search.trim().toLowerCase()
    if (!q) return rows

    return rows.filter(
      (v) =>
        (v.vendorId || '').toLowerCase().includes(q) ||
        (v.vendorName || '').toLowerCase().includes(q) ||
        (v.vendorEmail || '').toLowerCase().includes(q)
    )
  }, [vendors, search, activeCardFilter])

  const stats = useMemo(() => {
    const totalVendors = vendors.length
    const activeVendors = vendors.filter((v) => v.status === '1').length
    const inactiveVendors = totalVendors - activeVendors

    return {
      totalVendors,
      activeVendors,
      inactiveVendors,
    }
  }, [vendors])

  const columns = [
    { name: 'S.No', selector: (_, i) => i + 1, width: '70px' },
    { name: 'Vendor Id', selector: (row) => row.vendorId, sortable: true },
    { name: 'Vendor Name', selector: (row) => row.vendorName, sortable: true },
    { name: 'Email', selector: (row) => row.vendorEmail, sortable: true },
    { name: 'GSTIN', selector: (row) => row.vendorGSTIN },
    {
      name: 'Status',
      center: true,
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
      cell: (row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="table-action-btn view-btn"
            title="View"
            onClick={() => handleView(row)}
            style={{ color: '#16a34a' }}
          >
            <FaEye />
          </button>

          <button className="table-action-btn edit-btn" title="Edit" onClick={() => handleEdit(row)}>
            <FaEdit />
          </button>

          <button
            className="table-action-btn delete-btn"
            title="Delete"
            onClick={() => {
              setDeleteId(row.id)
              setDeleteVendor(row)
              setShowDeleteModal(true)
            }}
          >
            <FaTrash />
          </button>
        </div>
      ),
    },
  ]

  const fieldLabel = (label, required = true) => (
    <label className="custom-label">
      {label} {required && <span className="required">*</span>}
    </label>
  )

  const summaryCards = [
    {
      label: 'Total Vendors',
      value: stats.totalVendors,
      icon: FaBuilding,
      bg: '#e9edfd',
      fg: '#4e73df',
      filterValue: 'ALL',
    },
    {
      label: 'Active Vendors',
      value: stats.activeVendors,
      icon: FaCheckCircle,
      bg: '#e3f6ea',
      fg: '#16a34a',
      filterValue: 'Active',
    },
    {
      label: 'Inactive Vendors',
      value: stats.inactiveVendors,
      icon: FaUserSlash,
      bg: '#fde8e8',
      fg: '#dc2626',
      filterValue: 'Inactive',
    },
  ]

  const ViewRow = ({ label, value }) => (
    <CCol md={4} className="mb-3">
      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937', marginTop: '2px', wordBreak: 'break-word' }}>
        {value || '-'}
      </div>
    </CCol>
  )

  return (
    <div className="user-master-page">
      {showForm && (
        <CCard className="user-form-card">
          <CCardBody>
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{editId ? 'EDIT VENDOR' : 'VENDOR DETAILS'}</span>
              <FaArrowLeft style={{ cursor: 'pointer', color: '#6b4fa1', fontSize: '18px' }} title="Back" onClick={closeForm} />
            </div>

            {/* TOP ROW: ID | Name | Email */}
            <CRow className="g-3" autoComplete="off">
              <CCol md={4}>
                {fieldLabel('Vendor Id')}
                <div style={{ position: 'relative' }}>
                  <FaBuilding style={fieldIconStyle} />
                  <DisabledFieldWrapper disabled={!!editId}>
                    <CFormInput
                      ref={codeRef}
                      name="vendorId"
                      placeholder="Enter vendor id"
                      value={form.vendorId}
                      style={{ paddingLeft: '34px' }}
                      className={errors.vendorId ? 'error-input' : ''}
                      onChange={handleChange}
                      disabled={!!editId}
                      autoComplete="off"
                    />
                  </DisabledFieldWrapper>
                </div>
                {errors.vendorId && <small className="text-danger">{errors.vendorId}</small>}
              </CCol>

              <CCol md={4}>
                {fieldLabel('Vendor Name')}
                <div style={{ position: 'relative' }}>
                  <FaBuilding style={fieldIconStyle} />
                  <CFormInput
                    name="vendorName"
                    placeholder="Enter vendor name"
                    value={form.vendorName}
                    style={{ paddingLeft: '34px' }}
                    className={errors.vendorName ? 'error-input' : ''}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                </div>
                {errors.vendorName && <small className="text-danger">{errors.vendorName}</small>}
              </CCol>

              <CCol md={4}>
                {fieldLabel('Email')}
                <div style={{ position: 'relative' }}>
                  <FaEnvelope style={fieldIconStyle} />
                  <CFormInput
                    name="vendorEmail"
                    type="email"
                    placeholder="Enter email"
                    value={form.vendorEmail}
                    style={{ paddingLeft: '34px' }}
                    className={errors.vendorEmail ? 'error-input' : ''}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                </div>
                {errors.vendorEmail && <small className="text-danger">{errors.vendorEmail}</small>}
              </CCol>
            </CRow>

            {/* SECOND ROW: GSTIN | PAN | Contact */}
            <CRow className="g-3 mt-1" autoComplete="off">
              <CCol md={4}>
                {fieldLabel('GSTIN')}
                <div style={{ position: 'relative' }}>
                  <FaFileAlt style={fieldIconStyle} />
                  <CFormInput
                    name="vendorGSTIN"
                    placeholder="15 characters"
                    value={form.vendorGSTIN}
                    style={{ paddingLeft: '34px' }}
                    className={errors.vendorGSTIN ? 'error-input' : ''}
                    onChange={handleChange}
                    autoComplete="off"
                    maxLength="15"
                  />
                </div>
                {errors.vendorGSTIN && <small className="text-danger">{errors.vendorGSTIN}</small>}
              </CCol>

              <CCol md={4}>
                {fieldLabel('PAN')}
                <div style={{ position: 'relative' }}>
                  <FaFileAlt style={fieldIconStyle} />
                  <CFormInput
                    name="vendorPAN"
                    placeholder="10 characters"
                    value={form.vendorPAN}
                    style={{ paddingLeft: '34px' }}
                    className={errors.vendorPAN ? 'error-input' : ''}
                    onChange={handleChange}
                    autoComplete="off"
                    maxLength="10"
                  />
                </div>
                {errors.vendorPAN && <small className="text-danger">{errors.vendorPAN}</small>}
              </CCol>

              <CCol md={4}>
                {fieldLabel('Contact')}
                <div style={{ position: 'relative' }}>
                  <FaPhone style={fieldIconStyle} />
                  <CFormInput
                    name="vendorContact"
                    placeholder="10 to 13 digits"
                    value={form.vendorContact}
                    style={{ paddingLeft: '34px' }}
                    className={errors.vendorContact ? 'error-input' : ''}
                    onChange={handleChange}
                    autoComplete="off"
                    maxLength="13"
                  />
                </div>
                {errors.vendorContact && <small className="text-danger">{errors.vendorContact}</small>}
              </CCol>
            </CRow>

            {/* Address Row */}
            <CRow className="g-3 mt-1" autoComplete="off">
              <CCol md={12}>
                {fieldLabel('Address', false)}
                <div style={{ position: 'relative' }}>
                  <FaMapMarkerAlt style={fieldIconStyle} />
                  <CFormInput
                    name="vendorAddress"
                    placeholder="Full address"
                    value={form.vendorAddress}
                    style={{ paddingLeft: '34px' }}
                    onChange={handleChange}
                    autoComplete="off"
                  />
                </div>
              </CCol>
            </CRow>

            {/* ========== STATUTORY & LICENSE DETAILS ========== */}
            <div
              style={{
                marginTop: '24px',
                marginBottom: '12px',
                padding: '12px 16px',
                background: '#f3f0ff',
                borderRadius: '10px 10px 0 0',
                border: '1px solid #e9e5f5',
                borderBottom: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <FaCog size={16} style={{ color: '#6b4fa1' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#4c1d95' }}>
                Statutory & License Details
              </span>
            </div>

            <div
              style={{
                padding: '16px',
                background: '#fff',
                border: '1px solid #e9e5f5',
                borderTop: 'none',
                borderRadius: '0 0 10px 10px',
                marginBottom: '8px',
              }}
            >
              <CRow className="g-3" autoComplete="off">
                <CCol md={4}>
                  {fieldLabel('ESIC Number', false)}
                  <div style={{ position: 'relative' }}>
                    <FaFileAlt style={fieldIconStyle} />
                    <CFormInput
                      name="vendorESIC"
                      placeholder="Enter ESIC number"
                      value={form.vendorESIC}
                      style={{ paddingLeft: '34px' }}
                      onChange={handleChange}
                      autoComplete="off"
                    />
                  </div>
                </CCol>

                <CCol md={4}>
                  {fieldLabel('Vendor PF Number', false)}
                  <div style={{ position: 'relative' }}>
                    <FaFileAlt style={fieldIconStyle} />
                    <CFormInput
                      name="vendorPF"
                      placeholder="Enter PF number"
                      value={form.vendorPF}
                      style={{ paddingLeft: '34px' }}
                      onChange={handleChange}
                      autoComplete="off"
                    />
                  </div>
                </CCol>

                <CCol md={4}>
                  {fieldLabel('License No.')}
                  <div style={{ position: 'relative' }}>
                    <FaFileAlt style={fieldIconStyle} />
                    <CFormInput
                      name="vendorLicense"
                      placeholder="Enter license number"
                      value={form.vendorLicense}
                      style={{ paddingLeft: '34px' }}
                      className={errors.vendorLicense ? 'error-input' : ''}
                      onChange={handleChange}
                      autoComplete="off"
                    />
                  </div>
                  {errors.vendorLicense && <small className="text-danger">{errors.vendorLicense}</small>}
                </CCol>
              </CRow>
            </div>

            {/* Status Toggle (only in Edit) */}
            {editId && (
              <CRow className="g-3 mt-1">
                <CCol md={4} className="d-flex align-items-end">
                  <div style={{ marginBottom: '2px' }}>
                    {fieldLabel('Status', false)}
                    <div
                      onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
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
                      <span style={{ fontSize: '14px', fontWeight: 600, color: form.isActive ? '#6b4fa1' : '#6b7280' }}>
                        {form.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </CCol>
              </CRow>
            )}

            <div className="form-button-area">
              <CButton className={editId ? 'update-btn' : 'save-btn'} onClick={handleSubmit}>
                <FaSave className="me-2" />
                {editId ? 'UPDATE' : 'SAVE'}
              </CButton>
              <CButton className="clear-btn" onClick={handleClearForm}>
                CLEAR
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
              Add<br />
              Vendor
            </span>
          </div>
        </div>
      )}

      <CCard className="mt-3">
        <CCardBody>
          <div className="table-header">
            <div className="table-title">VENDOR LIST</div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FaSearch style={{ position: 'absolute', left: '12px', color: '#9ca3af', fontSize: '14px', pointerEvents: 'none' }} />
              <CFormInput
                placeholder="Search by Vendor Id, Name or Email..."
                className="search-box"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
              {search && (
                <FaTimes
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '12px', color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}
                />
              )}
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
            noDataComponent={<div style={{ padding: 24, color: '#94a3b8' }}>No results found</div>}
          />
        </CCardBody>
      </CCard>

      {/* DELETE MODAL */}
      <CModal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)} alignment="center" backdrop="static">
        <CModalHeader className="border-0">
          <CModalTitle className="w-100 text-center text-danger fw-bold">⚠ Confirm Delete</CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center">
          <p>Are you sure you want to delete this Vendor?</p>
          <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginTop: '10px' }}>
            <div>
              <strong>Vendor Id :</strong> <span className="text-primary fw-bold">{deleteVendor?.vendorId}</span>
            </div>
            <div className="mt-1">
              <strong>Name :</strong> <span className="text-primary fw-bold">{deleteVendor?.vendorName}</span>
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

      {/* ========== VIEW MODAL (FIXED LAYOUT) ========== */}
      <CModal visible={showViewModal} onClose={() => setShowViewModal(false)} size="lg" alignment="center" backdrop="static">
        <CModalHeader>
          <CModalTitle>
            Vendor Details – {viewData?.vendorId} ({viewData?.vendorName})
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {viewData && (
            <>
              <h6 style={{ fontWeight: 700, marginBottom: '12px', color: '#4e73df' }}>BASIC DETAILS</h6>
              <CRow>
                <ViewRow label="Vendor Id" value={viewData.vendorId} />
                <ViewRow label="Vendor Name" value={viewData.vendorName} />
                <ViewRow label="Email" value={viewData.vendorEmail} />
                <ViewRow label="GSTIN" value={viewData.vendorGSTIN} />
                <ViewRow label="PAN" value={viewData.vendorPAN} />
                <ViewRow label="Contact" value={viewData.vendorContact} />
                <ViewRow label="Status" value={viewData.status === '1' ? 'ACTIVE' : 'INACTIVE'} />
              </CRow>

              {/* Address - Full width so long text doesn't overlap */}
              <CRow>
                <CCol md={12} className="mb-3">
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Address</div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#1f2937',
                      marginTop: '2px',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {viewData.vendorAddress || '-'}
                  </div>
                </CCol>
              </CRow>

              <hr />

              <h6 style={{ fontWeight: 700, marginBottom: '12px', color: '#6b4fa1' }}>
                <FaCog size={14} style={{ marginRight: 6 }} />
                Statutory & License Details
              </h6>
              <CRow>
                <ViewRow label="ESIC Number" value={viewData.vendorESIC} />
                <ViewRow label="Vendor PF Number" value={viewData.vendorPF} />
                <ViewRow label="License No." value={viewData.vendorLicense} />
              </CRow>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default VendorMaster