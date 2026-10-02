import { useEffect, useState } from "react";
import API from "../../api";

const usePrivilege = () => {
  const [privileges, setPrivileges] = useState([]);

  useEffect(() => {
    loadPrivileges();

    window.addEventListener("privilegesUpdated", loadPrivileges);
    return () => window.removeEventListener("privilegesUpdated", loadPrivileges);
  }, []);

  const loadPrivileges = async () => {
    const user = JSON.parse(sessionStorage.getItem("user"));

    if (!user?.id) return;

    // 👇 FIXED: was /Employee/privileges (TSMS endpoint) — this project uses /UserMaster
    const res = await API.get(`/UserMaster/privileges/${user.id}`);

    setPrivileges(res.data || []);
  };

  const canView = (menu) => {
    try {
      const user = JSON.parse(sessionStorage.getItem("user"));
      if (user?.userType === "SUPER ADMIN") return true;
    } catch {}
    return privileges.some((p) => p.menuName === menu && p.canView);
  };

  const canEdit = (menu) => {
    try {
      const user = JSON.parse(sessionStorage.getItem("user"));
      if (user?.userType === "SUPER ADMIN") return true;
    } catch {}
    return privileges.some((p) => p.menuName === menu && p.canEdit);
  };

  const canDelete = (menu) => {
    try {
      const user = JSON.parse(sessionStorage.getItem("user"));
      if (user?.userType === "SUPER ADMIN") return true;
    } catch {}
    return privileges.some((p) => p.menuName === menu && p.canDelete);
  };

  return {
    privileges,
    canView,
    canEdit,
    canDelete,
  };
};

export default usePrivilege;