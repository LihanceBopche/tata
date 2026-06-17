'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                router.push('/dashboard');
            } else {
                toast.error(data.error || 'Login failed');
            }
        } catch (err) {
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-xl border border-gray-100">
                <div className="flex flex-col items-center justify-center mb-6">
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/8/8e/Tata_logo.svg"
                        alt="TATA Logo"
                        className="h-16 mb-4 drop-shadow-md"
                    />
                </div>
                <h1 className="text-2xl font-bold text-center text-tata-dark tracking-tight">TATA Advanced Systems</h1>
                <p className="text-sm font-medium text-center text-gray-500 mb-6 tracking-wide">ENGINEERING PFM</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input
                            type="email"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tata-blue focus:border-tata-blue"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tata-blue focus:border-tata-blue"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-tata-blue text-white py-2 px-4 rounded-md hover:bg-tata-dark transition-colors font-bold tracking-wide mt-2"
                    >
                        {loading ? 'Logging in...' : 'LOGIN'}
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-600">
                    Employee Registration? <Link href="/register" className="text-tata-accent font-semibold hover:underline">Sign up</Link>
                </p>
            </div>
        </div>
    );
}
