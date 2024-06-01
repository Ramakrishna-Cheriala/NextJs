"use client";
import { getSubccountTeamMembers } from "@/lib/queries";
import { TicketWithTags } from "@/lib/types";
import { useModal } from "@/providers/model-provider";

import { Contact, Tag, User } from "@prisma/client";
import React, { useEffect, useRef, useState } from "react";

type Props = {
  laneId: string;
  subaccountId: string;
  getNewTicket: (ticket: TicketWithTags[0]) => void;
};

const TicketForm = ({ laneId, subaccountId, getNewTicket }: Props) => {
  const { data: defaultData, setClose } = useModal();
  const [tags, setTags] = useState<Tag[]>([]);
  const [contact, setContact] = useState("");
  const [search, setSearch] = useState("");
  const [contactList, setContactList] = useState<Contact[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [allTeamMembers, setAllTeamMembers] = useState<User[]>([]);
  const [assignedTo, setAssignedTo] = useState(
    defaultData.ticket?.Assigned?.id || ""
  );

  useEffect(() => {
    if (subaccountId) {
      const fetchData = async () => {
        const responce = await getSubccountTeamMembers(subaccountId);
        setAllTeamMembers(responce);
      };
      fetchData();
    }
  }, [subaccountId]);

  return <div>TicketForm</div>;
};

export default TicketForm;
