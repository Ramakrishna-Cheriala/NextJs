import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import React from "react";

type Props = {
  params: { subaccountid: string };
};

const Pipelines = async ({ params }: Props) => {
  const pipelineExists = await db.pipeline.findFirst({
    where: { subAccountId: params.subaccountid },
  });

  if (pipelineExists)
    return redirect(
      `/subaccount/${params.subaccountid}/pipelines/${pipelineExists.id}`
    );

  try {
    const response = await db.pipeline.create({
      data: { name: "First Pipeline", subAccountId: params.subaccountid },
    });

    return redirect(
      `/subaccount/${params.subaccountid}/pipelines/${response.id}`
    );
  } catch (error) {
    console.log();
  }
};

export default Pipelines;
