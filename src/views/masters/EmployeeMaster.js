import React, { useEffect, useState, useRef, useMemo } from 'react'
import DataTable from 'react-data-table-component'
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

const DisabledFieldWrapper = ({ children, disabled = true }) => (
  <div style={{ position: 'relative', opacity: disabled ? 0.6 : 1 }} title={disabled ? 'This field is not editable' : ''}>
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

const EmployeeMaster = () => {
  const deleteBtnRef = useRef()
  const [employees, setEmployees] = useState([])
  const [vendors, setVendors] = useState([])
  const [maritalOptions, setMaritalOptions] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [deleteEmployee, setDeleteEmployee] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewData, setViewData] = useState(null)
  const [activeCardFilter, setActiveCardFilter] = useState('ALL')
  const [vendorError, setVendorError] = useState('')
  const [openVendor, setOpenVendor] = useState(false)
  const [expandedSections, setExpandedSections] = useState({ additionalDetails: true })

  const { canEdit } = usePrivilege()
  const canEditEmployee = canEdit('Employee Master')

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.custom-select-wrapper')) {
        setOpenVendor(false)
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

  const handleSubmit = async () => {
    if (!editId) return
    if (!form.vendorId?.trim()) {
      setVendorError('Vendor is required')
      toast.error('Vendor is required')
      return
    }

    const loggedInUser = getLoggedInUser()
    const payload = {
      vendorId: form.vendorId.trim(),
      vendor: form.vendor.trim(),
      status: form.status,
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

  const handleEdit = async (row) => {
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
        expYrs: emp.expYrs || '',
        fatherNm: emp.fatherNm || '',
        nation: emp.nation || '',
        status: emp.status || '1',
      })
      setVendorError('')
      setOpenVendor(false)
      setExpandedSections({ additionalDetails: true })
      await loadVendors()
      await loadMaritalStatus()
      setShowForm(true)
    } catch {
      toast.error('Failed to load employee')
    }
  }

  const handleView = async (row) => {
    try {
      const res = await API.get(`/EmployeeMaster/${row.id}`)
      setViewData(res.data)
      setShowViewModal(true)
    } catch {
      toast.error('Failed to load employee details')
    }
  }

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
    setOpenVendor(false)
    setExpandedSections({ additionalDetails: true })
  }

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleCardClick = (filterValue) => {
    if (!filterValue) return
    setActiveCardFilter((prev) => (prev === filterValue ? 'ALL' : filterValue))
  }

  const filtered = useMemo(() => {
    let rows = employees
    if (activeCardFilter === 'Active') rows = rows.filter((e) => e.status === '1')
    else if (activeCardFilter === 'Inactive') rows = rows.filter((e) => e.status !== '1')

    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (e) =>
        (e.empId || '').toLowerCase().includes(q) ||
        (e.empNm || '').toLowerCase().includes(q) ||
        (e.emailId || '').toLowerCase().includes(q)
    )
  }, [employees, search, activeCardFilter])

  const stats = useMemo(() => {
    const total = employees.length
    const active = employees.filter((e) => e.status === '1').length
    return { totalEmployees: total, activeEmployees: active, inactiveEmployees: total - active }
  }, [employees])

  const columns = [
    { name: 'S.No', selector: (_, i) => i + 1, width: '70px' },
    { name: 'Employee ID', selector: (row) => row.empId, sortable: true },
    { name: 'Employee Name', selector: (row) => row.empNm, sortable: true },
    { name: 'Department', selector: (row) => row.deptNm },
    { name: 'Email', selector: (row) => row.emailId },
    { name: 'Phone', selector: (row) => row.phoneNo },
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
  ]

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

  const ViewRow = ({ label, value }) => (
    <CCol md={4} className="mb-3">
      <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937', marginTop: '2px', wordBreak: 'break-word' }}>
        {value || '-'}
      </div>
    </CCol>
  )

  // Helper to show Code | Name
  const displayCodeName = (code, name) => {
    if (code && name) return `${code} | ${name}`
    return name || code || ''
  }

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
              <CCol md={3}>
                {fieldLabel('Employee ID')}
                <div style={{ position: 'relative' }}>
                  <FaIdBadge style={fieldIconStyle} />
                  <DisabledFieldWrapper>
                    <CFormInput value={form.empId} disabled style={{ paddingLeft: '34px' }} />
                  </DisabledFieldWrapper>
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Employee Name')}
                <div style={{ position: 'relative' }}>
                  <FaUser style={fieldIconStyle} />
                  <DisabledFieldWrapper>
                    <CFormInput value={form.empNm} disabled style={{ paddingLeft: '34px' }} />
                  </DisabledFieldWrapper>
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Gender')}
                <div style={{ position: 'relative' }}>
                  <FaUser style={fieldIconStyle} />
                  <DisabledFieldWrapper>
                    <CFormInput value={form.gender} disabled style={{ paddingLeft: '34px' }} />
                  </DisabledFieldWrapper>
                </div>
              </CCol>

              {/* Vendor Dropdown */}
              <CCol md={3}>
                {fieldLabel('Vendor', true)}
                <div className="custom-select-wrapper" style={{ position: 'relative' }}>
                  <FaBuilding style={fieldIconStyle} />
                  <div
                    className={`custom-select-trigger ${!form.vendorId ? 'custom-select-placeholder' : ''} ${vendorError ? 'error' : ''} ${openVendor ? 'open' : ''}`}
                    onClick={() => setOpenVendor(!openVendor)}
                    style={{ paddingLeft: '34px' }}
                  >
                    <span>{form.vendorId && form.vendor ? `${form.vendorId} | ${form.vendor}` : 'Select Vendor'}</span>
                    <span className="custom-select-arrow">▼</span>
                  </div>
                  <div className={`custom-select-dropdown ${openVendor ? 'open' : ''}`}>
                    {vendors.length === 0 ? (
                      <div className="custom-select-option" style={{ color: '#9ca3af' }}>No vendors found</div>
                    ) : (
                      vendors.map((v) => (
                        <div
                          key={v.vendorId}
                          className={`custom-select-option ${form.vendorId === v.vendorId ? 'selected' : ''}`}
                          onClick={() => {
                            setForm((prev) => ({ ...prev, vendorId: v.vendorId, vendor: v.vendorName }))
                            setVendorError('')
                            setOpenVendor(false)
                          }}
                        >
                          {v.vendorId} | {v.vendorName}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {vendorError && <small className="text-danger">{vendorError}</small>}
              </CCol>

              {/* Employee Category - Code | Name */}
              <CCol md={3}>
                {fieldLabel('Employee Category')}
                <div style={{ position: 'relative' }}>
                  <FaUserTag style={fieldIconStyle} />
                  <DisabledFieldWrapper>
                    <CFormInput value={displayCodeName(form.ctgCode, form.empCat)} disabled style={{ paddingLeft: '34px' }} />
                  </DisabledFieldWrapper>
                </div>
              </CCol>

              {/* Department - Code | Name */}
              <CCol md={3}>
                {fieldLabel('Department')}
                <div style={{ position: 'relative' }}>
                  <FaBuilding style={fieldIconStyle} />
                  <DisabledFieldWrapper>
                    <CFormInput value={displayCodeName(form.deptCode, form.deptNm)} disabled style={{ paddingLeft: '34px' }} />
                  </DisabledFieldWrapper>
                </div>
              </CCol>

              {/* Sub Division - Code | Name */}
              <CCol md={3}>
                {fieldLabel('Sub Division')}
                <div style={{ position: 'relative' }}>
                  <FaBuilding style={fieldIconStyle} />
                  <DisabledFieldWrapper>
                    <CFormInput value={displayCodeName(form.secCode, form.subDiv)} disabled style={{ paddingLeft: '34px' }} />
                  </DisabledFieldWrapper>
                </div>
              </CCol>

              {/* Skill Category - Code | Name */}
              <CCol md={3}>
                {fieldLabel('Skill Category')}
                <div style={{ position: 'relative' }}>
                  <FaUserTag style={fieldIconStyle} />
                  <DisabledFieldWrapper>
                    <CFormInput value={displayCodeName(form.grdCode, form.skillCat)} disabled style={{ paddingLeft: '34px' }} />
                  </DisabledFieldWrapper>
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Date of Joining')}
                <div style={{ position: 'relative' }}>
                  <FaCalendarAlt style={fieldIconStyle} />
                  <DisabledFieldWrapper>
                    <CFormInput type="date" value={form.doj} disabled style={{ paddingLeft: '34px' }} />
                  </DisabledFieldWrapper>
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Date of Leaving')}
                <div style={{ position: 'relative' }}>
                  <FaCalendarAlt style={fieldIconStyle} />
                  <DisabledFieldWrapper>
                    <CFormInput type="date" value={form.dol} disabled style={{ paddingLeft: '34px' }} />
                  </DisabledFieldWrapper>
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Email ID')}
                <div style={{ position: 'relative' }}>
                  <FaEnvelope style={fieldIconStyle} />
                  <DisabledFieldWrapper>
                    <CFormInput value={form.emailId} disabled style={{ paddingLeft: '34px' }} />
                  </DisabledFieldWrapper>
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('Phone No')}
                <div style={{ position: 'relative' }}>
                  <FaPhone style={fieldIconStyle} />
                  <DisabledFieldWrapper>
                    <CFormInput value={form.phoneNo} disabled style={{ paddingLeft: '34px' }} />
                  </DisabledFieldWrapper>
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('UAN No')}
                <div style={{ position: 'relative' }}>
                  <FaFileAlt style={fieldIconStyle} />
                  <DisabledFieldWrapper>
                    <CFormInput value={form.uanNo} disabled style={{ paddingLeft: '34px' }} />
                  </DisabledFieldWrapper>
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('PF Number')}
                <div style={{ position: 'relative' }}>
                  <FaFileAlt style={fieldIconStyle} />
                  <DisabledFieldWrapper>
                    <CFormInput value={form.pfNo} disabled style={{ paddingLeft: '34px' }} />
                  </DisabledFieldWrapper>
                </div>
              </CCol>

              <CCol md={3}>
                {fieldLabel('ESI Number')}
                <div style={{ position: 'relative' }}>
                  <FaFileAlt style={fieldIconStyle} />
                  <DisabledFieldWrapper>
                    <CFormInput value={form.esiNo} disabled style={{ paddingLeft: '34px' }} />
                  </DisabledFieldWrapper>
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
                    <DisabledFieldWrapper>
                      <CFormInput value={form.permAdd1} disabled style={{ paddingLeft: '34px' }} />
                    </DisabledFieldWrapper>
                  </div>
                </CCol>
                <CCol md={6}>
                  {fieldLabel('Address Line 2', false)}
                  <div style={{ position: 'relative' }}>
                    <FaMapMarkerAlt style={fieldIconStyle} />
                    <DisabledFieldWrapper>
                      <CFormInput value={form.permAdd2} disabled style={{ paddingLeft: '34px' }} />
                    </DisabledFieldWrapper>
                  </div>
                </CCol>
                <CCol md={6}>
                  {fieldLabel('Street')}
                  <div style={{ position: 'relative' }}>
                    <FaMapMarkerAlt style={fieldIconStyle} />
                    <DisabledFieldWrapper>
                      <CFormInput value={form.permStr} disabled style={{ paddingLeft: '34px' }} />
                    </DisabledFieldWrapper>
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('City')}
                  <div style={{ position: 'relative' }}>
                    <FaMapMarkerAlt style={fieldIconStyle} />
                    <DisabledFieldWrapper>
                      <CFormInput value={form.permCity} disabled style={{ paddingLeft: '34px' }} />
                    </DisabledFieldWrapper>
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('PIN')}
                  <div style={{ position: 'relative' }}>
                    <FaMapMarkerAlt style={fieldIconStyle} />
                    <DisabledFieldWrapper>
                      <CFormInput value={form.permPIN} disabled style={{ paddingLeft: '34px' }} />
                    </DisabledFieldWrapper>
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('State')}
                  <div style={{ position: 'relative' }}>
                    <FaMapMarkerAlt style={fieldIconStyle} />
                    <DisabledFieldWrapper>
                      <CFormInput value={form.permState} disabled style={{ paddingLeft: '34px' }} />
                    </DisabledFieldWrapper>
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('Country')}
                  <div style={{ position: 'relative' }}>
                    <FaMapMarkerAlt style={fieldIconStyle} />
                    <DisabledFieldWrapper>
                      <CFormInput value={form.permCntry} disabled style={{ paddingLeft: '34px' }} />
                    </DisabledFieldWrapper>
                  </div>
                </CCol>

                <CCol md={3}>
                  {fieldLabel('Marital Status')}
                  <div style={{ position: 'relative' }}>
                    <FaUser style={fieldIconStyle} />
                    <DisabledFieldWrapper>
                      <CFormSelect value={form.marital} disabled style={{ paddingLeft: '34px' }}>
                        <option value="">Select</option>
                        {maritalOptions.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </CFormSelect>
                    </DisabledFieldWrapper>
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('Date of Birth')}
                  <div style={{ position: 'relative' }}>
                    <FaCalendarAlt style={fieldIconStyle} />
                    <DisabledFieldWrapper>
                      <CFormInput type="date" value={form.dob} disabled style={{ paddingLeft: '34px' }} />
                    </DisabledFieldWrapper>
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('Aadhar Number')}
                  <div style={{ position: 'relative' }}>
                    <FaFileAlt style={fieldIconStyle} />
                    <DisabledFieldWrapper>
                      <CFormInput value={form.aadharNo} disabled style={{ paddingLeft: '34px' }} />
                    </DisabledFieldWrapper>
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('PAN Number')}
                  <div style={{ position: 'relative' }}>
                    <FaFileAlt style={fieldIconStyle} />
                    <DisabledFieldWrapper>
                      <CFormInput value={form.panNo} disabled style={{ paddingLeft: '34px' }} />
                    </DisabledFieldWrapper>
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('Qualification')}
                  <div style={{ position: 'relative' }}>
                    <FaFileAlt style={fieldIconStyle} />
                    <DisabledFieldWrapper>
                      <CFormInput value={form.qualify} disabled style={{ paddingLeft: '34px' }} />
                    </DisabledFieldWrapper>
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('Experience (Years)')}
                  <div style={{ position: 'relative' }}>
                    <FaUser style={fieldIconStyle} />
                    <DisabledFieldWrapper>
                      <CFormInput value={form.expYrs} disabled style={{ paddingLeft: '34px' }} />
                    </DisabledFieldWrapper>
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('Father Name')}
                  <div style={{ position: 'relative' }}>
                    <FaUser style={fieldIconStyle} />
                    <DisabledFieldWrapper>
                      <CFormInput value={form.fatherNm} disabled style={{ paddingLeft: '34px' }} />
                    </DisabledFieldWrapper>
                  </div>
                </CCol>
                <CCol md={3}>
                  {fieldLabel('Nationality')}
                  <div style={{ position: 'relative' }}>
                    <FaUser style={fieldIconStyle} />
                    <DisabledFieldWrapper>
                      <CFormInput value={form.nation} disabled style={{ paddingLeft: '34px' }} />
                    </DisabledFieldWrapper>
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
        </div>
      )}

      <CCard className="mt-3">
        <CCardBody>
          <div className="table-header">
            <div className="table-title">EMPLOYEE LIST</div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FaSearch style={{ position: 'absolute', left: '12px', color: '#9ca3af', fontSize: '14px', pointerEvents: 'none' }} />
              <CFormInput
                placeholder="Search by Employee ID, Name or Email..."
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

      <CModal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)} alignment="center" backdrop="static">
        <CModalHeader className="border-0">
          <CModalTitle className="w-100 text-center text-danger fw-bold">⚠ Confirm Delete</CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center">
          <p>Are you sure you want to delete this Employee?</p>
          <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginTop: '10px' }}>
            <div><strong>Employee ID :</strong> <span className="text-primary fw-bold">{deleteEmployee?.empId}</span></div>
            <div className="mt-1"><strong>Name :</strong> <span className="text-primary fw-bold">{deleteEmployee?.empNm}</span></div>
          </div>
        </CModalBody>
        <CModalFooter className="border-0 d-flex justify-content-center">
          <CButton color="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</CButton>
          <CButton color="danger" ref={deleteBtnRef} onClick={confirmDelete}>Delete</CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={showViewModal} onClose={() => setShowViewModal(false)} size="xl" alignment="center" backdrop="static">
        <CModalHeader>
          <CModalTitle>Employee Details – {viewData?.empId} ({viewData?.empNm})</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {viewData && (
            <>
              <h6 style={{ fontWeight: 700, marginBottom: '12px', color: '#4e73df' }}>BASIC DETAILS</h6>
              <CRow>
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
              </CRow>
              <hr />
              <h6 style={{ fontWeight: 700, marginBottom: '12px', color: '#4e73df' }}>ADDITIONAL DETAILS</h6>
              <CRow>
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
              </CRow>
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