"use client";

import PathSelectionWrapper from "@/components/PathSelectionWrapper";
import AccountPage from "@/components/AccountPage";

export default function AccountRouterPage() {
  return (
    <PathSelectionWrapper
      adminComponent={<AccountPage allowedRole="ADMIN" />}
      ownerComponent={<AccountPage allowedRole="OWNER" />}
      managerComponent={<AccountPage allowedRole="MANAGER" />}
      supervisorComponent={<AccountPage allowedRole="SUPERVISOR" />}
      operatorComponent={<AccountPage allowedRole="OPERATOR" />}
    />
  );
}
