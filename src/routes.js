import React from 'react'

const Users = React.lazy(() => import('./views/masters/users'))
const MailConfiguration = React.lazy(() => import('./views/Configuration/MailConfiguration'))
const EmployeeMaster = React.lazy(() => import('./views/masters/EmployeeMaster'))
const VendorMaster = React.lazy(() => import('./views/masters/VendorMaster'))
const CalendarMaster = React.lazy(() => import('./views/masters/CalendarMaster'))
const SalaryStructureMaster = React.lazy(() => import('./views/masters/SalaryStructureMaster'))
const SalaryFormulaMaster = React.lazy(() => import('./views/Settings/SalaryFormulaMaster'))
const PayrollMaker = React.lazy(() => import('./views/Transactions/PayrollMaker'))
const PayrollChecker = React.lazy(() => import('./views/Transactions/PayrollChecker'))
const PayrollApprover = React.lazy(() => import('./views/Transactions/PayrollApprover')) // 👈 CHANGED: existing file use chestunnam, kotha placeholder tీసేసా
const Payslip = React.lazy(() => import('./views/Transactions/Payslip'))
const PayrollReport = React.lazy(() => import('./views/reports/report'))

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
  {
    path: '/transactions/payroll-maker',
    name: 'Payroll Maker',
    element: PayrollMaker,
  },
  {
    path: '/transactions/payroll-checker',
    name: 'Payroll Checker',
    element: PayrollChecker,
  },
  {
    path: '/transactions/payroll-approver', // 👈 CHANGED: /transactions/approval nunchi idi ki
    name: 'Payroll Approver', // 👈 CHANGED
    element: PayrollApprover, // 👈 CHANGED
  },
  {
    path: '/transactions/payslip',
    name: 'Payslip Generation',
    element: Payslip,
  },
  {
    path: '/reports/payroll-report',
    name: 'Payroll Report',
    element: PayrollReport,
  },
]

export default routes