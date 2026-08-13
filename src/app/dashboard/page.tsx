"use client";

import PathSelectionWrapper from "@/components/PathSelectionWrapper";
import AdminDashboard from "./components/AdminDashboard";
import OwnerDashboard from "./components/OwnerDashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import SupervisorDashboard from "./components/SupervisorDashboard";
import OperatorDashboard from "./components/OperatorDashboard";

export default function Dashboard() {
  console.log('reached dashboard');
  return (
    <PathSelectionWrapper
      adminComponent={<AdminDashboard />}
      ownerComponent={<OwnerDashboard />}
      managerComponent={<ManagerDashboard />}
      supervisorComponent={<SupervisorDashboard />}
      operatorComponent={<OperatorDashboard />}
    />
  );
}
