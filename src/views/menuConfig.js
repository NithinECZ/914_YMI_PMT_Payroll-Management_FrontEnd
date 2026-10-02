import { 
  cilPeople, 
  cilEnvelopeClosed, 
  cilUser, 
  cilTruck, 
  cilCalendar, 
  cilLayers, 
  cilChart, 
  cilSettings,
  cilSwapHorizontal,
  cilCheckCircle,
} from "@coreui/icons";

// For Sidebar Navigation - Masters, Transactions, Configuration, Settings, Reports
export const MENU_CONFIG = [
  {
    name: "Masters",
    items: [
      {
        name: "User Master",
        icon: cilUser,
      },
      {
        name: "Employee Master",
        icon: cilPeople,
      },
      {
        name: "Vendor Master",
        icon: cilTruck,
      },
      {
        name: "Calendar",
        icon: cilCalendar,
      },
      {
        name: "Salary Structure",
        icon: cilLayers,
      },
    ],
  },
  {
    name: "Transactions",
    icon: cilSwapHorizontal,
    items: [
      {
        name: "Payroll Maker",
        icon: cilChart,
      },
      {
        name: "Payroll Checker",
        icon: cilChart,
      },
      {
        name: "Payroll Approver", // 👈 CHANGED: Approval nunchi Payroll Approver ki
        icon: cilCheckCircle,
      },
      {
        name: "Payslip Generation",
        icon: cilLayers,
      },
    ],
  },
  {
    name: "Configuration",
    icon: cilEnvelopeClosed,
    items: [
      {
        name: "Mail Configuration",
        icon: cilEnvelopeClosed,
      },
    ],
  },
  {
    name: "Settings",
    icon: cilSettings,
    items: [
      {
        name: "Salary Formula",
        icon: cilChart,
      },
    ],
  },
  {
    name: "Reports",
    icon: cilChart,
    items: [
      {
        name: "Payroll Report",
        icon: cilChart,
      },
    ],
  },
];

// For Privileges Modal Table - Same structure with 5 groups
export const PRIVILEGE_MENU_CONFIG = [
  {
    name: "Masters",
    items: [
      {
        name: "User Master",
        icon: cilUser,
      },
      {
        name: "Employee Master",
        icon: cilPeople,
      },
      {
        name: "Vendor Master",
        icon: cilTruck,
      },
      {
        name: "Calendar",
        icon: cilCalendar,
      },
      {
        name: "Salary Structure",
        icon: cilLayers,
      },
    ],
  },
  {
    name: "Transactions",
    icon: cilSwapHorizontal,
    items: [
      {
        name: "Payroll Maker",
        icon: cilChart,
      },
      {
        name: "Payroll Checker",
        icon: cilChart,
      },
      {
        name: "Payroll Approver", // 👈 CHANGED: Approval nunchi Payroll Approver ki
        icon: cilCheckCircle,
      },
      {
        name: "Payslip Generation",
        icon: cilLayers,
      },
    ],
  },
  {
    name: "Configuration",
    icon: cilEnvelopeClosed,
    items: [
      {
        name: "Mail Configuration",
        icon: cilEnvelopeClosed,
      },
    ],
  },
  {
    name: "Settings",
    icon: cilSettings,
    items: [
      {
        name: "Salary Formula",
        icon: cilChart,
      },
    ],
  },
  {
    name: "Reports",
    icon: cilChart,
    items: [
      {
        name: "Payroll Report",
        icon: cilChart,
      },
    ],
  },
];