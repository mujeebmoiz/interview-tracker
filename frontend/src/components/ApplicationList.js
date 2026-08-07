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
                  {(() => {
                    const raw = app.salary_range.trim();
                    const lower = raw.toLowerCase();

                    const isHourly =
                      lower.includes("/hr") ||
                      lower.includes("hr") ||
                      lower.includes("hour");
                    const isYearly =
                      lower.includes("/yr") ||
                      lower.includes("year") ||
                      lower.includes(",") ||
                      lower.includes("k");

                    const parseNum = (s) => {
                      const clean = s.replace(/[$,\s]/g, "").trim();
                      const hasK = /k$/i.test(clean);
                      const num = parseFloat(clean.replace(/k$/i, ""));
                      if (isNaN(num)) return null;
                      return hasK ? num * 1000 : num;
                    };

                    const formatNum = (n) =>
                      n % 1 === 0
                        ? n.toLocaleString("en-US")
                        : n.toLocaleString("en-US", { minimumFractionDigits: 2 });

                    // Strip leading $ and suffix text to isolate the numeric range
                    const stripped = raw.replace(/^\$/, "").replace(/\/?(hr|yr|hour|year)\w*/gi, "").trim();

                    // Check for range (e.g. 50,000-90,000, 25–30, $130K – $250K)
                    const rangeParts = stripped.split(/\s*[\-–]\s*/);
                    let formatted;
                    if (rangeParts.length === 2) {
                      const lo = parseNum(rangeParts[0]);
                      const hi = parseNum(rangeParts[1]);
                      if (lo !== null && hi !== null) {
                        formatted = `$${formatNum(lo)}-$${formatNum(hi)}`;
                      } else {
                        formatted = `$${stripped}`;
                      }
                    } else {
                      const val = parseNum(stripped);
                      formatted = val !== null ? `$${formatNum(val)}` : `$${stripped}`;
                    }

                    // Determine suffix: if neither keyword present, use value size
                    const firstVal = parseNum(rangeParts[0]);
                    const inferHourly = !isYearly && (isHourly || (firstVal !== null && firstVal < 1000));
                    const suffix = inferHourly ? "/hr" : "/yr";

                    return `${formatted}${suffix}`;
                  })()}
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
