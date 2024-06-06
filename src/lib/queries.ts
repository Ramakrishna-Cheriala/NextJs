"use server";

import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";
import { redirect } from "next/navigation";
import {
  Agency,
  User,
  Plan,
  SubAccount,
  Role,
  Prisma,
  Lane,
  Ticket,
  Tag,
} from "@prisma/client";
import { v4 } from "uuid";
import { CreateMediaType, createFunnelFormSchema } from "./types";
import { z } from "zod";

export const getAuthUserDetails = async () => {
  const user = await currentUser();
  if (!user) {
    return;
  }

  const userData = await db.user.findUnique({
    where: {
      email: user.emailAddresses[0].emailAddress,
    },
    include: {
      Agency: {
        include: {
          SidebarOption: true,
          SubAccount: {
            include: {
              SidebarOption: true,
            },
          },
        },
      },
      Permissions: true,
    },
  });

  return userData;
};

export const saveActivityLogsNotification = async ({
  agencyId,
  description,
  subaccountId,
}: {
  agencyId?: string;
  description: string;
  subaccountId?: string;
}) => {
  const authUser = await currentUser();
  let userData;
  if (!authUser) {
    const responce = await db.user.findFirst({
      where: { Agency: { SubAccount: { some: { id: subaccountId } } } },
    });
    if (responce) {
      userData = responce;
    }
  } else {
    userData = await db.user.findUnique({
      where: { email: authUser?.emailAddresses[0].emailAddress },
    });
  }
  if (!userData) {
    console.log("No user Found");
    return;
  }

  let foundAgencyId = agencyId;
  if (!foundAgencyId) {
    if (!subaccountId) {
      throw new Error("You need to provide a agency Id or subaccount Id");
    }
    const responce = await db.subAccount.findUnique({
      where: { id: subaccountId },
    });
    if (responce) foundAgencyId = responce.agencyId;
  }
  if (subaccountId) {
    await db.notification.create({
      data: {
        notification: `${userData.name} | ${description}`,
        User: {
          connect: {
            id: userData.id,
          },
        },
        Agency: {
          connect: {
            id: foundAgencyId,
          },
        },
        SubAccount: {
          connect: { id: subaccountId },
        },
      },
    });
  } else {
    await db.notification.create({
      data: {
        notification: `${userData.name} | ${description}`,
        User: {
          connect: {
            id: userData.id,
          },
        },
        Agency: {
          connect: {
            id: foundAgencyId,
          },
        },
      },
    });
  }
};

export const createTeamUser = async (agencyId: string, user: User) => {
  if (user.role === "AGENCY_OWNER") return null;
  const responce = await db.user.create({ data: { ...user } });
  return responce;
};

export const verifyAndAcceptInvitation = async () => {
  // console.log("--------------in verifyAndAcceptInvitation");
  const user = await currentUser();
  if (!user) return redirect("/sign-in");

  const invitationExists = await db.invitation.findUnique({
    where: { email: user.emailAddresses[0].emailAddress, status: "PENDING" },
  });

  if (invitationExists) {
    const userDetails = await createTeamUser(invitationExists.agencyId, {
      email: invitationExists.email,
      agencyId: invitationExists.agencyId,
      avatarUrl: user.imageUrl,
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      role: invitationExists.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await saveActivityLogsNotification({
      agencyId: invitationExists?.agencyId,
      description: "Joined",
      subaccountId: undefined,
    });
    if (userDetails) {
      await clerkClient.users.updateUserMetadata(user.id, {
        privateMetadata: {
          role: userDetails.role || "SUBACCOUNT_USER",
        },
      });
      await db.invitation.delete({
        where: { email: userDetails.email },
      });

      return userDetails.agencyId;
    } else return null;
  } else {
    const agency = await db.user.findUnique({
      where: {
        email: user.emailAddresses[0].emailAddress,
      },
    });
    return agency ? agency.agencyId : null;
  }
};

export const updateAgencyDetails = async (
  agencyId: string,
  agencyDetails: Partial<Agency>
) => {
  const responce = await db.agency.update({
    where: { id: agencyId },
    data: { ...agencyDetails },
  });
  return responce;
};

export const deleteAgency = async (agencyId: string) => {
  const responce = await db.agency.delete({ where: { id: agencyId } });
  return responce;
};

export const initUser = async (newUser: Partial<User>) => {
  const user = await currentUser();
  if (!user) return;
  const userData = await db.user.upsert({
    where: { email: user.emailAddresses[0].emailAddress },
    update: newUser,
    create: {
      id: user.id,
      avatarUrl: user.imageUrl,
      email: user.emailAddresses[0].emailAddress,
      name: `${user.firstName} ${user.lastName}`,
      role: newUser.role || "SUBACCOUNT_USER",
    },
  });

  await clerkClient.users.updateUserMetadata(user.id, {
    privateMetadata: {
      role: newUser.role || "SUBACCOUNT_USER",
    },
  });

  return userData;
};

export const upsertAgency = async (agency: Agency, price?: Plan) => {
  if (!agency.companyEmail) return null;
  try {
    const agencyDetails = await db.agency.upsert({
      where: {
        id: agency.id,
      },
      update: agency,
      create: {
        users: { connect: { email: agency.companyEmail } },
        ...agency,
        SidebarOption: {
          create: [
            {
              name: "Dashboard",
              icon: "category",
              link: `/agency/${agency.id}`,
            },
            {
              name: "Launchpad",
              icon: "clipboardIcon",
              link: `/agency/${agency.id}/launchpad`,
            },
            {
              name: "Billing",
              icon: "payment",
              link: `/agency/${agency.id}/billing`,
            },
            {
              name: "Settings",
              icon: "settings",
              link: `/agency/${agency.id}/settings`,
            },
            {
              name: "Sub Accounts",
              icon: "person",
              link: `/agency/${agency.id}/all-subaccounts`,
            },
            {
              name: "Team",
              icon: "shield",
              link: `/agency/${agency.id}/team`,
            },
          ],
        },
      },
    });
    return agencyDetails;
  } catch (error) {
    console.log(error);
  }
};

export const getNotificationAndUser = async (agencyId: string) => {
  try {
    const responce = await db.notification.findMany({
      where: { agencyId },
      include: { User: true },
      orderBy: { createdAt: "desc" },
    });
    return responce;
  } catch (error) {
    console.log(error);
  }
};

export const upsertSubAccount = async (subAccount: SubAccount) => {
  if (!subAccount.companyEmail) return null;
  const agencyOwner = await db.user.findFirst({
    where: { Agency: { id: subAccount.agencyId }, role: "AGENCY_OWNER" },
  });
  if (!agencyOwner) return console.log("Error! Could not create sub account");
  const permissionId = v4();
  const responce = await db.subAccount.upsert({
    where: { id: subAccount.id },
    update: subAccount,
    create: {
      ...subAccount,
      Permissions: {
        create: {
          access: true,
          email: agencyOwner.email,
          id: permissionId,
        },
        connect: {
          subAccountId: subAccount.id,
          id: permissionId,
        },
      },
      Pipeline: {
        create: { name: "Lead Cycle" },
      },
      SidebarOption: {
        create: [
          {
            name: "Launchpad",
            icon: "clipboardIcon",
            link: `/subaccount/${subAccount.id}/launchpad`,
          },
          {
            name: "Settings",
            icon: "settings",
            link: `/subaccount/${subAccount.id}/settings`,
          },
          {
            name: "Funnels",
            icon: "pipelines",
            link: `/subaccount/${subAccount.id}/funnels`,
          },
          {
            name: "Media",
            icon: "database",
            link: `/subaccount/${subAccount.id}/media`,
          },
          {
            name: "Automations",
            icon: "chip",
            link: `/subaccount/${subAccount.id}/automations`,
          },
          {
            name: "Pipelines",
            icon: "flag",
            link: `/subaccount/${subAccount.id}/pipelines`,
          },
          {
            name: "Contacts",
            icon: "person",
            link: `/subaccount/${subAccount.id}/contacts`,
          },
          {
            name: "Dashboard",
            icon: "category",
            link: `/subaccount/${subAccount.id}`,
          },
        ],
      },
    },
  });
  return responce;
};

export const getUserPermissions = async (userId: string) => {
  const responce = await db.user.findUnique({
    where: { id: userId },
    select: { Permissions: { include: { SubAccount: true } } },
  });
  return responce;
};

export const updateUser = async (user: Partial<User>) => {
  const response = await db.user.update({
    where: { email: user.email },
    data: { ...user },
  });

  await clerkClient.users.updateUserMetadata(response.id, {
    privateMetadata: {
      role: user.role || "SUBACCOUNT_USER",
    },
  });

  return response;
};

export const changeUserPermissions = async (
  permissionId: string | undefined,
  userEmail: string,
  subAccountId: string,
  permission: boolean
) => {
  try {
    const responce = await db.permissions.upsert({
      where: { id: permissionId },
      update: { access: permission },
      create: {
        access: permission,
        email: userEmail,
        subAccountId: subAccountId,
      },
    });
    return responce;
  } catch (error) {
    console.log("Could not change user permissions, ", error);
  }
};

export const getSubaccountDetails = async (subaccountId: string) => {
  const responce = await db.subAccount.findUnique({
    where: { id: subaccountId },
  });
  return responce;
};

export const deleteSubAccount = async (subaccountId: string) => {
  const responce = await db.subAccount.delete({ where: { id: subaccountId } });
  return responce;
};

export const deleteUser = async (userId: string) => {
  await clerkClient.users.updateUserMetadata(userId, {
    privateMetadata: {
      role: undefined,
    },
  });
  const deletedUser = await db.user.delete({ where: { id: userId } });

  return deletedUser;
};

export const getUser = async (id: string) => {
  const user = await db.user.findUnique({
    where: {
      id,
    },
  });

  return user;
};

export const sendInvitation = async (
  role: Role,
  email: string,
  agencyId: string
) => {
  const resposne = await db.invitation.create({
    data: { email, agencyId, role },
  });

  // Send invitation link via mail
  try {
    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: process.env.NEXT_PUBLIC_URL,
      publicMetadata: {
        throughInvitation: true,
        role,
      },
    });
  } catch (error) {
    console.log(error);
    throw error;
  }

  return resposne;
};

export const getMedia = async (subaccountId: string) => {
  const mediaFiles = db.subAccount.findUnique({
    where: {
      id: subaccountId,
    },
    include: {
      Media: true,
    },
  });
  return mediaFiles;
};

export const createMedia = async (
  subaccountId: string,
  mediaFile: CreateMediaType
) => {
  const responce = await db.media.create({
    data: {
      link: mediaFile.link,
      name: mediaFile.name,
      subAccountId: subaccountId,
    },
  });
  return responce;
};

export const deleteMedia = async (mediaId: string) => {
  const response = await db.media.delete({
    where: {
      id: mediaId,
    },
  });
  return response;
};

export const getPipelineDetails = async (pipelineId: string) => {
  const responce = await db.pipeline.findUnique({
    where: { id: pipelineId },
  });
  return responce;
};

export const getLanesWthTicketAndTags = async (pipelineId: string) => {
  const responce = await db.lane.findMany({
    where: {
      pipelineId,
    },
    orderBy: { order: "asc" },
    include: {
      Tickets: {
        orderBy: { order: "asc" },
        include: {
          Tags: true,
          Assigned: true,
          Customer: true,
        },
      },
    },
  });
  return responce;
};

export const upsertFunnel = async (
  subaccountId: string,
  funnel: z.infer<typeof createFunnelFormSchema> & { liveProducts: string },
  funnelId: string
) => {
  const responce = await db.funnel.upsert({
    where: { id: funnelId },
    update: funnel,
    create: {
      ...funnel,
      id: funnelId || v4(),
      subAccountId: subaccountId,
    },
  });
  return responce;
};

export const upsertPipeline = async (
  pipeline: Prisma.PipelineUncheckedCreateWithoutLaneInput
) => {
  const responce = await db.pipeline.upsert({
    where: { id: pipeline.id || v4() },
    update: pipeline,
    create: pipeline,
  });
  return responce;
};

export const deletePipeline = async (pipelineId: string) => {
  const responce = await db.pipeline.delete({
    where: { id: pipelineId },
  });
  return responce;
};

export const updateLanesOrder = async (lanes: Lane[]) => {
  try {
    const updateTrans = lanes.map((lane: Lane) => {
      return db.lane.update({
        where: { id: lane.id },
        data: { order: lane.order },
      });
    });
    await db.$transaction(updateTrans);
    console.log("Done reordered");
  } catch (err) {
    console.log(err, "Error updating lanes order");
  }
};

export const updateTicketsOrder = async (tickets: Ticket[]) => {
  try {
    const updateTrasns = tickets.map((ticket: Ticket) => {
      return db.ticket.update({
        where: { id: ticket.id },
        data: {
          order: ticket.order,
          laneId: ticket.laneId,
        },
      });
    });
    await db.$transaction(updateTrasns);
    console.log("Done reordered");
  } catch (error) {
    console.log(error, "Error updating tickets order");
  }
};

export const upsertLane = async (lane: Prisma.LaneUncheckedCreateInput) => {
  let order: number;

  if (!lane.order) {
    const lanes = await db.lane.findMany({
      where: {
        pipelineId: lane.pipelineId,
      },
    });
    order = lanes.length;
  } else {
    order = lane.order;
  }

  const responce = db.lane.upsert({
    where: { id: lane.id || v4() },
    update: lane,
    create: { ...lane, order },
  });
  return responce;
};

export const deleteLane = async (laneId: string) => {
  const responce = await db.lane.delete({
    where: { id: laneId },
  });

  return responce;
};

export const getTicketsWithTags = async (pipelineId: string) => {
  const responce = await db.ticket.findMany({
    where: {
      Lane: {
        pipelineId,
      },
    },
    include: { Tags: true, Assigned: true, Customer: true },
  });
  return responce;
};

export const _getTicketsWithAllRelations = async (laneId: string) => {
  const responce = await db.ticket.findMany({
    where: { laneId: laneId },
    include: {
      Assigned: true,
      Customer: true,
      Lane: true,
      Tags: true,
    },
  });
  return responce;
};

export const getSubccountTeamMembers = async (subaccountId: string) => {
  const subaccountUsersWithAccess = await db.user.findMany({
    where: {
      Agency: {
        SubAccount: {
          some: {
            id: subaccountId,
          },
        },
      },
      role: "SUBACCOUNT_USER",
      Permissions: {
        some: {
          subAccountId: subaccountId,
          access: true,
        },
      },
    },
  });
  return subaccountUsersWithAccess;
};

export const searchContacts = async (searchTerms: string) => {
  const response = await db.contact.findMany({
    where: {
      name: {
        contains: searchTerms,
      },
    },
  });
  return response;
};

export const upsertTicket = async (
  ticket: Prisma.TicketUncheckedCreateInput,
  tags: Tag[]
) => {
  let order: number;
  if (!ticket.order) {
    const tickets = await db.ticket.findMany({
      where: { laneId: ticket.laneId },
    });
    order = tickets.length;
  } else {
    order = ticket.order;
  }

  const responce = await db.ticket.upsert({
    where: { id: ticket.id || v4() },
    update: { ...ticket, Tags: { set: tags }, order },
    create: { ...ticket, Tags: { connect: tags }, order },
    include: {
      Assigned: true,
      Customer: true,
      Tags: true,
      Lane: true,
    },
  });
  return responce;
};

export const deleteTicket = async (ticketId: string) => {
  const responce = await db.ticket.delete({
    where: { id: ticketId },
  });
  return responce;
};

export const upsertTag = async (
  subaccountId: string,
  tag: Prisma.TagUncheckedCreateInput
) => {
  const response = await db.tag.upsert({
    where: { id: tag.id || v4(), subAccountId: subaccountId },
    update: tag,
    create: { ...tag, subAccountId: subaccountId },
  });

  return response;
};

export const getTagsForSubaccount = async (subaccountId: string) => {
  const response = await db.subAccount.findUnique({
    where: { id: subaccountId },
    select: { Tags: true },
  });
  return response;
};

export const deleteTag = async (tagId: string) => {
  const response = await db.tag.delete({ where: { id: tagId } });
  return response;
};
