import { prisma } from "@/lib/prisma";

/**
 * Shared query for fetching active production lists with items.
 * Used by hotpress, peeling, dryer, and finishing routes.
 * Centralized to ensure consistent field selection and ordering.
 */
export function activeProductionListsQuery(companyId: string) {
  return prisma.productionList.findMany({
    where: { companyId, status: { not: "COMPLETED" } },
    include: {
      order: { select: { orderNumber: true, customer: { select: { name: true } } } },
      items: {
        include: {
          category: { select: { id: true, name: true, sortOrder: true } },
          thickness: { select: { id: true, value: true } },
          size: { select: { id: true, label: true, length: true, width: true } },
        },
        orderBy: [
          { category: { sortOrder: "desc" } },
          { thickness: { value: "desc" } },
          { size: { length: "desc" } },
          { size: { width: "desc" } },
        ],
      },
    },
    orderBy: { priority: "asc" },
  });
}
