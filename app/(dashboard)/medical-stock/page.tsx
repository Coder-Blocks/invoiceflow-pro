import MedicalStockClient from "@/components/medical-stock/MedicalStockClient";

type PageProps = {
  searchParams?: Promise<{
    organizationId?: string;
  }>;
};

export default async function MedicalStockPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const initialOrganizationId = params.organizationId?.trim() ?? "";

  return (
    <div className="w-full">
      <MedicalStockClient initialOrganizationId={initialOrganizationId} />
    </div>
  );
}