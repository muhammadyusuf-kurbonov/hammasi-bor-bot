import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">Shipment Tracking</h1>
        <p className="text-gray-600 mb-8">Track your orders and shipments easily</p>
        <Link 
          href="/shipments" 
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          View Shipments
        </Link>
      </div>
    </div>
  );
}