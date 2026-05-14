// Banner de modo de teste (sandbox Asaas)
const isSandbox = (import.meta.env.MODE !== "production");

export function PaymentTestModeBanner() {
  if (!isSandbox) return null;
  return (
    <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-sm text-orange-800">
      Pagamentos no preview estão em modo de teste (Asaas Sandbox).
    </div>
  );
}
