import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Feather } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup(form);
      navigate("/device");
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't create your account. Please try again.");
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
          <h1 className="font-display text-2xl text-ink">Create your account</h1>
          <p className="text-sm text-ink-soft mt-1 text-center">
            Set up NeoVitals, then pair your baby's shoe in a minute
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && <p className="text-sm text-brick bg-brick/10 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="text-sm font-medium text-ink-soft">Your name</label>
            <input required className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jamie Rivera" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-soft">Email</label>
            <input type="email" required className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-soft">Password</label>
            <input type="password" required minLength={6} className="input mt-1" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" />
          </div>
          <button disabled={loading} className="btn-primary w-full">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-ink-soft mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-sage-dark font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
