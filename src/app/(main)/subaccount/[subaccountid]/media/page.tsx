import BlurPage from "@/components/global/blur-page";
import MediaComponent from "@/components/media";
import { getMedia } from "@/lib/queries";
import React from "react";

type Props = {
  params: { subaccountid: string };
};

const MediaPage = async ({ params }: Props) => {
  const data = await getMedia(params.subaccountid);

  return (
    <BlurPage>
      <MediaComponent data={data} subaccountId={params.subaccountid} />
    </BlurPage>
  );
};

export default MediaPage;
