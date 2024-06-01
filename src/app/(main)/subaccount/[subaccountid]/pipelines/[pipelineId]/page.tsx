import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/db";
import {
  getLanesWthTicketAndTags,
  getPipelineDetails,
  updateLanesOrder,
  updateTicketsOrder,
} from "@/lib/queries";
import { LaneDetail } from "@/lib/types";
import { redirect } from "next/navigation";
import React from "react";
import PipelineInfoBar from "../_components/pipeline-infobar";
import PipelineSettings from "../_components/pipeline-settings";
import PipelineView from "../_components/pipeline-view";

type Props = {
  params: { subaccountid: string; pipelineId: string };
};

const PipelinePage = async ({ params }: Props) => {
  const pipelineDetails = await getPipelineDetails(params.pipelineId);
  if (!pipelineDetails)
    return redirect(`/subaccount/${params.subaccountid}/pipelines`);

  const pipelines = await db.pipeline.findMany({
    where: { subAccountId: params.subaccountid },
  });

  const lanes = (await getLanesWthTicketAndTags(
    params.pipelineId
  )) as LaneDetail[];
  return (
    <div>
      <Tabs defaultValue="view" className="w-full">
        <TabsList className="bg-transparent border-b-2 h-16 w-full justify-between mb-4">
          <PipelineInfoBar
            pipelineId={params.pipelineId}
            subAccountId={params.subaccountid}
            pipelines={pipelines}
          />
          <div>
            <TabsTrigger value="view">Pipeline View</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </div>
        </TabsList>
        <TabsContent value="view">
          <PipelineView
            lanes={lanes}
            pipelineDetails={pipelineDetails}
            pipelineId={params.pipelineId}
            subaccountId={params.subaccountid}
            updateLanesOrder={updateLanesOrder}
            updateTicketsOrder={updateTicketsOrder}
          />
        </TabsContent>
        <TabsContent value="settings">
          <PipelineSettings
            pipelineId={params.pipelineId}
            subaccountId={params.subaccountid}
            pipelines={pipelines}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PipelinePage;
