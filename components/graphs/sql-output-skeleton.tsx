import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemMessage } from "./message";

export function SqlOutputSkeleton() {
  return (
    <>
      <SystemMessage>
        <Skeleton className='w-1/2' />
      </SystemMessage>
      <Separator className='my-4' />
    </>
  )
}