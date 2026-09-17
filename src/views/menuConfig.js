import { cilPeople, cilEnvelopeClosed, cilUser, cilTruck, cilCalendar, cilLayers, cilChart } from "@coreui/icons";

// For Sidebar Navigation - Masters, Configuration, Settings as separate top-level items
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
    icon: cilChart,
    items: [
      {
        name: "Salary Formula",
        icon: cilChart,
      },
    ],
  },
];

// For Privileges Modal Table - Same structure with 3 groups
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
    icon: cilChart,
    items: [
      {
        name: "Salary Formula",
        icon: cilChart,
      },
    ],
  },
];