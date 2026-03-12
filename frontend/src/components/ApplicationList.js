import { Link } from "react-router-dom";

function ApplicationList({ applications, onSelect }) {
  const STATUS_COLORS = {
    APPLIED: "#3b82f6",
    INTERVIEW: "#f59e0b",
    OA: "#8b5cf6",
    OFFER: "#10b981",
    REJECTED: "#ef4444",
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {applications.map((app) => (
        <div
          key={app.id}
          onClick={() => onSelect(app)}
          className="bg-white p-6 rounded-2xl shadow hover:shadow-xl hover:scale-[1.02] transition cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold">{app.job_title}</h3>
              <p className="text-gray-600">{app.company_name}</p>
            </div>

            {/* Right Side: Location + Salary stacked */}
            <div className="text-right">
              {app.location && (
                <p className="text-sm text-gray-400">{app.location}</p>
              )}

              {app.salary_range && (
                <p className="text-sm font-medium text-gray-700 mt-1">
                  {app.salary_range}
                </p>
              )}
            </div>
          </div>

          {/* Notes spaced nicely below */}
          {app.notes && <p className="mt-4 text-gray-700">{app.notes}</p>}

          {/* Bottom Section */}
          <div className="mt-6 flex justify-between items-center">
            <span
              className="text-sm px-4 py-1 rounded-full text-white font-medium"
              style={{
                backgroundColor: STATUS_COLORS[app.status] || "#d1d5db",
              }}
            >
              {app.status}
            </span>
         

            <span className="text-sm text-gray-400">
              {app.application_date}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
export default ApplicationList;
