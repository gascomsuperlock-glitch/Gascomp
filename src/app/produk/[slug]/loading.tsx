export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse bg-[#f8f6f0]">
      <div className="h-[68px] border-b border-[#2c3038]/8 bg-white" />
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="h-[360px] rounded-[30px] bg-white" />
        <div className="mt-12 h-64 rounded-[28px] bg-white" />
      </div>
    </div>
  );
}
