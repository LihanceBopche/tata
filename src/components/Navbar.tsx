'use client';
import { useRouter } from 'next/navigation';
import { LogOut, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar({ user }: { user: any }) {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            toast.success('Logged out');
            router.push('/login');
        } catch (e) {
            toast.error('Logout failed');
        }
    };

    return (
        <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center gap-3">
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/8/8e/Tata_logo.svg"
                            alt="TATA Logo"
                            className="h-10 object-contain drop-shadow"
                        />
                        <div className="flex flex-col">
                            <span className="font-bold text-lg leading-tight text-tata-dark">TATA Advanced Systems</span>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Engineering PFM</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-gray-600">
                            <UserCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">{user?.name || 'User'}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-800 transition px-3 py-1.5 rounded-md hover:bg-red-50"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
