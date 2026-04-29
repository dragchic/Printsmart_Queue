// components/owner/owner-page-header.tsx
type OwnerPageHeaderProps = {
  title?: string;
};

export default function OwnerPageHeader({
  title = "Management Dashboard",
}: OwnerPageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <h1 className="text-3xl font-semibold leading-tight text-black sm:text-4xl lg:text-[50px]">
        {title}
      </h1>

      <div className="text-left lg:text-right text-[#D91F1F]">
        <div className="text-base font-bold sm:text-xl lg:text-[25px]">
          Your Every Printing Solution
        </div>
        <div className="text-base font-bold sm:text-xl lg:text-[25px]">
          Since 2019
        </div>
      </div>
    </div>
  );
}