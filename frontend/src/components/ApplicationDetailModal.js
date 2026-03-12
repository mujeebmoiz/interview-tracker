import { useState } from "react";
import api from "../api/axios";

function ApplicationDetailModal({ application, onClose, refresh }) {
  const [form, setForm] = useState(application);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    await api.patch(`applications/${application.id}/`, form);
    refresh();
    onClose();
  };

  const handleDelete = async () => {
    await api.delete(`applications/${application.id}/`);
    refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="relative bg-white p-8 rounded-2xl shadow-xl w-[450px]">
        {application.url && (
          <a
            href={application.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 transition"
            title="Open Job Posting"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 3h7m0 0v7m0-7L10 14"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5v14h14"
              />
            </svg>
          </a>
        )}
        <h2 className="text-xl font-bold mb-6">Edit Application</h2>

        <form onSubmit={handleUpdate} className="space-y-4">
          <input
            name="company_name"
            value={form.company_name}
            onChange={handleChange}
            placeholder="Company Name"
            className="w-full border p-3 rounded-lg"
          />

          <input
            name="job_title"
            value={form.job_title}
            onChange={handleChange}
            placeholder="Job Title"
            className="w-full border p-3 rounded-lg"
          />

          <input
            type="date"
            name="application_date"
            value={form.application_date}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
          />
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Location"
            className="w-full border p-3 rounded-lg"
          />
          <input
            name="salary_range"
            value={form.salary_range}
            onChange={handleChange}
            placeholder="Salary"
            className="w-full border p-3 rounded-lg"
          />
          <input
            name="url"
            value={form.url}
            onChange={handleChange}
            placeholder="URL"
            className="w-full border p-3 rounded-lg"
          />

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
          >
            <option value="APPLIED">Applied</option>
            <option value="OA">OA</option>
            <option value="INTERVIEW">Interview</option>
            <option value="OFFER">Offer</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <textarea
            name="notes"
            value={form.notes || ""}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
          />

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleDelete}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Delete
            </button>

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="text-gray-500">
                Cancel
              </button>

              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ApplicationDetailModal;
