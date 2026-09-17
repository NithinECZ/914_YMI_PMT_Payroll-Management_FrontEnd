import React from 'react'

const Users = React.lazy(() => import('./views/masters/users'))
const MailConfiguration = React.lazy(() => import('./views/Configuration/MailConfiguration'))
const EmployeeMaster = React.lazy(() => import('./views/masters/EmployeeMaster'))
const VendorMaster = React.lazy(() => import('./views/masters/VendorMaster'))
const CalendarMaster = React.lazy(() => import('./views/masters/CalendarMaster'))
const SalaryStructureMaster = React.lazy(() => import('./views/masters/SalaryStructureMaster'))
const SalaryFormulaMaster = React.lazy(() => import('./views/Settings/SalaryFormulaMaster'))

const routes = [
  {
    path: '/',
    exact: true,
    name: 'Home',
  },
  {
    path: '/masters/users',
    name: 'User Master',
    element: Users,
  },
  {
    path: '/masters/employees',
    name: 'Employee Master',
    element: EmployeeMaster,
  },
  {
    path: '/masters/vendors',
    name: 'Vendor Master',
    element: VendorMaster,
  },
  {
    path: '/masters/calendar',
    name: 'Calendar',
    element: CalendarMaster,
  },
  {
    path: '/masters/salary-structure',
    name: 'Salary Structure',
    element: SalaryStructureMaster,
  },
  {
    path: '/masters/salary-formula',
    name: 'Settings',
    element: SalaryFormulaMaster,
  },
  {
    path: '/masters/mail-configuration',
    name: 'Configuration',
    element: MailConfiguration,
  },
]

export default routes