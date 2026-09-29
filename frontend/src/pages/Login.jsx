import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Feather } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't sign you in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cloud flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-sage flex items-center justify-center mb-3">
            <Feather size={22} className="text-white" />
          </div>
          <h1 className="font-display text-2xl text-ink">Welcome back</h1>
          <p className="text-sm text-ink-soft mt-1">Sign in to keep watch over your little one</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && <p className="text-sm text-brick bg-brick/10 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="text-sm font-medium text-ink-soft">Email</label>
            <input
              type="email"
              required
              className="input mt-1"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-soft">Password</label>
            <input
              type="password"
              required
              className="input mt-1"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <button disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-ink-soft mt-5">
          New to NeoVitals?{" "}
          <Link to="/signup" className="text-sage-dark font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
