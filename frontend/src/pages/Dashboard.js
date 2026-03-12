import { useEffect, useState } from "react";
import api from "../api/axios";
import StatsCard from "../components/StatsCard";
import StatusPieChart from "../components/StatusPieChart";
import ApplicationList from "../components/ApplicationList";
import AddApplicationModal from "../components/AddApplicationModal";
import ApplicationDetailModal from "../components/ApplicationDetailModal";

function Dashboard({ setIsAuthenticated }) {
  const [applications, setApplications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await api.get("applications/");
      setApplications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Interview Tracker</h1>

          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition"
          >
            Logout
          </button>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <StatsCard applications={applications} />
          <StatusPieChart applications={applications} />
        </div>

        
        <div className="flex justify-center mb-10">
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl shadow-lg hover:bg-blue-700 hover:scale-105 transition-all duration-200"
          >
            + Add Application
          </button>
        </div>

        {/* Applications List */}
        <ApplicationList
          applications={applications}
          onSelect={setSelectedApp}
        />

        {/* Add Modal */}
        {showModal && (
          <AddApplicationModal
            onClose={() => setShowModal(false)}
            refresh={fetchApplications}
          />
        )}

        {/* Detail Modal */}
        {selectedApp && (
          <ApplicationDetailModal
            application={selectedApp}
            onClose={() => setSelectedApp(null)}
            refresh={fetchApplications}
          />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
