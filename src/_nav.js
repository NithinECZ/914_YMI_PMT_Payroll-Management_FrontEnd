import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilUser,
  cilBuilding,
  cilLayers,
  cilChart,
  cilEnvelopeClosed,
  cilPeople,
  cilTruck,
  cilCalendar,
  cilSettings,
  cilSwapHorizontal,
  cilCheckCircle,
} from '@coreui/icons'
import { CNavGroup, CNavItem } from '@coreui/react'

const _nav = [
  {
    component: CNavGroup,
    name: 'Masters',
    icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'User Master',
        to: '/masters/users',
        icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Employee Master',
        to: '/masters/employees',
        icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Vendor Master',
        to: '/masters/vendors',
        icon: <CIcon icon={cilTruck} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Calendar',
        to: '/masters/calendar',
        icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Salary Structure',
        to: '/masters/salary-structure',
        icon: <CIcon icon={cilLayers} customClassName="nav-icon" />,
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Transactions',
    icon: <CIcon icon={cilSwapHorizontal} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Payroll Maker',
        to: '/transactions/payroll-maker',
        icon: <CIcon icon={cilChart} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Payroll Checker',
        to: '/transactions/payroll-checker',
        icon: <CIcon icon={cilChart} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Payroll Approver', // 👈 CHANGED: Approval nunchi Payroll Approver ki, Checker kindha
        to: '/transactions/payroll-approver', // 👈 CHANGED
        icon: <CIcon icon={cilCheckCircle} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Payslip Generation',
        to: '/transactions/payslip',
        icon: <CIcon icon={cilLayers} customClassName="nav-icon" />,
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Configuration',
    to: '/masters/mail-configuration',
    icon: <CIcon icon={cilEnvelopeClosed} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Settings',
    to: '/masters/salary-formula',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Reports',
    icon: <CIcon icon={cilChart} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Payroll Report',
        to: '/reports/payroll-report',
        icon: <CIcon icon={cilChart} customClassName="nav-icon" />,
      },
    ],
  },
]

export default _nav