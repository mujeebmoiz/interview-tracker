import { useState } from "react";
import api from "../api/axios";

function AddApplicationModal({ onClose, refresh }) {
  const [form, setForm] = useState({
    company_name: "",
    job_title: "",
    status: "APPLIED",
    application_date: "",
    location: "",
    salary_range: "",
    notes: "",
    url: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post("applications/", form);
      refresh(); // reload dashboard
      onClose(); // close modal
    } catch (err) {
      console.log(err.response?.data);
      alert("Failed to create application");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-[420px]">
        <h2 className="text-xl font-bold mb-6">Add Application</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="company_name"
            placeholder="Company"
            className="w-full border p-3 rounded-lg"
            onChange={handleChange}
            required
          />

          <input
            name="job_title"
            placeholder="Job Title"
            className="w-full border p-3 rounded-lg"
            onChange={handleChange}
            required
          />

          <input
            type="date"
            name="application_date"
            className="w-full border p-3 rounded-lg"
            onChange={handleChange}
            required
          />

          <input
            name="location"
            placeholder="Location"
            className="w-full border p-3 rounded-lg"
            onChange={handleChange}
          />

          <input
            name="salary_range"
            placeholder="Salary"
            className="w-full border p-3 rounded-lg"
            onChange={handleChange}
          />

          <input
            name="url"
            placeholder="URL"
            className="w-full border p-3 rounded-lg"
            onChange={handleChange}
          />

          <select
            name="status"
            className="w-full border p-3 rounded-lg"
            onChange={handleChange}
          >
            <option value="APPLIED">Applied</option>
            <option value="OA">OA</option>
            <option value="INTERVIEW">Interview</option>
            <option value="OFFER">Offer</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <textarea
            name="notes"
            placeholder="Notes"
            className="w-full border p-3 rounded-lg"
            onChange={handleChange}
          />

          <div className="flex justify-between pt-4">
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
        </form>
      </div>
    </div>
  );
}

export default AddApplicationModal;
