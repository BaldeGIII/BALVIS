import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiTrash2 } from "react-icons/fi";
import { apiUrl } from "../lib/api";
import { createSessionHeaders, type AuthUser } from "../lib/auth";

function AdminPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(apiUrl("/api/admin/users"), { credentials: "include" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load users.");
      setUsers(payload.users);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (user: AuthUser) => {
    if (!window.confirm(`Delete ${user.email} and all their saved conversations?`)) return;

    setError("");
    const response = await fetch(apiUrl(`/api/admin/users/${user.id}`), {
      method: "DELETE",
      credentials: "include",
      headers: await createSessionHeaders(),
    });

    if (response.ok) {
      load();
    } else {
      setError((await response.json().catch(() => ({}))).error || "Delete failed.");
    }
  };

  return (
    <div className="app-shell min-h-screen px-4 py-8 text-[color:var(--text)] sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="caption-label">Admin</p>
            <h1 className="headline-display mt-2 text-2xl font-semibold">Accounts</h1>
          </div>
          <Link to="/app" className="hud-button h-11">
            <FiArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
        </div>

        {error && <p role="alert" className="text-sm text-[color:var(--danger)]">{error}</p>}

        <section className="panel-surface overflow-x-auto rounded-[28px] p-2">
          <table className="w-full text-left text-sm">
            <thead className="caption-label">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Created</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t soft-divider">
                  <td className="p-3">
                    {user.name}
                    {user.isAdmin && (
                      <span className="ml-2 text-xs uppercase tracking-wider text-[color:var(--accent)]">
                        admin
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-[color:var(--muted)]">{user.email}</td>
                  <td className="p-3 text-[color:var(--muted)]">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ""}
                  </td>
                  <td className="p-3 text-right">
                    {!user.isAdmin && (
                      <button
                        type="button"
                        onClick={() => remove(user)}
                        className="hud-button h-8 !px-3 text-xs"
                        aria-label={`Delete ${user.email}`}
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

export default AdminPage;
