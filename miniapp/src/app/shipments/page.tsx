import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/options";
import ShipmentsList from "./ShipmentsList";

export default async function ShipmentsPage() {
  const useMock = process.env.USE_MOCK_DATA === 'true';
  
  if (!useMock) {
    const session = await getServerSession(authOptions);
    if (!session) {
      redirect("/auth/signin");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {useMock && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center text-sm text-yellow-800">
          Demo Mode - Mock data
        </div>
      )}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-bold text-gray-800">Shipments</h1>
        </div>
      </header>
      <main className="p-4">
        <ShipmentsList />
      </main>
    </div>
  );
}