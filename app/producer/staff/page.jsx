"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

export default function ProducerStaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [formData, setFormData] = useState({ email: "", phone: "", roleKey: "PRODUCER_VIEWER" });

  const roles = [
    { key: "PRODUCER_OWNER", label: "Owner", description: "Full access to everything" },
    { key: "PRODUCER_MANAGER", label: "Manager", description: "Manage products, batches, and codes" },
    { key: "PRODUCER_STAFF", label: "Staff", description: "Generate and export codes" },
    { key: "PRODUCER_AUDITOR", label: "Auditor", description: "View-only access with analytics" },
    { key: "PRODUCER_VIEWER", label: "Viewer", description: "Basic view access" },
  ];

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    try {
      setLoading(true);
      const res = await apiGet("/api/v1/producer/staff");
      setStaff(res.data || []);
    } catch (err) {
      console.error("Failed to load staff:", err);
      alert("Failed to load staff members");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    try {
      await apiPost("/api/v1/producer/staff", formData);
      alert("Staff member invited successfully!");
      setShowInviteModal(false);
      setFormData({ email: "", phone: "", roleKey: "PRODUCER_VIEWER" });
      loadStaff();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to invite staff");
    }
  }

  async function handleUpdateRole(staffId, newRoleKey) {
    try {
      await apiPatch(`/api/v1/producer/staff/${staffId}/role`, { roleKey: newRoleKey });
      alert("Role updated successfully!");
      loadStaff();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update role");
    }
  }

  async function handleRemove(staffId) {
    if (!confirm("Are you sure you want to remove this staff member?")) return;
    try {
      await apiDelete(`/api/v1/producer/staff/${staffId}`);
      alert("Staff member removed successfully!");
      loadStaff();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove staff");
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Invite Staff
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invited By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {staff.map((member) => (
              <tr key={member.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {member.user?.profile?.displayName || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.user?.auth?.email || member.user?.auth?.phone || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={member.role?.key}
                    onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                    className="border rounded px-2 py-1"
                  >
                    {roles.map((role) => (
                      <option key={role.key} value={role.key}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.inviter?.profile?.displayName || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Invite Staff Member</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="staff@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone (Optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="01XXXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={formData.roleKey}
                  onChange={(e) => setFormData({ ...formData, roleKey: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  {roles.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleInvite}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Send Invite
              </button>
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
