function StatsCard({ applications }) {
  const total = applications.length;
  const offers = applications.filter((app) => app.status === "OFFER").length;
  const interviews = applications.filter(
    (app) => app.status === "INTERVIEW",
  ).length;
  const rejections = applications.filter(
    (app) => app.status === "REJECTED",
  ).length;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Overview</h3>

      <div className="space-y-2">
        <p>
          Total Applications: <span className="font-bold">{total}</span>
        </p>
        <p>
          Interviews: <span className="font-bold ">{interviews}</span>
        </p>
        <p>
          Rejections: <span className="font-bold text-red-600">{rejections}</span>
        </p>
        <p>
          Offers: <span className="font-bold text-green-600">{offers}</span>
        </p>
      </div>
    </div>
  );
}

export default StatsCard;
