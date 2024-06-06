import { getAuthUserDetails } from "@/lib/queries";
import React, { useEffect } from "react";
import MenuOptions from "./menu-options";
import { headers } from "next/headers";

type Props = {
  id: string;
  type: "agency" | "subaccount";
};

const Sidebar = async ({ id, type }: Props) => {
  const headerList = headers();
  const currentPath = headerList.get("x-custom-path");
  console.log("Current Path from Headers:", currentPath);
  const user = await getAuthUserDetails();
  if (!user) return null;

  if (!user.Agency) return;

  const details =
    type === "agency"
      ? user?.Agency
      : user?.Agency.SubAccount.find((subaccount) => subaccount.id === id);

  const isWhiteLabeledAgency = user?.Agency.whiteLabel;
  if (!details) return;

  let sideBarLogo = user.Agency.agencyLogo || "/assets/plura-logo.svg";

  if (!isWhiteLabeledAgency) {
    if (type === "subaccount") {
      sideBarLogo =
        user?.Agency.SubAccount.find((subaccount) => subaccount.id === id)
          ?.subAccountLogo || user.Agency.agencyLogo;
    }
  }

  const sidebarOpt =
    type === "agency"
      ? user.Agency.SidebarOption || []
      : user.Agency.SubAccount.find((subaccount) => subaccount.id === id)
          ?.SidebarOption || [];

  const subaccounts = user.Agency.SubAccount.filter((subaccount) => {
    return user.Permissions.find((permission) => {
      return permission.subAccountId === subaccount.id && permission.access;
    });
  });

  return (
    <div>
      <MenuOptions
        defaultOpen={true}
        details={details}
        id={id}
        sidebarLogo={sideBarLogo}
        sidebarOpt={sidebarOpt}
        subAccounts={subaccounts}
        user={user}
      />
      <MenuOptions
        details={details}
        id={id}
        sidebarLogo={sideBarLogo}
        sidebarOpt={sidebarOpt}
        subAccounts={subaccounts}
        user={user}
      />
    </div>
  );
};

export default Sidebar;
