import { Card } from "@/components/ui/card";

export const VehicleGridSkeleton = () => {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden animate-pulse">
          <div className="h-56 bg-gray-200" />
          <div className="p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="grid grid-cols-2 gap-3 pt-4 border-t">
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-20" />
                <div className="h-4 bg-gray-200 rounded w-24" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-20" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
            </div>
            <div className="space-y-2 pt-4 border-t">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-5 bg-gray-200 rounded w-32" />
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <div className="h-9 bg-gray-200 rounded flex-1" />
              <div className="h-9 bg-gray-200 rounded flex-1" />
            </div>
          </div>
        </Card>
      ))}
    </>
  );
};

export const VehicleTableSkeleton = () => {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="py-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-24 bg-gray-200 rounded-xl" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-3 bg-gray-200 rounded w-24" />
              </div>
            </div>
          </td>
          <td>
            <div className="space-y-1">
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-3 bg-gray-200 rounded w-28" />
            </div>
          </td>
          <td>
            <div className="h-4 bg-gray-200 rounded w-32 font-mono" />
          </td>
          <td className="text-right">
            <div className="h-5 bg-gray-200 rounded w-24 ml-auto" />
          </td>
          <td className="text-right">
            <div className="h-4 bg-gray-200 rounded w-20 ml-auto" />
          </td>
          <td className="text-right">
            <div className="h-4 bg-gray-200 rounded w-20 ml-auto" />
          </td>
          <td>
            <div className="h-6 bg-gray-200 rounded w-20" />
          </td>
          <td>
            <div className="flex items-center justify-center gap-1">
              <div className="h-9 w-9 bg-gray-200 rounded-lg" />
              <div className="h-9 w-9 bg-gray-200 rounded-lg" />
              <div className="h-9 w-9 bg-gray-200 rounded-lg" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};
