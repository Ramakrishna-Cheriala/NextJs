import { AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getAuthUserDetails } from "@/lib/queries";
import { SubAccount } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import DeleteButton from "./_components/delete-button";
import CreateSubAccount from "./_components/create-subaccount-btn";

type Props = {
  params: { agencyId: string };
};

const page = async ({ params }: Props) => {
  const user = await getAuthUserDetails();
  if (!user) return null;
  return (
    <div className="flex flex-col">
      <CreateSubAccount
        user={user}
        id={params.agencyId}
        className="w-[200px] self-end m-6"
      />
      <Command className="rounded-lg bg-transparent">
        <CommandInput placeholder="Search Accounts..." />
        <CommandList>
          <CommandEmpty>No Results Found.</CommandEmpty>
          <CommandGroup heading="Sub Accounts">
            {!!user.Agency?.SubAccount.length ? (
              user.Agency.SubAccount.map((subaccount: SubAccount) => (
                <CommandItem
                  key={subaccount.id}
                  className="h-32 !bg-background my-2 text-primary border-[1px] border-border p-4 rounded-lg hover:!bg-background cursor-pointer transition-all"
                >
                  <Link
                    href={`/subaccount/${subaccount.id}`}
                    className="flex gap-4 w-full h-full"
                  >
                    <div className="relative w-32">
                      <Image
                        src={subaccount.subAccountLogo}
                        alt="subaccount logo"
                        fill
                        className="rounded-md object-contain bg-muted/50 p-4"
                      />
                    </div>
                    <div className="flex flex-col justify-between">
                      <div className="flex flex-col">
                        {subaccount.name}
                        <span className="text-muted-foreground text-xs">
                          {subaccount.address}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size={"sm"}
                        variant={"destructive"}
                        className="bg-red-500 w-20 text-gray-300 hover:bg-red-600 hover:text-white"
                      >
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-left">
                          Are you absolutely sure
                        </AlertDialogTitle>
                        <AlertDescription className="text-left">
                          This action cannot be undone. This will delete the
                          subaccount and all data related to the subaccount.
                        </AlertDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="mb-2">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive">
                          <DeleteButton subaccountId={subaccount.id} />
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CommandItem>
              ))
            ) : (
              <div className="text-muted-foreground text-center p-4">
                No SubAccounts
              </div>
            )}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
};

export default page;
