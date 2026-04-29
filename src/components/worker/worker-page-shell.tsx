type WorkerPageShellProps = {
    children: React.ReactNode;
  };
  
  export default function WorkerPageShell({
    children,
  }: WorkerPageShellProps) {
    return (
      <div
        className="flex min-h-dvh w-full flex-col bg-no-repeat"
        style={{
          backgroundImage: `
            linear-gradient(
              rgb(255, 255, 255, 0.1),
            rgba(255, 146, 146, 0.1)
            ),
            url('/pg-bg.png')
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="flex min-h-dvh w-full flex-1 flex-col">
          {children}
        </div>
      </div>
    );
  }