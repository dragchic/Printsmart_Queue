import Image from "next/image";

type WorkerPageHeaderProps = {
  name: string;
  role: string; // "Counter Service Worker" | "Machine Worker"
};

export default function WorkerPageHeader({
  name,
  role,
}: WorkerPageHeaderProps) {
  return (
    <div className="mb-10 flex items-start justify-between">
      
      {/* LEFT SIDE */}
      <div className="flex items-center gap-6">
        
        {/* Logo + tagline */}
        <div>
          <div className="relative h-[70px] w-[260px]">
            <Image
              src="/printsmart-logo.png"
              alt="PrintSmart Logo"
              fill
              className="object-contain object-left"
              priority
            />
          </div>

        </div>

        {/* Divider */}
        <div className="h-[70px] w-px bg-[#E7CACA]" />

        {/* Worker Info */}
        <div>
          <h2 className="text-[20px] font-semibold leading-tight text-black">
            {role}
          </h2>
          <p className="text-[20px] font-medium leading-tight text-black">
            {name}
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="text-right text-[#D91F1F]">
        <div className="text-[20px] font-bold leading-tight">
          Your Every Printing Solution
        </div>
        <div className="text-[20px] font-bold leading-tight">
          Since 2019
        </div>
      </div>
    </div>
  );
}